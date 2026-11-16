import "server-only";
import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { getLatestTenantByEmail } from "@/lib/tenantStore";
import { slugify } from "@/lib/slug";
import { notify } from "@/lib/notify";
import { HOLD_DAYS, MIN_PAYOUT, PIX_TYPES, REF_CODE_RE, type PixKeyType } from "@/lib/affiliateRules";

export { DEFAULT_RATE, MIN_PAYOUT } from "@/lib/affiliateRules";

/**
 * Programa de indicação (afiliados).
 *  - todo dono de site tem um link ?ref=codigo e ganha comissão por quem assinar por ele;
 *  - padrão: 30% do PRIMEIRO pagamento de cada indicado. O admin muda a taxa e a
 *    quantidade de pagamentos de quem quiser (ex.: influenciador com 40%);
 *  - a comissão só nasce de pagamento confirmado (webhooks) e libera 30 dias depois (estornos);
 *  - saque por Pix: o dono pede, o admin paga por fora e marca como pago.
 * Tudo roda no servidor com service_role; as tabelas não têm policy.
 */
export const REF_COOKIE = "ps_ref";
export const REF_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export const affiliatesAvailable = () => isAdminConfigured();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => getAdminClient() as unknown as SupabaseClient<any, "public", any>;

export type AffiliateRow = {
  id: string;
  tenant_id: string;
  kind: "client" | "influencer";
  code: string;
  rate: number;
  max_payments: number | null;
  active: boolean;
  pix_key: string | null;
  pix_key_type: PixKeyType | null;
  created_at: string;
};

const num = (v: unknown) => Number(v) || 0;

function newCode(name: string): string {
  const base = slugify(name).slice(0, 20).replace(/-+$/g, "") || "autonomo";
  return `${base}-${randomBytes(2).toString("hex")}`;
}

export async function getAffiliateByCode(code: string): Promise<AffiliateRow | null> {
  const c = code.trim().toLowerCase();
  if (!affiliatesAvailable() || !REF_CODE_RE.test(c)) return null;
  const { data } = await db().from("affiliates").select("*").eq("code", c).maybeSingle();
  return (data as AffiliateRow) || null;
}

/** Cria o perfil de afiliado do site na primeira vez que ele abre o programa. */
export async function ensureAffiliate(tenant: {
  id: string;
  business_name: string;
}): Promise<AffiliateRow> {
  const find = async () => {
    const { data } = await db()
      .from("affiliates")
      .select("*")
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    return (data as AffiliateRow) || null;
  };
  const existing = await find();
  if (existing) return existing;

  for (let i = 0; i < 6; i++) {
    const { data, error } = await db()
      .from("affiliates")
      .insert({ tenant_id: tenant.id, code: newCode(tenant.business_name) })
      .select("*")
      .single();
    if (data) return data as AffiliateRow;
    if (error?.code !== "23505") throw new Error(`Supabase: ${error?.message}`);
    const raced = await find(); // outra requisição criou no meio
    if (raced) return raced;
  }
  throw new Error("Não foi possível gerar o código de indicação.");
}

/**
 * Liga o novo site a quem indicou (o cookie ps_ref vem do link). Vale uma vez,
 * só para site novo, e nunca para o próprio afiliado (mesmo site ou mesmo e-mail).
 */
export async function claimReferral(
  code: string,
  referredTenantId: string,
  referredEmail: string | null
): Promise<boolean> {
  try {
    const a = await getAffiliateByCode(code);
    if (!a || !a.active || a.tenant_id === referredTenantId) return false;
    const { data: owner } = await db()
      .from("tenants")
      .select("payer_email")
      .eq("id", a.tenant_id)
      .maybeSingle();
    const ownerMail = (owner?.payer_email as string | null)?.toLowerCase();
    if (ownerMail && referredEmail && ownerMail === referredEmail.toLowerCase()) return false;
    const { error } = await db()
      .from("affiliate_referrals")
      .insert({ affiliate_id: a.id, referred_tenant_id: referredTenantId });
    if (!error) {
      await notify(a.tenant_id, {
        kind: "referral",
        title: "Novo indicado pelo seu link!",
        body: "Alguém acabou de criar um site pelo seu link. Você ganha quando ele assinar.",
        url: "/dashboard/indicacoes",
      });
    }
    return !error;
  } catch (e) {
    console.error("claimReferral:", e);
    return false;
  }
}

/** Webhooks: comissão do pagamento confirmado (idempotente por referência). Nunca derruba o webhook. */
export async function recordCommission(tenantId: string, amount: number, ref: string) {
  if (!affiliatesAvailable()) return;
  const { data, error } = await db().rpc("record_affiliate_commission", {
    p_tenant: tenantId,
    p_amount: amount,
    p_ref: ref,
  });
  if (error) return console.error("recordCommission:", error.message);
  const earned = Number(data) || 0;
  if (earned > 0) {
    const { data: r } = await db()
      .from("affiliate_referrals")
      .select("affiliates(tenant_id)")
      .eq("referred_tenant_id", tenantId)
      .maybeSingle();
    const aff = (r as { affiliates?: { tenant_id: string } | { tenant_id: string }[] } | null)?.affiliates;
    const owner = Array.isArray(aff) ? aff[0]?.tenant_id : aff?.tenant_id;
    if (owner) {
      await notify(owner, {
        kind: "referral",
        title: `Você ganhou R$ ${earned.toFixed(2).replace(".", ",")} de comissão`,
        body: `Um indicado seu assinou. O valor libera para saque em ${HOLD_DAYS} dias.`,
        url: "/dashboard/indicacoes",
      });
    }
  }
}

export async function cancelCommission(ref: string) {
  if (!affiliatesAvailable()) return;
  const { error } = await db().rpc("cancel_affiliate_commission", { p_ref: ref });
  if (error) console.error("cancelCommission:", error.message);
}

// ---------------------------------------------------------------------------
// Painel do dono
// ---------------------------------------------------------------------------
export type MyAffiliate = {
  code: string;
  kind: "client" | "influencer";
  rate: number;
  max_payments: number | null;
  active: boolean;
  pix_key: string | null;
  pix_key_type: PixKeyType | null;
  available: number;
  pending: number;
  requested: number;
  paid: number;
  min_payout: number;
  referrals: { id: string; name: string; created_at: string; earned: number; paying: boolean }[];
  payouts: {
    id: string;
    amount: number;
    status: "solicitado" | "pago" | "recusado";
    requested_at: string;
    paid_at: string | null;
    note: string | null;
  }[];
};

export async function getMyAffiliate(tenant: {
  id: string;
  business_name: string;
}): Promise<MyAffiliate> {
  const a = await ensureAffiliate(tenant);
  const [com, pay, refs] = await Promise.all([
    db().from("affiliate_commissions").select("*").eq("affiliate_id", a.id),
    db()
      .from("affiliate_payouts")
      .select("*")
      .eq("affiliate_id", a.id)
      .order("requested_at", { ascending: false }),
    db()
      .from("affiliate_referrals")
      .select("id, referred_tenant_id, created_at")
      .eq("affiliate_id", a.id)
      .order("created_at", { ascending: false }),
  ]);

  const commissions = (com.data || []) as {
    referral_id: string;
    amount: number;
    cancelled: boolean;
    payout_id: string | null;
    available_at: string;
  }[];
  const payouts = (pay.data || []) as MyAffiliate["payouts"];
  const referrals = (refs.data || []) as { id: string; referred_tenant_id: string; created_at: string }[];

  const now = Date.now();
  const live = commissions.filter((c) => !c.cancelled);
  const open = live.filter((c) => !c.payout_id);
  const available = open
    .filter((c) => new Date(c.available_at).getTime() <= now)
    .reduce((s, c) => s + num(c.amount), 0);
  const pending = open
    .filter((c) => new Date(c.available_at).getTime() > now)
    .reduce((s, c) => s + num(c.amount), 0);
  const sum = (st: string) =>
    payouts.filter((p) => p.status === st).reduce((s, p) => s + num(p.amount), 0);

  const names = new Map<string, string>();
  if (referrals.length) {
    const { data } = await db()
      .from("tenants")
      .select("id, business_name")
      .in("id", referrals.map((r) => r.referred_tenant_id));
    for (const t of (data || []) as { id: string; business_name: string }[]) names.set(t.id, t.business_name);
  }

  return {
    code: a.code,
    kind: a.kind,
    rate: num(a.rate),
    max_payments: a.max_payments,
    active: a.active,
    pix_key: a.pix_key,
    pix_key_type: a.pix_key_type,
    available: round2(available),
    pending: round2(pending),
    requested: round2(sum("solicitado")),
    paid: round2(sum("pago")),
    min_payout: MIN_PAYOUT,
    referrals: referrals.map((r) => {
      const mine = live.filter((c) => c.referral_id === r.id);
      return {
        id: r.id,
        name: names.get(r.referred_tenant_id) || "Novo site",
        created_at: r.created_at,
        earned: round2(mine.reduce((s, c) => s + num(c.amount), 0)),
        paying: mine.length > 0,
      };
    }),
    payouts: payouts.map((p) => ({ ...p, amount: num(p.amount) })),
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function saveAffiliatePix(
  tenant: { id: string; business_name: string },
  key: string,
  type: string
): Promise<string | null> {
  const k = key.trim();
  if (!PIX_TYPES.includes(type as PixKeyType)) return "Tipo de chave inválido.";
  if (k.length < 5 || k.length > 120) return "Chave Pix inválida.";
  const a = await ensureAffiliate(tenant);
  const { error } = await db()
    .from("affiliates")
    .update({ pix_key: k, pix_key_type: type })
    .eq("id", a.id);
  return error ? "Não foi possível salvar a chave." : null;
}

export async function requestAffiliatePayout(tenant: {
  id: string;
  business_name: string;
}): Promise<string | null> {
  const a = await ensureAffiliate(tenant);
  const { error } = await db().rpc("request_affiliate_payout", {
    p_affiliate: a.id,
    p_min: MIN_PAYOUT,
  });
  if (!error) return null;
  if (error.message.includes("pix_required")) return "Salve sua chave Pix antes de sacar.";
  if (error.message.includes("below_minimum"))
    return `O saque libera quando o saldo disponível chegar a R$ ${MIN_PAYOUT}.`;
  console.error("requestAffiliatePayout:", error.message);
  return "Não foi possível pedir o saque agora.";
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
export type AdminAffiliate = AffiliateRow & {
  business_name: string;
  email: string | null;
  referrals: number;
  paying: number;
  earned: number;
};
export type AdminPayout = {
  id: string;
  business_name: string;
  amount: number;
  pix_key: string;
  pix_key_type: string | null;
  status: "solicitado" | "pago" | "recusado";
  requested_at: string;
  paid_at: string | null;
  note: string | null;
};

export async function listAffiliatesAdmin(): Promise<{
  affiliates: AdminAffiliate[];
  payouts: AdminPayout[];
}> {
  const [aff, ref, com, pay] = await Promise.all([
    db().from("affiliates").select("*").order("created_at", { ascending: true }),
    db().from("affiliate_referrals").select("id, affiliate_id"),
    db().from("affiliate_commissions").select("affiliate_id, referral_id, amount, cancelled"),
    db().from("affiliate_payouts").select("*").order("requested_at", { ascending: false }),
  ]);
  const affiliates = (aff.data || []) as AffiliateRow[];
  const payouts = (pay.data || []) as (Omit<AdminPayout, "business_name"> & { affiliate_id: string })[];

  const tenantIds = [...new Set(affiliates.map((a) => a.tenant_id))];
  const tmap = new Map<string, { business_name: string; payer_email: string | null }>();
  if (tenantIds.length) {
    const { data } = await db()
      .from("tenants")
      .select("id, business_name, payer_email")
      .in("id", tenantIds);
    for (const t of (data || []) as { id: string; business_name: string; payer_email: string | null }[])
      tmap.set(t.id, t);
  }
  const byAff = new Map(affiliates.map((a) => [a.id, a]));
  const refs = (ref.data || []) as { affiliate_id: string }[];
  const coms = (com.data || []) as {
    affiliate_id: string;
    referral_id: string;
    amount: number;
    cancelled: boolean;
  }[];

  return {
    affiliates: affiliates
      .map((a) => {
        const live = coms.filter((c) => c.affiliate_id === a.id && !c.cancelled);
        const t = tmap.get(a.tenant_id);
        return {
          ...a,
          rate: num(a.rate),
          business_name: t?.business_name || "—",
          email: t?.payer_email || null,
          referrals: refs.filter((r) => r.affiliate_id === a.id).length,
          paying: new Set(live.map((c) => c.referral_id)).size,
          earned: round2(live.reduce((s, c) => s + num(c.amount), 0)),
        };
      })
      // influenciadores primeiro, depois quem mais indicou
      .sort((x, y) => (x.kind === y.kind ? y.referrals - x.referrals : x.kind === "influencer" ? -1 : 1)),
    payouts: payouts
      .map((p) => ({
        id: p.id,
        business_name: tmap.get(byAff.get(p.affiliate_id)?.tenant_id || "")?.business_name || "—",
        amount: num(p.amount),
        pix_key: p.pix_key,
        pix_key_type: p.pix_key_type,
        status: p.status,
        requested_at: p.requested_at,
        paid_at: p.paid_at,
        note: p.note,
      }))
      .sort((x, y) => Number(y.status === "solicitado") - Number(x.status === "solicitado")),
  };
}

export type AffiliatePatch = {
  kind: "client" | "influencer";
  code: string;
  rate: number;
  max_payments: number | null;
  active: boolean;
};

/** Valida o que o admin digitou; devolve a mensagem de erro ou null. */
export function validateAffiliatePatch(p: Partial<AffiliatePatch>): string | null {
  if (p.kind !== "client" && p.kind !== "influencer") return "Tipo inválido.";
  if (typeof p.code !== "string" || !REF_CODE_RE.test(p.code.trim().toLowerCase()))
    return "Código: 3 a 30 letras minúsculas, números ou hífen.";
  if (typeof p.rate !== "number" || !(p.rate >= 0 && p.rate <= 100)) return "Comissão deve ficar entre 0 e 100%.";
  if (p.max_payments !== null && !(Number.isInteger(p.max_payments) && (p.max_payments as number) >= 1))
    return "Nº de pagamentos deve ser 1 ou mais (ou vazio para todos).";
  if (typeof p.active !== "boolean") return "Status inválido.";
  return null;
}

export async function updateAffiliate(id: string, p: AffiliatePatch): Promise<string | null> {
  const { error } = await db()
    .from("affiliates")
    .update({
      kind: p.kind,
      code: p.code.trim().toLowerCase(),
      rate: p.rate,
      max_payments: p.max_payments,
      active: p.active,
    })
    .eq("id", id);
  if (!error) return null;
  return error.code === "23505" ? "Esse código já está em uso." : "Não foi possível salvar.";
}

/** Marca como influenciador o site cujo e-mail de cadastro for este (cria o perfil se preciso). */
export async function createInfluencer(
  email: string,
  patch: Omit<AffiliatePatch, "kind" | "active">
): Promise<string | null> {
  const tenant = await getLatestTenantByEmail(email);
  if (!tenant) return "Nenhum site com esse e-mail.";
  const a = await ensureAffiliate(tenant);
  return updateAffiliate(a.id, { ...patch, kind: "influencer", active: true });
}

export async function markPayout(
  id: string,
  status: "pago" | "recusado",
  note: string | null
): Promise<string | null> {
  const { data: p } = await db()
    .from("affiliate_payouts")
    .select("amount, affiliates(tenant_id)")
    .eq("id", id)
    .maybeSingle();
  const { error } = await db().rpc("mark_affiliate_payout", { p_id: id, p_status: status, p_note: note });
  if (!error) {
    const aff = (p as { affiliates?: { tenant_id: string } | { tenant_id: string }[] } | null)?.affiliates;
    const owner = Array.isArray(aff) ? aff[0]?.tenant_id : aff?.tenant_id;
    if (owner && p) {
      await notify(owner, {
        kind: "referral",
        title: status === "pago" ? `Seu saque de R$ ${Number((p as { amount: number }).amount).toFixed(2).replace(".", ",")} foi pago` : "Seu saque foi recusado",
        body: status === "pago" ? "O Pix foi enviado para a chave que você cadastrou." : note || "O saldo voltou para a sua conta de indicações.",
        url: "/dashboard/indicacoes",
      });
    }
    return null;
  }
  return error.message.includes("payout_not_open") ? "Esse saque já foi resolvido." : "Não foi possível atualizar.";
}
