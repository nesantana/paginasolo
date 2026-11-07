import "server-only";
import { randomBytes } from "crypto";
import { getAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { sumItems, type QuoteInput } from "@/lib/validate";
import type { QuoteRow, QuoteStatus, TenantRow } from "@/types/database.types";

/** Orçamentos e follow-up são recurso do plano pago. */
export const hasPaidPlan = (t: TenantRow) =>
  t.is_active && t.subscription_status === "active";

export const quotesAvailable = () => isAdminConfigured();

const CODE_RE = /^[A-Za-z0-9_-]{10,24}$/;
export const isQuoteCode = (c: string) => CODE_RE.test(c);
const newCode = () => randomBytes(9).toString("base64url"); // 12 chars, 72 bits

const db = () => getAdminClient();

export async function listQuotes(tenantId: string): Promise<QuoteRow[]> {
  const { data, error } = await db()
    .from("quotes")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw new Error(`Supabase: ${error.message}`);
  return (data || []) as unknown as QuoteRow[];
}

export async function getQuoteForTenant(
  tenantId: string,
  id: string
): Promise<QuoteRow | null> {
  const { data, error } = await db()
    .from("quotes")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error) throw new Error(`Supabase: ${error.message}`);
  return (data as unknown as QuoteRow) || null;
}

export async function createQuote(
  tenantId: string,
  input: QuoteInput
): Promise<QuoteRow> {
  const { data, error } = await db()
    .from("quotes")
    .insert({
      tenant_id: tenantId,
      code: newCode(),
      customer_name: input.customer_name,
      customer_phone: input.customer_phone,
      items: input.items,
      notes: input.notes,
      valid_until: input.valid_until,
      followup_at: input.followup_at,
      total_cents: sumItems(input.items),
      status: "draft",
    })
    .select("*")
    .single();
  if (error) throw new Error(`Supabase: ${error.message}`);
  return data as unknown as QuoteRow;
}

export type QuotePatch = Partial<
  Pick<
    QuoteRow,
    "status" | "followup_at" | "followup_done_at" | "followup_note" | "sent_at"
  >
>;

/** Só altera orçamento do próprio tenant. */
export async function patchQuote(
  tenantId: string,
  id: string,
  patch: QuotePatch
): Promise<QuoteRow | null> {
  const next: QuotePatch & { decided_at?: string | null } = { ...patch };
  if (patch.status === "accepted" || patch.status === "declined") {
    next.decided_at = new Date().toISOString();
  }
  const { data, error } = await db()
    .from("quotes")
    .update(next)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(`Supabase: ${error.message}`);
  return (data as unknown as QuoteRow) || null;
}

export async function deleteQuote(tenantId: string, id: string): Promise<boolean> {
  const { error, count } = await db()
    .from("quotes")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("tenant_id", tenantId);
  if (error) throw new Error(`Supabase: ${error.message}`);
  return (count ?? 0) > 0;
}

// ---------- lado público (cliente final, só com o código) ----------

export async function getQuoteByCode(code: string): Promise<QuoteRow | null> {
  if (!isQuoteCode(code)) return null;
  const { data, error } = await db()
    .from("quotes")
    .select("*")
    .eq("code", code)
    .maybeSingle();
  if (error) throw new Error(`Supabase: ${error.message}`);
  return (data as unknown as QuoteRow) || null;
}

/** Primeira abertura: marca como visto e, se ainda não decidido, vira "viewed". */
export async function markQuoteViewed(q: QuoteRow): Promise<void> {
  if (q.viewed_at) return;
  const status: QuoteStatus =
    q.status === "draft" || q.status === "sent" ? "viewed" : q.status;
  await db()
    .from("quotes")
    .update({ viewed_at: new Date().toISOString(), status })
    .eq("id", q.id)
    .is("viewed_at", null);
}

/** O cliente aceitou: encerra o follow-up desse orçamento. */
export async function acceptQuote(q: QuoteRow): Promise<QuoteRow | null> {
  if (q.status === "accepted") return q;
  if (q.status === "declined") return null;
  const now = new Date().toISOString();
  const { data, error } = await db()
    .from("quotes")
    .update({
      status: "accepted",
      decided_at: now,
      viewed_at: q.viewed_at || now,
      followup_done_at: q.followup_done_at || now,
    })
    .eq("id", q.id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(`Supabase: ${error.message}`);
  return (data as unknown as QuoteRow) || null;
}
