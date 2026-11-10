import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "@/lib/supabase/admin";
import { normalizeCustomerPhone, parseIsoDate } from "@/lib/validate";
import type { AppointmentRow, AppointmentStatus } from "@/types/finance";

const db = () => getAdminClient() as unknown as SupabaseClient;
const fail = (e: { message: string }): never => {
  throw new Error(`Supabase: ${e.message}`);
};

const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/[ \t]+/g, " ").trim().slice(0, max) : "";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export type AppointmentInput = {
  contract_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  title: string;
  address: string | null;
  notes: string | null;
  starts_on: string;
  start_time: string | null;
  duration_min: number;
};

/** Duração em minutos (15 a 720); padrão 1 hora. */
export function parseDuration(v: unknown): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 15 && n <= 720 ? n : 60;
}

export function parseAppointment(raw: unknown): AppointmentInput | { error: string } {
  const b = (raw ?? {}) as Record<string, unknown>;
  const customer_name = str(b.customer_name, 80);
  if (!customer_name) return { error: "Informe o nome do cliente." };
  const starts_on = parseIsoDate(b.starts_on);
  if (!starts_on) return { error: "Escolha o dia do serviço." };

  const phoneRaw = str(b.customer_phone, 30);
  const phone = phoneRaw ? normalizeCustomerPhone(phoneRaw) : null;
  if (phoneRaw && !phone) return { error: "Telefone inválido. Use DDD + número." };

  const time = str(b.start_time, 5);
  if (time && !TIME_RE.test(time)) return { error: "Horário inválido." };

  return {
    contract_id: typeof b.contract_id === "string" && UUID_RE.test(b.contract_id) ? b.contract_id : null,
    customer_name,
    customer_phone: phone,
    title: str(b.title, 140) || "Serviço",
    address: str(b.address, 200) || null,
    notes: str(b.notes, 500) || null,
    starts_on,
    start_time: time || null,
    duration_min: parseDuration(b.duration_min),
  };
}

export async function listAppointments(tenantId: string, fromISO: string): Promise<AppointmentRow[]> {
  const { data, error } = await db()
    .from("appointments")
    .select("*")
    .eq("tenant_id", tenantId)
    .gte("starts_on", fromISO)
    .order("starts_on", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: false })
    .limit(500);
  if (error) fail(error);
  return (data || []) as AppointmentRow[];
}

export async function getAppointment(tenantId: string, id: string): Promise<AppointmentRow | null> {
  const { data, error } = await db().from("appointments").select("*").eq("id", id).eq("tenant_id", tenantId).maybeSingle();
  if (error) fail(error);
  return (data as AppointmentRow) || null;
}

export async function createAppointment(tenantId: string, input: AppointmentInput): Promise<AppointmentRow> {
  // Se vier de um contrato, ele precisa ser deste mesmo dono.
  let contractId = input.contract_id;
  if (contractId) {
    const { data } = await db().from("contracts").select("id").eq("id", contractId).eq("tenant_id", tenantId).maybeSingle();
    if (!data) contractId = null;
  }
  const { data, error } = await db()
    .from("appointments")
    .insert({ ...input, contract_id: contractId, tenant_id: tenantId })
    .select("*")
    .single();
  if (error) fail(error);
  return data as AppointmentRow;
}

export type AppointmentPatch =
  | { status: AppointmentStatus }
  | { reschedule: { starts_on: string; start_time: string | null } };

export async function patchAppointment(
  tenantId: string,
  id: string,
  patch: AppointmentPatch
): Promise<AppointmentRow | null> {
  const next: Record<string, unknown> =
    "status" in patch
      ? { status: patch.status, done_at: patch.status === "done" ? new Date().toISOString() : null }
      : { starts_on: patch.reschedule.starts_on, start_time: patch.reschedule.start_time, status: "scheduled", done_at: null };
  const { data, error } = await db()
    .from("appointments")
    .update(next)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select("*")
    .maybeSingle();
  if (error) fail(error);
  return (data as AppointmentRow) || null;
}

export async function deleteAppointment(tenantId: string, id: string): Promise<boolean> {
  const { error, count } = await db()
    .from("appointments")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("tenant_id", tenantId);
  if (error) fail(error);
  return (count ?? 0) > 0;
}

export const isAppointmentId = (v: string) => UUID_RE.test(v);
export const isTimeValue = (v: string) => TIME_RE.test(v);

// ---------- e-mail diário ----------

/** Serviços marcados (não cancelados/concluídos) em um intervalo de dias. */
export async function appointmentsBetween(
  tenantId: string,
  fromISO: string,
  toISO: string
): Promise<AppointmentRow[]> {
  const { data, error } = await db()
    .from("appointments")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("status", "scheduled")
    .gte("starts_on", fromISO)
    .lte("starts_on", toISO)
    .order("starts_on", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: false });
  if (error) fail(error);
  return (data || []) as AppointmentRow[];
}

/** Parcelas a receber até um dia (inclui atrasadas), de contratos não cancelados. */
export async function openPaymentsDueUntil(tenantId: string, untilISO: string) {
  const { data, error } = await db()
    .from("payments")
    .select("id, label, amount_cents, due_date, status, contracts!inner(customer_name, status)")
    .eq("tenant_id", tenantId)
    .in("status", ["pending", "informed"])
    .not("due_date", "is", null)
    .lte("due_date", untilISO)
    .neq("contracts.status", "cancelled")
    .order("due_date", { ascending: true });
  if (error) fail(error);
  type Row = {
    id: string; label: string; amount_cents: number; due_date: string; status: string;
    contracts: { customer_name: string } | { customer_name: string }[] | null;
  };
  return ((data || []) as unknown as Row[]).map((r) => {
    const c = Array.isArray(r.contracts) ? r.contracts[0] : r.contracts;
    return { id: r.id, label: r.label, amount_cents: r.amount_cents, due_date: r.due_date, status: r.status, customer_name: c?.customer_name || "" };
  });
}

/** Reserva o envio do dia. false = já foi enviado (ou está sendo) hoje. */
export async function claimDigest(tenantId: string, dayISO: string): Promise<boolean> {
  const { error } = await db().from("agenda_digests").insert({ tenant_id: tenantId, day: dayISO });
  if (!error) return true;
  if (error.code === "23505") return false;
  return fail(error);
}

export async function releaseDigest(tenantId: string, dayISO: string): Promise<void> {
  await db().from("agenda_digests").delete().eq("tenant_id", tenantId).eq("day", dayISO);
}

// ---------- integração com contratos ----------

export async function appointmentExistsForContract(tenantId: string, contractId: string): Promise<boolean> {
  const { data, error } = await db()
    .from("appointments")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("contract_id", contractId)
    .neq("status", "cancelled")
    .limit(1);
  if (error) fail(error);
  return (data || []).length > 0;
}

/** Quantos serviços ainda marcados (não concluídos) esse contrato tem. */
export async function openAppointmentsForContract(tenantId: string, contractId: string): Promise<number> {
  const { count, error } = await db()
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("contract_id", contractId)
    .eq("status", "scheduled");
  if (error) fail(error);
  return count ?? 0;
}
