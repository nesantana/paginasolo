/**
 * Planos e preços. Seguro para importar no navegador e no servidor.
 *  - Mensal: Pix recorrente pelo Asaas.
 *  - Anual: pagamento único no cartão, em até 12x, pelo Mercado Pago.
 * O valor cobrado de verdade sai daqui (lib/asaas.ts e lib/mercadopago.ts): mude só neste arquivo.
 */
export type PlanId = "monthly" | "annual";

export const PLAN_PRICES = { monthly: 37, annual: 197 } as const;
export const ANNUAL_MAX_INSTALLMENTS = 12;

export const isPlanId = (v: unknown): v is PlanId => v === "monthly" || v === "annual";

export const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Preço sem centavos quando redondo: "R$ 37". */
export const brlShort = (n: number) =>
  Number.isInteger(n) ? `R$ ${n}` : brl(n);

/** Economia do anual frente a 12 mensalidades, em %. */
export const ANNUAL_SAVINGS_PERCENT = Math.round(
  (1 - PLAN_PRICES.annual / (PLAN_PRICES.monthly * 12)) * 100
);

/** Custo mensal equivalente do anual. */
export const ANNUAL_PER_MONTH = PLAN_PRICES.annual / 12;

/** Quanto cada plano vale por mês (usado no faturamento mensal estimado do admin). */
export const monthlyValue = (plan: string | null | undefined) =>
  plan === "annual" ? ANNUAL_PER_MONTH : PLAN_PRICES.monthly;

/** Meses de acesso que cada pagamento libera. */
export const PLAN_MONTHS: Record<PlanId, number> = { monthly: 1, annual: 12 };

/** Dias de folga depois do vencimento do mensal antes de o acesso cair (Pix atrasa). */
export const MONTHLY_GRACE_DAYS = 5;

export function addMonths(from: Date, months: number): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** Clientes (pessoas diferentes) que quem não assina pode atender de graça. */
export const FREE_CLIENT_LIMIT = 10;
