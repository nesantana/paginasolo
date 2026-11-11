/**
 * Pix "copia e cola" (BR Code estático do Banco Central). Funções puras: servem no navegador e no servidor.
 * Nada aqui movimenta dinheiro: só monta o texto/QR que o cliente cola no app do banco.
 */
export type PixKeyType = "cpf" | "cnpj" | "email" | "phone" | "random";

export const PIX_TYPES: { id: PixKeyType; label: string; placeholder: string }[] = [
  { id: "cpf", label: "CPF", placeholder: "000.000.000-00" },
  { id: "cnpj", label: "CNPJ", placeholder: "00.000.000/0000-00" },
  { id: "phone", label: "Celular", placeholder: "(67) 99999-0000" },
  { id: "email", label: "E-mail", placeholder: "voce@email.com" },
  { id: "random", label: "Chave aleatória", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
];

const digits = (v: string) => v.replace(/\D/g, "");

export function isValidCpf(v: string): boolean {
  const d = digits(v);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  for (const len of [9, 10]) {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const check = ((sum * 10) % 11) % 10;
    if (check !== Number(d[len])) return false;
  }
  return true;
}

export function isValidCnpj(v: string): boolean {
  const d = digits(v);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  for (const len of [12, 13]) {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * weights[i];
    const mod = sum % 11;
    const check = mod < 2 ? 0 : 11 - mod;
    if (check !== Number(d[len])) return false;
  }
  return true;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Descobre o tipo pelo que foi digitado (CNPJ, CPF, e-mail, chave aleatória ou celular). null = não reconhecida. */
export function detectPixKeyType(raw: string): PixKeyType | null {
  const v = raw.trim();
  if (!v) return null;
  for (const t of ["cnpj", "cpf", "email", "random", "phone"] as PixKeyType[]) {
    if (normalizePixKey(t, v)) return t;
  }
  return null;
}

/** Chave no formato que vai no Pix (celular com +55, e-mail minúsculo...). null = inválida. */
export function normalizePixKey(type: PixKeyType, raw: string): string | null {
  const v = raw.trim();
  switch (type) {
    case "cpf":
      return isValidCpf(v) ? digits(v) : null;
    case "cnpj":
      return isValidCnpj(v) ? digits(v) : null;
    case "email":
      return v.length <= 77 && EMAIL_RE.test(v) ? v.toLowerCase() : null;
    case "phone": {
      let d = digits(v);
      if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
      return d.length === 10 || d.length === 11 ? `+55${d}` : null;
    }
    case "random":
      return UUID_RE.test(v) ? v.toLowerCase() : null;
  }
}

/** Mostra a chave de forma amigável no painel. */
export function prettyPixKey(type: PixKeyType | null, key: string | null): string {
  if (!key) return "";
  if (type === "cpf" && key.length === 11)
    return key.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (type === "cnpj" && key.length === 14)
    return key.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  if (type === "phone") {
    const d = key.replace("+55", "");
    return d.length === 11
      ? d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
      : d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return key;
}

/** O BR Code só aceita ASCII maiúsculo simples nos campos de nome e cidade. */
function ascii(v: string, max: number): string {
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    .slice(0, max);
}

const LEGAL_SUFFIX = new Set(["LTDA", "ME", "EPP", "EIRELI", "MEI", "SA", "S", "A"]);
const STOPWORDS = new Set(["DE", "DA", "DO", "DAS", "DOS", "E"]);

/**
 * O Pix aceita no máximo 25 letras no nome do recebedor (regra do Banco Central, não do app).
 * Nomes longos são encurtados sem cortar no meio: tira "Ltda" e "de/da/do" e abrevia as palavras,
 * sempre mantendo a última inteira. O banco do cliente mostra o nome real do dono da chave ao pagar.
 */
export function pixReceiverName(name: string, max = 25): string {
  let words = ascii(name, 200).split(" ").filter(Boolean);
  if (words.join(" ").length <= max) return words.join(" ");
  while (words.length > 1 && LEGAL_SUFFIX.has(words[words.length - 1])) words = words.slice(0, -1);
  words = words.filter((w, i) => i === 0 || !STOPWORDS.has(w));
  let guard = 0;
  while (words.join(" ").length > max && guard++ < 200) {
    // encurta a palavra mais longa (menos a última) em uma letra, até caber
    let idx = -1;
    for (let i = 0; i < words.length - 1; i++) if (words[i].length > 3 && (idx < 0 || words[i].length > words[idx].length)) idx = i;
    if (idx < 0) break;
    words[idx] = words[idx].slice(0, -1);
  }
  return words.join(" ").slice(0, max).trim();
}

const tlv = (id: string, value: string) => `${id}${String(value.length).padStart(2, "0")}${value}`;

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function buildPixPayload(opts: {
  key: string;
  name: string;
  city: string;
  amountCents?: number;
  message?: string;
}): string {
  const account =
    tlv("00", "br.gov.bcb.pix") +
    tlv("01", opts.key) +
    (opts.message ? tlv("02", ascii(opts.message, 40)) : "");
  const amount =
    opts.amountCents && opts.amountCents > 0 ? tlv("54", (opts.amountCents / 100).toFixed(2)) : "";
  // "Cidade - UF" → só a cidade (o campo aceita no máximo 15 caracteres).
  const city = ascii(opts.city.split(/[-,/]/)[0] || "BRASIL", 15) || "BRASIL";
  const body =
    tlv("00", "01") +
    tlv("01", "11") +
    tlv("26", account) +
    tlv("52", "0000") +
    tlv("53", "986") +
    amount +
    tlv("58", "BR") +
    tlv("59", pixReceiverName(opts.name) || "RECEBEDOR") +
    tlv("60", city) +
    tlv("62", tlv("05", "***")) +
    "6304";
  return body + crc16(body);
}
