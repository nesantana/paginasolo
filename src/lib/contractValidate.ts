import { normalizeCustomerPhone, parseIsoDate } from "@/lib/validate";
import { normalizePixKey, isValidCnpj, isValidCpf, type PixKeyType, PIX_TYPES } from "@/lib/pix";
import type { DueKind } from "@/types/finance";

const str = (v: unknown, max: number): string =>
  typeof v === "string" ? v.replace(/[ \t]+/g, " ").trim().slice(0, max) : "";
/** Texto com quebras de linha (escopo, condições). */
const multi = (v: unknown, max: number): string =>
  typeof v === "string"
    ? v.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, max)
    : "";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS: DueKind[] = ["upfront", "date", "on_completion"];
export const MAX_CENTS = 100_000_000;

export type ContractInput = {
  quote_id: string | null;
  title: string;
  scope: string;
  customer_name: string;
  customer_phone: string;
  customer_doc: string | null;
  customer_address: string | null;
  total_cents: number;
  delivery_date: string | null;
  extra_terms: string | null;
  payments: {
    label: string;
    amount_cents: number;
    due_kind: DueKind;
    due_date: string | null;
  }[];
};

/** Valida a lista de parcelas: valores, datas e soma igual ao total do contrato. */
export function parsePayments(
  raw: unknown,
  total: number,
  today: string
): ContractInput["payments"] | { error: string } {
  const rawPay = Array.isArray(raw) ? raw.slice(0, 24) : [];
  const payments: ContractInput["payments"] = [];
  for (const p of rawPay) {
    const o = (p ?? {}) as Record<string, unknown>;
    const amount = Math.round(Number(o.amount_cents) || 0);
    if (amount <= 0 || amount > MAX_CENTS) return { error: "Cada parcela precisa ter um valor maior que zero." };
    const kind = KINDS.includes(o.due_kind as DueKind) ? (o.due_kind as DueKind) : "date";
    let due = parseIsoDate(o.due_date);
    if (kind === "on_completion") due = null;
    else if (!due) due = kind === "upfront" ? today : null;
    if (kind === "date" && !due) return { error: "Informe a data de cada parcela." };
    payments.push({ label: str(o.label, 60) || "Parcela", amount_cents: amount, due_kind: kind, due_date: due });
  }
  if (payments.length === 0) return { error: "Defina como o cliente vai pagar." };
  const sum = payments.reduce((n, p) => n + p.amount_cents, 0);
  if (sum !== total) return { error: "A soma das parcelas precisa ser igual ao valor total do contrato." };
  return payments;
}

export function parseContractInput(raw: unknown, today: string): ContractInput | { error: string } {
  const b = (raw ?? {}) as Record<string, unknown>;

  const title = str(b.title, 140);
  if (!title) return { error: "Descreva o serviço do contrato." };
  const customer_name = str(b.customer_name, 80);
  if (!customer_name) return { error: "Informe o nome do cliente." };
  const customer_phone = normalizeCustomerPhone(b.customer_phone);
  if (!customer_phone) return { error: "Telefone do cliente inválido. Use DDD + número." };

  const total = Math.round(Number(b.total_cents) || 0);
  if (total <= 0 || total > MAX_CENTS) return { error: "Informe o valor total do contrato." };

  const payments = parsePayments(b.payments, total, today);
  if ("error" in payments) return payments;

  const quote = typeof b.quote_id === "string" && UUID_RE.test(b.quote_id) ? b.quote_id : null;

  return {
    quote_id: quote,
    title,
    scope: multi(b.scope, 1500),
    customer_name,
    customer_phone,
    customer_doc: str(b.customer_doc, 30) || null,
    customer_address: str(b.customer_address, 160) || null,
    total_cents: total,
    delivery_date: parseIsoDate(b.delivery_date),
    extra_terms: multi(b.extra_terms, 1000) || null,
    payments,
  };
}

export type PixSettings = {
  pix_key: string | null;
  pix_key_type: PixKeyType | null;
  owner_doc: string | null;
};

/** Chave vazia limpa o cadastro. Documento é opcional, mas se vier precisa ser CPF/CNPJ válido. */
export function parsePixSettings(raw: unknown): PixSettings | { error: string } {
  const b = (raw ?? {}) as Record<string, unknown>;
  const keyRaw = str(b.pix_key, 120);
  const type = PIX_TYPES.some((t) => t.id === b.pix_key_type) ? (b.pix_key_type as PixKeyType) : null;

  let key: string | null = null;
  if (keyRaw) {
    if (!type) return { error: "Escolha o tipo da chave Pix." };
    key = normalizePixKey(type, keyRaw);
    if (!key) return { error: "Chave Pix inválida para o tipo escolhido. Confira os números." };
  }

  const docRaw = str(b.owner_doc, 30);
  let doc: string | null = null;
  if (docRaw) {
    if (!isValidCpf(docRaw) && !isValidCnpj(docRaw)) return { error: "CPF ou CNPJ inválido." };
    doc = docRaw.replace(/\D/g, "");
    doc =
      doc.length === 11
        ? doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
        : doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return { pix_key: key, pix_key_type: key ? type : null, owner_doc: doc };
}
