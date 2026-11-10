import "server-only";
import { createHash, randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "@/lib/supabase/admin";
import type { ContractInput } from "@/lib/contractValidate";
import type {
  ContractRow,
  ContractStatus,
  ContractWithPayments,
  PaymentRow,
} from "@/types/finance";
import { todayISO } from "@/lib/quoteUi";

// Tabelas novas ainda não estão no tipo Database gerado: usamos o cliente sem esquema.
const db = () => getAdminClient() as unknown as SupabaseClient;

const CODE_RE = /^[A-Za-z0-9_-]{10,24}$/;
export const isContractCode = (c: string) => CODE_RE.test(c);
const newCode = () => randomBytes(9).toString("base64url");
const fail = (e: { message: string }): never => {
  throw new Error(`Supabase: ${e.message}`);
};

async function paymentsFor(contractIds: string[]): Promise<Map<string, PaymentRow[]>> {
  const map = new Map<string, PaymentRow[]>();
  if (contractIds.length === 0) return map;
  const { data, error } = await db()
    .from("payments")
    .select("*")
    .in("contract_id", contractIds)
    .order("position", { ascending: true });
  if (error) fail(error);
  for (const p of (data || []) as PaymentRow[]) {
    const list = map.get(p.contract_id) || [];
    list.push(p);
    map.set(p.contract_id, list);
  }
  return map;
}

export async function listContracts(tenantId: string): Promise<ContractWithPayments[]> {
  const { data, error } = await db()
    .from("contracts")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) fail(error);
  const rows = (data || []) as ContractRow[];
  const pays = await paymentsFor(rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, payments: pays.get(r.id) || [] }));
}

export async function getContractForTenant(
  tenantId: string,
  id: string
): Promise<ContractWithPayments | null> {
  const { data, error } = await db()
    .from("contracts")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error) fail(error);
  if (!data) return null;
  const pays = await paymentsFor([id]);
  return { ...(data as ContractRow), payments: pays.get(id) || [] };
}

export async function createContract(
  tenantId: string,
  input: ContractInput
): Promise<ContractWithPayments> {
  // Se vier de um orçamento, ele precisa ser deste mesmo dono.
  let quoteId = input.quote_id;
  if (quoteId) {
    const { data } = await db()
      .from("quotes")
      .select("id")
      .eq("id", quoteId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (!data) quoteId = null;
  }

  const { data, error } = await db()
    .from("contracts")
    .insert({
      tenant_id: tenantId,
      quote_id: quoteId,
      code: newCode(),
      title: input.title,
      scope: input.scope,
      customer_name: input.customer_name,
      customer_phone: input.customer_phone,
      customer_doc: input.customer_doc,
      customer_address: input.customer_address,
      total_cents: input.total_cents,
      delivery_date: input.delivery_date,
      extra_terms: input.extra_terms,
      status: "draft",
    })
    .select("*")
    .single();
  if (error) fail(error);
  const contract = data as ContractRow;

  const { data: pays, error: pErr } = await db()
    .from("payments")
    .insert(
      input.payments.map((p, i) => ({
        contract_id: contract.id,
        tenant_id: tenantId,
        position: i,
        label: p.label,
        amount_cents: p.amount_cents,
        due_kind: p.due_kind,
        due_date: p.due_date,
        status: "pending",
      }))
    )
    .select("*");
  if (pErr) {
    await db().from("contracts").delete().eq("id", contract.id);
    fail(pErr);
  }
  const payments = ((pays || []) as PaymentRow[]).sort((a, b) => a.position - b.position);
  return { ...contract, payments };
}

export async function setContractStatus(
  tenantId: string,
  id: string,
  status: ContractStatus
): Promise<ContractWithPayments | null> {
  const current = await getContractForTenant(tenantId, id);
  if (!current) return null;
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status };
  if (status === "sent") patch.sent_at = current.sent_at || now;
  if (status === "completed") patch.completed_at = now;

  const { error } = await db().from("contracts").update(patch).eq("id", id).eq("tenant_id", tenantId);
  if (error) fail(error);

  if (status === "completed") {
    // Serviço entregue: o "saldo na entrega" passa a vencer hoje.
    await db()
      .from("payments")
      .update({ due_date: todayISO() })
      .eq("contract_id", id)
      .eq("tenant_id", tenantId)
      .eq("due_kind", "on_completion")
      .in("status", ["pending", "informed"])
      .is("due_date", null);
  }
  if (status === "cancelled") {
    // Cancela o que ainda não foi pago; o que já entrou fica no histórico.
    await db()
      .from("payments")
      .update({ status: "cancelled" })
      .eq("contract_id", id)
      .eq("tenant_id", tenantId)
      .in("status", ["pending", "informed"]);
  }
  return getContractForTenant(tenantId, id);
}

export async function deleteContract(tenantId: string, id: string): Promise<boolean> {
  const { error, count } = await db()
    .from("contracts")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("tenant_id", tenantId);
  if (error) fail(error);
  return (count ?? 0) > 0;
}

export type PaymentAction =
  | { type: "paid"; method: string | null; paid_on: string | null }
  | { type: "undo" }
  | { type: "reschedule"; due_date: string }
  | { type: "reminded" }
  | { type: "note"; note: string | null };

/** Só mexe em parcela do próprio tenant e de um contrato que não foi cancelado. */
export async function applyPaymentAction(
  tenantId: string,
  paymentId: string,
  action: PaymentAction
): Promise<PaymentRow | null> {
  const { data: cur, error: gErr } = await db()
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (gErr) fail(gErr);
  if (!cur) return null;
  const pay = cur as PaymentRow;
  if (pay.status === "cancelled") return pay;

  let patch: Record<string, unknown> = {};
  switch (action.type) {
    case "paid":
      patch = {
        status: "paid",
        paid_at: action.paid_on ? `${action.paid_on}T12:00:00Z` : new Date().toISOString(),
        paid_method: action.method,
      };
      break;
    case "undo":
      patch = { status: "pending", paid_at: null, paid_method: null, informed_at: null };
      break;
    case "reschedule":
      patch = { due_date: action.due_date, status: pay.status === "paid" ? "paid" : "pending" };
      break;
    case "reminded":
      patch = { last_reminder_at: new Date().toISOString() };
      break;
    case "note":
      patch = { note: action.note };
      break;
  }
  const { data, error } = await db()
    .from("payments")
    .update(patch)
    .eq("id", paymentId)
    .eq("tenant_id", tenantId)
    .select("*")
    .maybeSingle();
  if (error) fail(error);
  return (data as PaymentRow) || null;
}

// ---------- lado público (cliente final, só com o código) ----------

export async function getContractByCode(code: string): Promise<ContractWithPayments | null> {
  if (!isContractCode(code)) return null;
  const { data, error } = await db().from("contracts").select("*").eq("code", code).maybeSingle();
  if (error) fail(error);
  if (!data) return null;
  const c = data as ContractRow;
  const pays = await paymentsFor([c.id]);
  return { ...c, payments: pays.get(c.id) || [] };
}

export async function markContractViewed(c: ContractRow): Promise<void> {
  if (c.viewed_at) return;
  await db()
    .from("contracts")
    .update({ viewed_at: new Date().toISOString() })
    .eq("id", c.id)
    .is("viewed_at", null);
}

const ipHash = (ip: string) => createHash("sha256").update(`ps-sign:${ip}`).digest("hex").slice(0, 24);

/** Aceite eletrônico simples: nome digitado + data/hora + impressão do IP (hash). */
export async function signContract(
  c: ContractRow,
  name: string,
  ip: string
): Promise<ContractRow | null> {
  if (c.status === "cancelled" || c.status === "completed") return null;
  if (c.signed_at) return c;
  const now = new Date().toISOString();
  const { data, error } = await db()
    .from("contracts")
    .update({
      status: "signed",
      signed_at: now,
      signed_name: name,
      signed_ip_hash: ipHash(ip),
      viewed_at: c.viewed_at || now,
    })
    .eq("id", c.id)
    .is("signed_at", null)
    .select("*")
    .maybeSingle();
  if (error) fail(error);
  return (data as ContractRow) || c;
}

/** O cliente avisa que pagou. Só o dono confirma (vira "paid"). */
export async function informPayment(
  contractId: string,
  paymentId: string
): Promise<PaymentRow | null> {
  const { data, error } = await db()
    .from("payments")
    .update({ status: "informed", informed_at: new Date().toISOString() })
    .eq("id", paymentId)
    .eq("contract_id", contractId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();
  if (error) fail(error);
  return (data as PaymentRow) || null;
}
