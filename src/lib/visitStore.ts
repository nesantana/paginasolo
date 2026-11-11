import "server-only";
import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "@/lib/supabase/admin";
import { createQuote, listQuotes } from "@/lib/quoteStore";
import { formatBRL } from "@/lib/quoteUi";
import { parseQuoteInput, normalizeCustomerPhone, parseIsoDate } from "@/lib/validate";
import { parseDuration } from "@/lib/agendaStore";
import type { AppointmentStatus, Followup, VisitItem, VisitNote, VisitRow } from "@/types/finance";
import type { QuoteRow } from "@/types/database.types";

const db = () => getAdminClient() as unknown as SupabaseClient;
const fail = (e: { message: string }): never => {
  throw new Error(`Supabase: ${e.message}`);
};

const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/[ \t]+/g, " ").trim().slice(0, max) : "";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const isVisitId = (v: string) => UUID_RE.test(v);
export const isTimeOk = (v: string) => TIME_RE.test(v);

const MAX_NOTES = 60;
const noteId = () => randomBytes(5).toString("hex");

export type VisitInput = {
  customer_name: string;
  customer_phone: string | null;
  title: string;
  address: string | null;
  starts_on: string;
  start_time: string | null;
  duration_min: number;
  followup_at: string | null;
};

export function parseVisit(raw: unknown): VisitInput | { error: string } {
  const b = (raw ?? {}) as Record<string, unknown>;
  const customer_name = str(b.customer_name, 80);
  if (!customer_name) return { error: "Informe o nome do cliente." };
  const starts_on = parseIsoDate(b.starts_on);
  if (!starts_on) return { error: "Escolha o dia da visita." };
  const phoneRaw = str(b.customer_phone, 30);
  const phone = phoneRaw ? normalizeCustomerPhone(phoneRaw) : null;
  if (phoneRaw && !phone) return { error: "Telefone inválido. Use DDD + número." };
  const time = str(b.start_time, 5);
  if (time && !TIME_RE.test(time)) return { error: "Horário inválido." };
  return {
    customer_name,
    customer_phone: phone,
    title: str(b.title, 140) || "Visita técnica",
    address: str(b.address, 200) || null,
    starts_on,
    start_time: time || null,
    duration_min: parseDuration(b.duration_min),
    followup_at: parseIsoDate(b.followup_at) || null,
  };
}

export function parseItems(raw: unknown): VisitItem[] {
  return (Array.isArray(raw) ? raw : [])
    .slice(0, 30)
    .map((i) => {
      const o = (i ?? {}) as Record<string, unknown>;
      return {
        title: str(o.title, 140),
        qty: Math.min(999, Math.max(1, Math.round(Number(o.qty) || 1))),
        price_cents: Math.min(100_000_000, Math.max(0, Math.round(Number(o.price_cents) || 0))),
      };
    })
    .filter((i) => i.title);
}

const asRow = (d: unknown) => {
  const r = d as VisitRow;
  return { ...r, notes: Array.isArray(r.notes) ? r.notes : [], items: Array.isArray(r.items) ? r.items : [] } as VisitRow;
};

export async function listVisits(tenantId: string, fromISO?: string): Promise<VisitRow[]> {
  let q = db().from("visits").select("*").eq("tenant_id", tenantId);
  if (fromISO) q = q.gte("starts_on", fromISO);
  const { data, error } = await q
    .order("starts_on", { ascending: false })
    .order("start_time", { ascending: true, nullsFirst: false })
    .limit(300);
  if (error) fail(error);
  return (data || []).map(asRow);
}

export async function getVisit(tenantId: string, id: string): Promise<VisitRow | null> {
  const { data, error } = await db().from("visits").select("*").eq("id", id).eq("tenant_id", tenantId).maybeSingle();
  if (error) fail(error);
  return data ? asRow(data) : null;
}

export async function createVisit(tenantId: string, input: VisitInput, notes: string[] = []): Promise<VisitRow> {
  const at = new Date().toISOString();
  const first: VisitNote[] = notes
    .map((t) => str(t, 600))
    .filter(Boolean)
    .map((text) => ({ id: noteId(), text, at }));
  const { data, error } = await db()
    .from("visits")
    .insert({ ...input, tenant_id: tenantId, notes: first })
    .select("*")
    .single();
  if (error) fail(error);
  return asRow(data);
}

export type VisitPatch = {
  status?: AppointmentStatus;
  reschedule?: { starts_on: string; start_time: string | null };
  add_note?: string;
  remove_note?: string;
  items?: VisitItem[];
  followup_at?: string | null;
  followup_done?: boolean;
  followup_note?: string | null;
  address?: string | null;
  customer_phone?: string | null;
};

export async function patchVisit(tenantId: string, id: string, p: VisitPatch): Promise<VisitRow | null> {
  const cur = await getVisit(tenantId, id);
  if (!cur) return null;
  const next: Record<string, unknown> = {};
  if (p.status) {
    next.status = p.status;
    next.done_at = p.status === "done" ? new Date().toISOString() : null;
  }
  if (p.reschedule) {
    next.starts_on = p.reschedule.starts_on;
    next.start_time = p.reschedule.start_time;
    next.status = "scheduled";
    next.done_at = null;
  }
  if (p.add_note) {
    const text = str(p.add_note, 600);
    if (text) next.notes = [...cur.notes, { id: noteId(), text, at: new Date().toISOString() }].slice(-MAX_NOTES);
  }
  if (p.remove_note) next.notes = cur.notes.filter((n) => n.id !== p.remove_note);
  if (p.items) next.items = parseItems(p.items);
  if ("followup_at" in p) {
    next.followup_at = p.followup_at;
    next.followup_done_at = null;
  }
  if (p.followup_done) next.followup_done_at = new Date().toISOString();
  if ("followup_note" in p) next.followup_note = p.followup_note ? str(p.followup_note, 300) || null : null;
  if ("address" in p) next.address = p.address ? str(p.address, 200) || null : null;
  if ("customer_phone" in p) next.customer_phone = p.customer_phone ? normalizeCustomerPhone(p.customer_phone) : null;
  if (Object.keys(next).length === 0) return cur;
  const { data, error } = await db().from("visits").update(next).eq("id", id).eq("tenant_id", tenantId).select("*").maybeSingle();
  if (error) fail(error);
  return data ? asRow(data) : null;
}

export async function deleteVisit(tenantId: string, id: string): Promise<boolean> {
  const { error, count } = await db().from("visits").delete({ count: "exact" }).eq("id", id).eq("tenant_id", tenantId);
  if (error) fail(error);
  return (count ?? 0) > 0;
}

const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Visitas do cliente, pelo nome (parte do nome, sem acento), mais recentes primeiro. */
export async function visitsForCustomer(tenantId: string, name: string): Promise<VisitRow[]> {
  const want = plain(name).trim();
  if (!want) return [];
  return (await listVisits(tenantId)).filter((v) => v.status !== "cancelled" && plain(v.customer_name).includes(want));
}

export const visitTotal = (items: VisitItem[]) => items.reduce((s, i) => s + i.qty * i.price_cents, 0);

/**
 * Transforma os itens da visita em orçamento (e liga os dois). O telefone vem da visita
 * ou do que o dono informar; o orçamento exige telefone.
 */
export async function visitToQuote(
  tenantId: string,
  visit: VisitRow,
  over: { items?: VisitItem[]; phone?: string | null; notes?: string | null } = {}
): Promise<{ quote: QuoteRow } | { error: string }> {
  const items = over.items ? parseItems(over.items) : visit.items;
  if (items.length === 0) return { error: "Adicione ao menos um item antes de gerar o orçamento." };
  const input = parseQuoteInput({
    customer_name: visit.customer_name,
    customer_phone: over.phone || visit.customer_phone,
    items,
    notes: over.notes ?? (visit.address ? `Visita técnica em ${visit.address}.` : null),
    // o retorno combinado na visita passa para o orçamento (continua no calendário)
    followup_at: visit.followup_at && !visit.followup_done_at ? visit.followup_at : null,
  });
  if ("error" in input) {
    return { error: input.error.startsWith("Telefone") ? "Falta o telefone do cliente para gerar o orçamento." : input.error };
  }
  const quote = await createQuote(tenantId, input);
  const { error } = await db()
    .from("visits")
    .update({ quote_id: quote.id, items, status: "done", done_at: visit.done_at || new Date().toISOString() })
    .eq("id", visit.id)
    .eq("tenant_id", tenantId);
  if (error) fail(error);
  return { quote };
}

const OPEN_QUOTE = new Set(["draft", "sent", "viewed"]);

/** Todos os retornos pendentes (orçamentos parados + visitas), do mais antigo ao mais novo. */
export async function listFollowups(tenantId: string): Promise<Followup[]> {
  const [quotes, visits] = await Promise.all([listQuotes(tenantId), listVisits(tenantId)]);
  const out: Followup[] = [];
  for (const q of quotes) {
    if (!q.followup_at || q.followup_done_at || !OPEN_QUOTE.has(q.status)) continue;
    out.push({
      key: `q${q.id}`, kind: "quote", id: q.id, customer_name: q.customer_name, customer_phone: q.customer_phone,
      date: q.followup_at.slice(0, 10), note: q.followup_note, about: `Orçamento de ${formatBRL(q.total_cents)}`, code: q.code,
    });
  }
  for (const v of visits) {
    if (!v.followup_at || v.followup_done_at || v.status === "cancelled" || v.quote_id) continue;
    out.push({
      key: `v${v.id}`, kind: "visit", id: v.id, customer_name: v.customer_name, customer_phone: v.customer_phone,
      date: v.followup_at.slice(0, 10), note: v.followup_note, about: "Visita técnica, ainda sem orçamento",
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
