import type { ContractRow, DueKind, PaymentRow } from "@/types/finance";
import { addDaysISO, diffDays, formatBRL, formatDateBR, todayISO } from "@/lib/quoteUi";

/** Funções puras de contrato e cobrança: navegador e servidor usam as mesmas regras. */

export type InstallmentDraft = {
  label: string;
  amount_cents: number;
  due_kind: DueKind;
  due_date: string | null;
};

export type PlanOptions = {
  /** Parte paga no início (0 a 100). */
  upfrontPct: number;
  /** O restante: tudo na entrega do serviço ou em parcelas mensais. */
  balance: "completion" | "installments";
  installments: number;
  /** Vencimento da primeira parcela mensal (padrão: 30 dias). */
  firstDue?: string;
  today?: string;
};

/** Divide em partes iguais em centavos; o resto vai para as primeiras parcelas. */
export function splitCents(total: number, parts: number): number[] {
  const base = Math.floor(total / parts);
  let rest = total - base * parts;
  return Array.from({ length: parts }, () => base + (rest-- > 0 ? 1 : 0));
}

function addMonthsISO(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(y, m - 1 + months, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d, last));
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`;
}

/** Gera as parcelas a partir do valor total e da forma de pagamento escolhida. */
export function buildPlan(totalCents: number, opts: PlanOptions): InstallmentDraft[] {
  if (totalCents <= 0) return [];
  const today = opts.today || todayISO();
  const pct = Math.min(100, Math.max(0, Math.round(opts.upfrontPct)));
  const upfront = Math.round((totalCents * pct) / 100);
  const rest = totalCents - upfront;
  const out: InstallmentDraft[] = [];

  if (upfront > 0) {
    out.push({
      label: pct === 100 ? "Pagamento integral" : "Entrada",
      amount_cents: upfront,
      due_kind: "upfront",
      due_date: today,
    });
  }
  if (rest > 0) {
    if (opts.balance === "installments" && opts.installments > 1) {
      const n = Math.min(24, Math.round(opts.installments));
      const first = opts.firstDue || addDaysISO(30);
      splitCents(rest, n).forEach((amount, i) =>
        out.push({
          label: `Parcela ${i + 1}/${n}`,
          amount_cents: amount,
          due_kind: "date",
          due_date: addMonthsISO(first, i),
        })
      );
    } else {
      out.push({
        label: upfront > 0 ? "Saldo na entrega" : "Pagamento na entrega",
        amount_cents: rest,
        due_kind: "on_completion",
        due_date: null,
      });
    }
  }
  return out;
}

export type PaymentView =
  | "paid"
  | "informed"
  | "overdue"
  | "today"
  | "upcoming"
  | "on_completion"
  | "cancelled";

export function paymentView(p: Pick<PaymentRow, "status" | "due_date" | "due_kind">, today = todayISO()): PaymentView {
  if (p.status === "paid") return "paid";
  if (p.status === "cancelled") return "cancelled";
  if (p.status === "informed") return "informed";
  if (!p.due_date) return p.due_kind === "on_completion" ? "on_completion" : "upcoming";
  if (p.due_date < today) return "overdue";
  if (p.due_date === today) return "today";
  return "upcoming";
}

export const VIEW_LABEL: Record<PaymentView, string> = {
  paid: "Pago",
  informed: "Cliente avisou que pagou",
  overdue: "Atrasado",
  today: "Vence hoje",
  upcoming: "A vencer",
  on_completion: "Na entrega",
  cancelled: "Cancelado",
};

export const VIEW_CLASS: Record<PaymentView, string> = {
  paid: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  informed: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  overdue: "bg-red-500/15 text-red-300 border-red-500/30",
  today: "bg-amber-400/15 text-amber-300 border-amber-400/30",
  upcoming: "bg-white/10 text-slate-300 border-white/10",
  on_completion: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  cancelled: "bg-[#0a0e17] text-slate-400 border-white/10",
};

export const METHODS = ["Pix", "Dinheiro", "Cartão", "Transferência", "Boleto", "Outro"];

export type FinanceSummary = {
  received: number;
  overdue: number;
  overdueCount: number;
  dueSoon: number; // vence hoje ou nos próximos 7 dias
  onCompletion: number;
  informed: number;
  open: number; // tudo que ainda falta receber
  total: number;
};

/** Considera só contratos não cancelados. Parcela cancelada não conta. */
export function summarize(
  contracts: { status: ContractRow["status"]; payments: PaymentRow[] }[],
  today = todayISO()
): FinanceSummary {
  const s: FinanceSummary = {
    received: 0, overdue: 0, overdueCount: 0, dueSoon: 0, onCompletion: 0, informed: 0, open: 0, total: 0,
  };
  for (const c of contracts) {
    if (c.status === "cancelled") continue;
    for (const p of c.payments) {
      if (p.status === "cancelled") continue;
      s.total += p.amount_cents;
      const v = paymentView(p, today);
      if (v === "paid") {
        s.received += p.amount_cents;
        continue;
      }
      s.open += p.amount_cents;
      if (v === "informed") s.informed += p.amount_cents;
      else if (v === "overdue") {
        s.overdue += p.amount_cents;
        s.overdueCount++;
      } else if (v === "today" || (v === "upcoming" && p.due_date && diffDays(today, p.due_date) <= 7)) {
        s.dueSoon += p.amount_cents;
      } else if (v === "on_completion") s.onCompletion += p.amount_cents;
    }
  }
  return s;
}

export function contractProgress(payments: PaymentRow[]) {
  const live = payments.filter((p) => p.status !== "cancelled");
  const total = live.reduce((n, p) => n + p.amount_cents, 0);
  const paid = live.filter((p) => p.status === "paid").reduce((n, p) => n + p.amount_cents, 0);
  return { total, paid, pct: total ? Math.round((paid / total) * 100) : 0, settled: total > 0 && paid >= total };
}

export const contractUrl = (origin: string, code: string) => `${origin}/c/${code}`;

const firstName = (n: string) => n.trim().split(/\s+/)[0] || n;

export function dueText(p: Pick<PaymentRow, "due_kind" | "due_date">): string {
  if (p.due_kind === "on_completion" && !p.due_date) return "na entrega do serviço";
  return p.due_date ? `vencimento em ${formatDateBR(p.due_date)}` : "";
}

export function contractMessage(o: { customer: string; business: string; url: string; total_cents: number }) {
  return (
    `Olá, ${firstName(o.customer)}! Aqui é da ${o.business}. ` +
    `Segue o contrato do nosso serviço (${formatBRL(o.total_cents)}). ` +
    `Dá uma lida e, se estiver de acordo, é só aceitar pelo link:\n${o.url}`
  );
}

/** Cobrança de uma parcela: leva o link com QR/Pix e, se houver, o copia e cola. */
export function chargeMessage(o: {
  customer: string;
  business: string;
  payment: Pick<PaymentRow, "label" | "amount_cents" | "due_kind" | "due_date">;
  url: string;
  pixCode?: string;
  overdue?: boolean;
}) {
  const head = o.overdue
    ? `Olá, ${firstName(o.customer)}, tudo bem? Aqui é da ${o.business}. Passando para lembrar do pagamento em aberto:`
    : `Olá, ${firstName(o.customer)}! Aqui é da ${o.business}. Segue o pagamento combinado:`;
  const due = dueText(o.payment);
  return (
    `${head}\n\n*${o.payment.label}*: ${formatBRL(o.payment.amount_cents)}${due ? ` (${due})` : ""}\n` +
    (o.pixCode ? `\nPix copia e cola:\n${o.pixCode}\n` : "") +
    `\nContrato e QR Code do Pix:\n${o.url}\n\nQuando pagar, é só me avisar por aqui. Obrigado!`
  );
}

export type Clause = { title: string; text: string };

/** Cláusulas do contrato, montadas dos dados (assim qualquer ajuste reflete no texto). */
export function contractClauses(o: {
  contract: Pick<
    ContractRow,
    "title" | "scope" | "customer_name" | "customer_doc" | "customer_address" | "total_cents" | "delivery_date" | "extra_terms"
  >;
  business: string;
  ownerDoc: string | null;
  city: string;
  payments: Pick<PaymentRow, "label" | "amount_cents" | "due_kind" | "due_date" | "status">[];
}): Clause[] {
  const c = o.contract;
  const plan = o.payments.filter((p) => p.status !== "cancelled");
  const planText = plan.length
    ? plan.map((p) => `• ${p.label}: ${formatBRL(p.amount_cents)} (${dueText(p) || "a combinar"})`).join("\n")
    : "Forma de pagamento a combinar entre as partes.";
  const parties =
    `CONTRATADA: ${o.business}${o.ownerDoc ? `, inscrita sob o documento ${o.ownerDoc}` : ""}, com sede em ${o.city}.\n` +
    `CONTRATANTE: ${c.customer_name}${c.customer_doc ? `, documento ${c.customer_doc}` : ""}${c.customer_address ? `, residente/sediado em ${c.customer_address}` : ""}.`;

  const clauses: Clause[] = [
    { title: "Partes", text: parties },
    {
      title: "1. Objeto",
      text: `${c.title}.${c.scope ? `\n${c.scope}` : ""}`,
    },
    {
      title: "2. Valor e forma de pagamento",
      text: `O valor total é de ${formatBRL(c.total_cents)}, a ser pago da seguinte forma:\n${planText}\nO pagamento pode ser feito por Pix ou outra forma combinada entre as partes.`,
    },
    {
      title: "3. Prazo",
      text: c.delivery_date
        ? `O serviço será entregue até ${formatDateBR(c.delivery_date)}, salvo atraso causado por falta de informações ou acesso por parte do CONTRATANTE.`
        : "O prazo de execução será combinado entre as partes e informado pela CONTRATADA.",
    },
    {
      title: "4. Obrigações",
      text: "A CONTRATADA se compromete a executar o serviço descrito com qualidade e dentro do combinado. O CONTRATANTE se compromete a fornecer as informações necessárias e a efetuar os pagamentos nas datas acordadas.",
    },
    {
      title: "5. Atraso e cancelamento",
      text: "O atraso no pagamento pode suspender a execução do serviço até a regularização. Em caso de cancelamento, valores referentes ao que já foi executado ou ao que já foi adquirido para o serviço não são reembolsáveis.",
    },
  ];
  if (c.extra_terms) clauses.push({ title: "6. Condições adicionais", text: c.extra_terms });
  clauses.push({
    title: `${clauses.length}. Foro`,
    text: `As partes elegem o foro da comarca de ${o.city} para resolver eventuais divergências.`,
  });
  return clauses;
}
