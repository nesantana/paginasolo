import "server-only";
import { normalizeBaseUrl } from "@/lib/siteUrl";

const MP_API = "https://api.mercadopago.com";

export const PLAN_PRICE_BRL = Number(process.env.PLAN_PRICE_BRL || 37);

export const appUrl = () =>
  normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL, "http://localhost:3004");

/**
 * O Mercado Pago só aceita back_url/notification_url públicas e https.
 * Em desenvolvimento (localhost) usamos o endereço do deploy; configure
 * MP_PUBLIC_URL para trocar (ex.: um túnel).
 */
const publicUrl = () => {
  const url = appUrl();
  if (url.startsWith("https://")) return url;
  return (process.env.MP_PUBLIC_URL || "https://appautonomia.ia.br").replace(/\/$/, "");
};

export const isMercadoPagoConfigured = () =>
  Boolean(process.env.MP_ACCESS_TOKEN);

async function mp<T>(pathname: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${MP_API}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Mercado Pago ${res.status}: ${JSON.stringify(json).slice(0, 300)}`
    );
  }
  return json as T;
}

export type Preapproval = {
  id: string;
  status: "pending" | "authorized" | "paused" | "cancelled";
  external_reference?: string;
  payer_email?: string;
  init_point?: string;
};

/** Cria a assinatura mensal e devolve o link de checkout (init_point). */
export async function createSubscription(input: {
  tenantId: string;
  slug: string;
  businessName: string;
  payerEmail: string;
}): Promise<Preapproval> {
  return mp<Preapproval>("/preapproval", {
    method: "POST",
    body: JSON.stringify({
      reason: `autonomIA — assinatura de ${input.businessName}`.slice(0, 120),
      external_reference: input.tenantId,
      payer_email: input.payerEmail,
      back_url: `${publicUrl()}/pagamento/retorno?s=${encodeURIComponent(input.slug)}`,
      notification_url: `${publicUrl()}/api/webhooks/mercadopago`,
      status: "pending",
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: PLAN_PRICE_BRL,
        currency_id: "BRL",
      },
    }),
  });
}

/** Fonte da verdade: nunca confiamos no corpo do webhook, só no id. */
export const getSubscription = (id: string) =>
  mp<Preapproval>(`/preapproval/${encodeURIComponent(id)}`);
