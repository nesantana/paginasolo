import "server-only";
import { PLAN_PRICES } from "@/lib/plans";

/**
 * Asaas: plano mensal por Pix recorrente.
 * Env: ASAAS_API_KEY (chave do ambiente escolhido), ASAAS_ENV ("production" | "sandbox"),
 * ASAAS_WEBHOOK_TOKEN (mesmo valor cadastrado em Asaas > Integrações > Webhooks).
 */
const isProd = () => (process.env.ASAAS_ENV || "sandbox") === "production";
const API = () => (isProd() ? "https://api.asaas.com/v3" : "https://sandbox.asaas.com/api/v3");

export const isAsaasConfigured = () => Boolean(process.env.ASAAS_API_KEY);

async function asaas<T>(pathname: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API()}${pathname}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "autonomIA",
      access_token: process.env.ASAAS_API_KEY || "",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Asaas ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  }
  return json as T;
}

type Customer = { id: string };
export type AsaasSubscription = {
  id: string;
  status?: string;
  externalReference?: string | null;
  value?: number;
};
export type AsaasPayment = {
  id: string;
  status: string;
  value: number;
  invoiceUrl?: string;
  subscription?: string | null;
};

/** Cliente do Asaas: reaproveita pelo e-mail para não duplicar em novas tentativas. */
async function ensureCustomer(name: string, email: string, existingId: string | null): Promise<string> {
  if (existingId) return existingId;
  const found = await asaas<{ data?: Customer[] }>(`/customers?email=${encodeURIComponent(email)}&limit=1`);
  if (found.data?.[0]?.id) return found.data[0].id;
  const created = await asaas<Customer>("/customers", {
    method: "POST",
    body: JSON.stringify({ name: name.slice(0, 100) || email, email, notificationDisabled: false }),
  });
  return created.id;
}

/**
 * Cria a assinatura mensal por Pix e devolve o link da cobrança (QR Code + copia e cola).
 * externalReference = id do tenant: é como o webhook sabe de quem é o pagamento.
 */
export async function createMonthlyPixSubscription(input: {
  tenantId: string;
  businessName: string;
  email: string;
  customerId: string | null;
  /** Assinatura de uma tentativa anterior: se ainda tem cobrança aberta, reaproveita (evita cobrar duas vezes). */
  subscriptionId: string | null;
}): Promise<{ customerId: string; subscriptionId: string; checkoutUrl: string }> {
  if (input.subscriptionId && input.customerId) {
    try {
      const old = await getAsaasSubscription(input.subscriptionId);
      if (old.status === "ACTIVE") {
        const pays = await asaas<{ data?: AsaasPayment[] }>(
          `/subscriptions/${encodeURIComponent(old.id)}/payments?limit=10`
        );
        const open = pays.data?.find((p) => (p.status === "PENDING" || p.status === "OVERDUE") && p.invoiceUrl);
        if (open?.invoiceUrl) {
          return { customerId: input.customerId, subscriptionId: old.id, checkoutUrl: open.invoiceUrl };
        }
      }
    } catch {
      // assinatura antiga indisponível: cria uma nova abaixo
    }
  }
  const customerId = await ensureCustomer(input.businessName, input.email, input.customerId);
  const today = new Date().toISOString().slice(0, 10);
  const sub = await asaas<AsaasSubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      customer: customerId,
      billingType: "PIX",
      value: PLAN_PRICES.monthly,
      nextDueDate: today,
      cycle: "MONTHLY",
      description: "autonomIA — plano mensal",
      externalReference: input.tenantId,
    }),
  });

  // A primeira cobrança nasce junto com a assinatura; pegamos o link dela.
  let checkoutUrl = "";
  for (let i = 0; i < 3 && !checkoutUrl; i++) {
    const pays = await asaas<{ data?: AsaasPayment[] }>(
      `/subscriptions/${encodeURIComponent(sub.id)}/payments?limit=1`
    );
    checkoutUrl = pays.data?.[0]?.invoiceUrl || "";
    if (!checkoutUrl) await new Promise((r) => setTimeout(r, 700));
  }
  if (!checkoutUrl) throw new Error("Asaas não retornou o link da cobrança");
  return { customerId, subscriptionId: sub.id, checkoutUrl };
}

/** Fonte da verdade: o webhook só usa o id e consulta o Asaas com a nossa chave. */
export const getAsaasSubscription = (id: string) =>
  asaas<AsaasSubscription>(`/subscriptions/${encodeURIComponent(id)}`);
