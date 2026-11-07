import type { QuoteRow, QuoteStatus } from "@/types/database.types";

/** Funções puras, usadas no navegador e no servidor. Datas "YYYY-MM-DD" no fuso do aparelho. */

export const formatBRL = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** "A partir de R$ 1.420,50" → 142050. Texto sem valor ("Sob consulta") → 0. */
export function priceTextToCents(text?: string | null): number {
  const m = (text || "").match(/R\$\s*([\d.]+(?:,\d{1,2})?)/i);
  if (!m) return 0;
  const n = Number(m[1].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/** Campo digitado ("1.250,00", "160") → centavos. */
export function inputToCents(v: string): number {
  const clean = v.replace(/[^\d,.]/g, "");
  if (!clean) return 0;
  const normalized = clean.includes(",")
    ? clean.replace(/\./g, "").replace(",", ".")
    : clean;
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export const centsToInput = (cents: number) =>
  cents ? (cents / 100).toFixed(2).replace(".", ",") : "";

const pad = (n: number) => String(n).padStart(2, "0");
export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => toISODate(new Date());
export function addDaysISO(days: number, from: Date = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days);
  return toISODate(d);
}
export const formatDateBR = (iso: string | null) =>
  iso ? iso.split("-").reverse().join("/") : "";

/** Diferença em dias entre duas datas ISO (b - a). */
export function diffDays(aISO: string, bISO: string): number {
  const a = new Date(`${aISO}T12:00:00`);
  const b = new Date(`${bISO}T12:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export const STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: "Rascunho",
  sent: "Enviado",
  viewed: "Visto",
  accepted: "Aceito",
  declined: "Perdido",
};

export const isOpen = (q: Pick<QuoteRow, "status">) =>
  q.status !== "accepted" && q.status !== "declined";

/** Precisa de contato: tem data, não foi feito e o orçamento segue em aberto. */
export function followupState(
  q: Pick<QuoteRow, "status" | "followup_at" | "followup_done_at">,
  today: string
): "late" | "today" | "upcoming" | "none" {
  if (!q.followup_at || q.followup_done_at || !isOpen(q)) return "none";
  if (q.followup_at < today) return "late";
  if (q.followup_at === today) return "today";
  return "upcoming";
}

export const quoteUrl = (origin: string, code: string) => `${origin}/o/${code}`;

const firstName = (n: string) => n.trim().split(/\s+/)[0] || n;

export const whatsappLink = (phone: string, text: string) =>
  `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

export function quoteMessage(opts: {
  customer: string;
  business: string;
  total_cents: number;
  url: string;
}) {
  const valor = opts.total_cents > 0 ? `\nValor: ${formatBRL(opts.total_cents)}` : "";
  return (
    `Olá, ${firstName(opts.customer)}! Aqui é da ${opts.business}. ` +
    `Preparei o seu orçamento:\n${opts.url}${valor}\n\n` +
    `Qualquer dúvida é só me chamar por aqui.`
  );
}

export function followupMessage(opts: {
  customer: string;
  business: string;
  url: string;
}) {
  return (
    `Olá, ${firstName(opts.customer)}, tudo bem? Aqui é da ${opts.business}. ` +
    `Passando para saber se ficou alguma dúvida sobre o orçamento que enviei:\n${opts.url}\n\n` +
    `Posso te ajudar a fechar?`
  );
}

/** Texto que o cliente manda ao aceitar pela página do orçamento. */
export function acceptMessage(opts: { customer: string; business: string; total_cents: number }) {
  const valor = opts.total_cents > 0 ? ` (${formatBRL(opts.total_cents)})` : "";
  return `Olá! Sou ${opts.customer} e aceito o orçamento${valor}. Podemos combinar os próximos passos?`;
}
