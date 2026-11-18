import type { QuoteRow } from "@/types/database.types";
import type { ContractWithPayments } from "@/types/finance";
import { diffDays, formatBRL, whatsappLink } from "@/lib/quoteUi";

export type Insight = {
  key: string;
  tone: "good" | "warn" | "tip";
  title: string;
  text: string;
  href?: string;
  cta?: string;
  wa?: { url: string; label: string }[];
};

export type Stats = {
  receivedMonth: number;
  receivedPrev: number;
  open: number;
  overdue: number;
  overdueCount: number;
  sent90: number;
  won90: number;
  closeRate: number | null;
  avgTicket: number;
  months: { label: string; cents: number }[];
  topServices: { name: string; cents: number }[];
};

const first = (n: string) => n.trim().split(/\s+/)[0] || n;
const monthKey = (iso: string) => iso.slice(0, 7);
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function buildInsights(o: {
  quotes: QuoteRow[];
  contracts: ContractWithPayments[];
  business: string;
  hasPix: boolean;
  catalogCount: number;
  today: string;
}): { stats: Stats; insights: Insight[] } {
  const { quotes, contracts, today } = o;
  const live = contracts.filter((c) => c.status !== "cancelled");
  const [ty, tm] = today.split("-").map(Number);

  // dinheiro recebido por mês (últimos 6)
  const months: Stats["months"] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(ty, tm - 1 - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    let cents = 0;
    for (const c of live) for (const p of c.payments) if (p.status === "paid" && p.paid_at && monthKey(p.paid_at) === key) cents += p.amount_cents;
    months.push({ label: MONTHS[d.getMonth()], cents });
  }
  const receivedMonth = months[5].cents;
  const receivedPrev = months[4].cents;

  let open = 0;
  let overdue = 0;
  let overdueCount = 0;
  const overdueNames = new Set<string>();
  for (const c of live)
    for (const p of c.payments) {
      if (p.status !== "pending" && p.status !== "informed") continue;
      open += p.amount_cents;
      if (p.status === "pending" && p.due_date && p.due_date < today) {
        overdue += p.amount_cents;
        overdueCount++;
        overdueNames.add(c.customer_name);
      }
    }

  const since = (iso: string | null) => (iso ? diffDays(iso.slice(0, 10), today) <= 90 : false);
  const sentQ = quotes.filter((q) => q.sent_at && since(q.sent_at));
  const wonQ = sentQ.filter((q) => q.status === "accepted");
  const closeRate = sentQ.length >= 3 ? Math.round((wonQ.length / sentQ.length) * 100) : null;
  const won = quotes.filter((q) => q.status === "accepted" && q.total_cents > 0);
  const avgTicket = won.length ? Math.round(won.reduce((n, q) => n + q.total_cents, 0) / won.length) : 0;

  // serviços que mais rendem (orçamentos aprovados)
  const bySvc = new Map<string, number>();
  for (const q of won)
    for (const it of q.items) {
      if (!it.title || it.price_cents <= 0) continue;
      bySvc.set(it.title, (bySvc.get(it.title) || 0) + it.price_cents * it.qty);
    }
  const topServices = [...bySvc.entries()].map(([name, cents]) => ({ name, cents })).sort((a, b) => b.cents - a.cents).slice(0, 3);

  const stats: Stats = { receivedMonth, receivedPrev, open, overdue, overdueCount, sent90: sentQ.length, won90: wonQ.length, closeRate, avgTicket, months, topServices };

  const ins: Insight[] = [];

  if (overdue > 0)
    ins.push({ key: "overdue", tone: "warn", title: `${formatBRL(overdue)} atrasado`, text: `${overdueNames.size} cliente${overdueNames.size > 1 ? "s" : ""} com pagamento vencido: ${[...overdueNames].slice(0, 3).join(", ")}. Quanto antes você cobrar, maior a chance de receber.`, href: "/dashboard/clientes", cta: "Cobrar agora" });

  // orçamentos enviados e sem resposta
  const stalled = quotes.filter((q) => q.status !== "accepted" && q.status !== "declined" && q.sent_at && diffDays(q.sent_at.slice(0, 10), today) >= 3 && q.total_cents > 0);
  if (stalled.length) {
    const total = stalled.reduce((n, q) => n + q.total_cents, 0);
    ins.push({
      key: "stalled",
      tone: "warn",
      title: `${formatBRL(total)} esperando resposta`,
      text: `${stalled.length} orçamento${stalled.length > 1 ? "s" : ""} enviado${stalled.length > 1 ? "s" : ""} há 3 dias ou mais. Uma mensagem curta costuma destravar.`,
      wa: stalled.slice(0, 3).map((q) => ({
        label: `Chamar ${first(q.customer_name)}`,
        url: whatsappLink(q.customer_phone, `Olá, ${first(q.customer_name)}! Aqui é da ${o.business}. Conseguiu ver o orçamento que te enviei? Posso ajustar algo para fechar com você?`),
      })),
    });
  }

  // clientes antigos para reativar (último serviço há 60+ dias, sem nada em aberto)
  const lastBy = new Map<string, { name: string; phone: string; at: string }>();
  for (const c of live) {
    if (c.status === "draft" || c.status === "sent") continue;
    const at = (c.completed_at || c.signed_at || c.created_at).slice(0, 10);
    const prev = lastBy.get(c.customer_phone);
    if (!prev || prev.at < at) lastBy.set(c.customer_phone, { name: c.customer_name, phone: c.customer_phone, at });
  }
  const openPhones = new Set(live.filter((c) => c.payments.some((p) => p.status === "pending" || p.status === "informed")).map((c) => c.customer_phone));
  const old = [...lastBy.values()].filter((x) => diffDays(x.at, today) >= 60 && !openPhones.has(x.phone)).sort((a, b) => a.at.localeCompare(b.at));
  if (old.length)
    ins.push({
      key: "reactivate",
      tone: "tip",
      title: `${old.length} cliente${old.length > 1 ? "s" : ""} para chamar de novo`,
      text: "Quem já contratou volta com mais facilidade que um cliente novo. Pergunte se está tudo certo e se precisa de algo.",
      wa: old.slice(0, 3).map((x) => ({
        label: `Chamar ${first(x.name)}`,
        url: whatsappLink(x.phone, `Olá, ${first(x.name)}! Tudo bem? Aqui é da ${o.business}. Passando para saber se está tudo certo com o serviço que fiz e se precisa de algo mais. Estou à disposição!`),
      })),
    });

  // clientes que já voltaram -> pedir indicação
  const counts = new Map<string, number>();
  for (const c of live) counts.set(c.customer_phone, (counts.get(c.customer_phone) || 0) + 1);
  const repeat = [...counts.values()].filter((n) => n >= 2).length;
  if (repeat > 0)
    ins.push({ key: "repeat", tone: "good", title: `${repeat} cliente${repeat > 1 ? "s" : ""} já contrataram mais de uma vez`, text: "Eles confiam em você. É o melhor momento para pedir uma indicação: \"Conhece alguém que precisa do meu serviço?\"." });

  if (closeRate !== null && closeRate < 30)
    ins.push({ key: "rate", tone: "tip", title: `Você fecha ${closeRate}% dos orçamentos`, text: "Responder o cliente no mesmo dia e mandar o orçamento logo após a visita costuma aumentar esse número. Use o lembrete de retorno ao enviar." });
  else if (closeRate !== null && closeRate >= 50)
    ins.push({ key: "rate", tone: "good", title: `Você fecha ${closeRate}% dos orçamentos`, text: "Está acima do comum. Se está fechando muito, talvez dê para cobrar um pouco mais." });

  if (topServices.length)
    ins.push({ key: "top", tone: "good", title: `O que mais rende: ${topServices[0].name}`, text: `${formatBRL(topServices[0].cents)} em orçamentos aprovados. Ofereça esse serviço primeiro e destaque-o no seu site.` });

  if (receivedPrev > 0 && receivedMonth > receivedPrev)
    ins.push({ key: "up", tone: "good", title: "Você já recebeu mais que no mês passado", text: `${formatBRL(receivedMonth)} contra ${formatBRL(receivedPrev)}. Continue assim!` });

  if (!o.hasPix) ins.push({ key: "pix", tone: "tip", title: "Cadastre sua chave Pix", text: "Sem ela, o cliente não tem para onde pagar e a cobrança sai sem o Pix pronto.", href: "/dashboard/clientes", cta: "Cadastrar" });
  if (o.catalogCount === 0) ins.push({ key: "catalog", tone: "tip", title: "Cadastre seus preços", text: "Com seus serviços e preços salvos, o orçamento sai em segundos e o assistente já sabe quanto cobrar.", href: "/dashboard/catalogo", cta: "Cadastrar produtos e serviços" });

  const order = { warn: 0, tip: 1, good: 2 } as const;
  ins.sort((a, b) => order[a.tone] - order[b.tone]);
  return { stats, insights: ins };
}
