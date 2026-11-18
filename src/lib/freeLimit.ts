import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "@/lib/supabase/admin";
import { getTenantById } from "@/lib/tenantStore";
import { FREE_CLIENT_LIMIT } from "@/lib/plans";

const db = () => getAdminClient() as unknown as SupabaseClient;

export class FreeLimitError extends Error {
  constructor() {
    super(`Você chegou a ${FREE_CLIENT_LIMIT} clientes no plano grátis. Assine para continuar atendendo sem limite.`);
    this.name = "FreeLimitError";
  }
}

/** Quem não assina atende até FREE_CLIENT_LIMIT clientes diferentes (pelo WhatsApp). Cliente que já existe não conta de novo. */
export async function assertCanAddClient(tenantId: string, phone: string): Promise<void> {
  const t = await getTenantById(tenantId);
  if (!t) return;
  if (t.complimentary || (t.is_active && t.subscription_status === "active")) return;
  const [q, c] = await Promise.all([
    db().from("quotes").select("customer_phone").eq("tenant_id", tenantId),
    db().from("contracts").select("customer_phone").eq("tenant_id", tenantId),
  ]);
  const phones = new Set<string>();
  for (const r of [...(q.data || []), ...(c.data || [])]) {
    const p = (r as { customer_phone?: string }).customer_phone;
    if (p) phones.add(p);
  }
  if (phones.has(phone)) return;
  if (phones.size >= FREE_CLIENT_LIMIT) throw new FreeLimitError();
}
