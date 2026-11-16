import "server-only";
import { normalizeBaseUrl } from "@/lib/siteUrl";
import { ANNUAL_MAX_INSTALLMENTS, PLAN_PRICES } from "@/lib/plans";

const MP_API = "https://api.mercadopago.com";


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

/**
 * Plano anual: pagamento único no cartão, em até 12x (Checkout Pro).
 * Pix/boleto ficam de fora: o Pix é do plano mensal (Asaas).
 * external_reference = "<tenantId>|annual": o webhook usa para achar o dono.
 */
export async function createAnnualCheckout(input: {
  tenantId: string;
  slug: string;
  businessName: string;
  payerEmail: string;
}): Promise<{ id: string; init_point: string }> {
  return mp<{ id: string; init_point: string }>("/checkout/preferences", {
    method: "POST",
    body: JSON.stringify({
      items: [
        {
          id: "autonomia-anual",
          title: "autonomIA — plano anual",
          description: `Plano anual de ${input.businessName}`.slice(0, 200),
          quantity: 1,
          currency_id: "BRL",
          unit_price: PLAN_PRICES.annual,
        },
      ],
      payer: { email: input.payerEmail },
      external_reference: `${input.tenantId}|annual`,
      back_urls: {
        success: `${publicUrl()}/pagamento/retorno?s=${encodeURIComponent(input.slug)}`,
        pending: `${publicUrl()}/pagamento/retorno?s=${encodeURIComponent(input.slug)}`,
        failure: `${publicUrl()}/dashboard`,
      },
      auto_return: "approved",
      notification_url: `${publicUrl()}/api/webhooks/mercadopago`,
      payment_methods: {
        excluded_payment_types: [{ id: "ticket" }, { id: "atm" }, { id: "bank_transfer" }],
        installments: ANNUAL_MAX_INSTALLMENTS,
      },
    }),
  });
}

export type MpPayment = {
  id: number;
  status: string;
  currency_id?: string;
  transaction_amount: number;
  external_reference?: string;
};

/** Fonte da verdade do pagamento: nunca confiamos no corpo do webhook, só no id. */
export const getPayment = (id: string) =>
  mp<MpPayment>(`/v1/payments/${encodeURIComponent(id)}`);

/** Assinaturas antigas (preapproval, plano mensal anterior ao Asaas) continuam sendo honradas. */
export const getSubscription = (id: string) =>
  mp<Preapproval>(`/preapproval/${encodeURIComponent(id)}`);
