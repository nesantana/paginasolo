import type { TenantServiceItem } from "@/types/database.types";

/** Dados editáveis de um site, já saneados. Tudo que vem do navegador passa por aqui. */
export type TenantInput = {
  business_name: string;
  category: string;
  city: string;
  whatsapp_number: string;
  address: string | null;
  opening_hours: string | null;
  headline: string | null;
  description: string | null;
  primary_color: string;
  services: TenantServiceItem[];
  logo_url: string | null;
  payer_email: string | null;
  meta_pixel_id: string | null;
  google_tag_id: string | null;
};

const str = (v: unknown, max: number): string =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";

const optStr = (v: unknown, max: number): string | null => str(v, max) || null;

export function normalizeWhatsapp(v: unknown): string {
  const digits = String(v ?? "").replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13) return "";
  return digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
}

const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const META_PIXEL_RE = /^\d{8,20}$/;
const GOOGLE_TAG_RE = /^(G|AW|GT)-[A-Za-z0-9]{4,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Logo é reduzida no navegador (~256px); aqui só impedimos lixo/SVG com script.
const LOGO_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

function cleanServices(v: unknown): TenantServiceItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .slice(0, 8)
    .map((s) => {
      const o = (s ?? {}) as Record<string, unknown>;
      const price = str(o.price_optional, 60);
      return {
        title: str(o.title, 90),
        description: str(o.description, 280),
        ...(price ? { price_optional: price } : {}),
      };
    })
    .filter((s) => s.title);
}

/** Retorna os dados saneados ou uma mensagem de erro em português. */
export function parseTenantInput(
  raw: unknown
): { ok: true; data: TenantInput } | { ok: false; error: string } {
  const b = (raw ?? {}) as Record<string, unknown>;

  const business_name = str(b.business_name, 80);
  if (!business_name) return { ok: false, error: "Informe o nome da empresa." };

  const whatsapp_number = normalizeWhatsapp(b.whatsapp_number);
  if (!whatsapp_number)
    return { ok: false, error: "Informe um WhatsApp válido com DDD." };

  const payerRaw = str(b.payer_email, 120).toLowerCase();
  if (payerRaw && !EMAIL_RE.test(payerRaw))
    return { ok: false, error: "E-mail inválido." };

  const color = str(b.primary_color, 7);
  const logo = typeof b.logo_url === "string" ? b.logo_url : "";

  return {
    ok: true,
    data: {
      business_name,
      category: str(b.category, 80) || "Serviços",
      city: str(b.city, 80) || "Brasil",
      whatsapp_number,
      address: optStr(b.address, 160),
      opening_hours: optStr(b.opening_hours, 120),
      headline: optStr(b.headline, 160),
      description: optStr(b.description, 400),
      primary_color: COLOR_RE.test(color) ? color : "#3b82f6",
      services: cleanServices(b.services),
      logo_url: logo && logo.length < 200_000 && LOGO_RE.test(logo) ? logo : null,
      payer_email: payerRaw || null,
      meta_pixel_id: META_PIXEL_RE.test(str(b.meta_pixel_id, 20))
        ? str(b.meta_pixel_id, 20)
        : null,
      google_tag_id: GOOGLE_TAG_RE.test(str(b.google_tag_id, 24))
        ? str(b.google_tag_id, 24)
        : null,
    },
  };
}

export const isValidMetaPixel = (v: string) => META_PIXEL_RE.test(v);
export const isValidGoogleTag = (v: string) => GOOGLE_TAG_RE.test(v);

// ---------------------------------------------------------------------------
// Recursos extras (galeria, depoimentos, FAQ, oferta)
// ---------------------------------------------------------------------------
import type { TenantFaqItem, TenantTestimonial } from "@/types/database.types";

export type TenantExtras = {
  images: string[];
  testimonials: TenantTestimonial[];
  faq: TenantFaqItem[];
  offer_text: string | null;
  google_reviews_url: string | null;
};

// Fotos são reduzidas no navegador (~900px). Aqui só aceitamos imagem raster pequena.
const PHOTO_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_PHOTOS = 6;
const MAX_PHOTO_CHARS = 220_000;

function cleanHttpsUrl(v: unknown): string | null {
  const raw = typeof v === "string" ? v.trim().slice(0, 300) : "";
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export function parseExtras(raw: unknown): TenantExtras {
  const b = (raw ?? {}) as Record<string, unknown>;

  const images = (Array.isArray(b.images) ? b.images : [])
    .filter(
      (i): i is string =>
        typeof i === "string" && i.length < MAX_PHOTO_CHARS && PHOTO_RE.test(i)
    )
    .slice(0, MAX_PHOTOS);

  const testimonials = (Array.isArray(b.testimonials) ? b.testimonials : [])
    .slice(0, 5)
    .map((t) => {
      const o = (t ?? {}) as Record<string, unknown>;
      return { name: str(o.name, 60), text: str(o.text, 280) };
    })
    .filter((t) => t.text);

  const faq = (Array.isArray(b.faq) ? b.faq : [])
    .slice(0, 8)
    .map((f) => {
      const o = (f ?? {}) as Record<string, unknown>;
      return { q: str(o.q, 120), a: str(o.a, 400) };
    })
    .filter((f) => f.q && f.a);

  return {
    images,
    testimonials,
    faq,
    offer_text: optStr(b.offer_text, 100),
    google_reviews_url: cleanHttpsUrl(b.google_reviews_url),
  };
}

// ---------------------------------------------------------------------------
// Ferramentas do empreendedor: página de links e orçamentos
// ---------------------------------------------------------------------------
import type { QuoteItem, TenantLink } from "@/types/database.types";

/** Aceita só https; adiciona https:// se a pessoa digitou "instagram.com/fulano". */
export function cleanLinkUrl(v: unknown): string | null {
  let raw = typeof v === "string" ? v.trim().slice(0, 300) : "";
  if (!raw) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) raw = `https://${raw}`;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && u.hostname.includes(".") ? u.toString() : null;
  } catch {
    return null;
  }
}

export function parseLinks(raw: unknown): TenantLink[] {
  const arr = Array.isArray((raw as { links?: unknown })?.links)
    ? ((raw as { links: unknown[] }).links)
    : [];
  const out: TenantLink[] = [];
  for (const l of arr.slice(0, 12)) {
    const o = (l ?? {}) as Record<string, unknown>;
    const label = str(o.label, 50);
    const url = cleanLinkUrl(o.url);
    if (label && url) out.push({ label, url });
  }
  return out;
}

export type QuoteInput = {
  customer_name: string;
  customer_phone: string;
  items: QuoteItem[];
  notes: string | null;
  valid_until: string | null;
  followup_at: string | null;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (v: unknown): string | null => {
  if (typeof v !== "string" || !ISO_DATE.test(v)) return null;
  const d = new Date(`${v}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : v;
};
export const parseIsoDate = validDate;

/** Telefone BR com DDD → só dígitos com 55 na frente; null se não parecer válido. */
export function normalizeCustomerPhone(v: unknown): string | null {
  let d = typeof v === "string" ? v.replace(/\D/g, "") : "";
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  if (d.length < 10 || d.length > 11) return null;
  return `55${d}`;
}

export const sumItems = (items: QuoteItem[]) =>
  items.reduce((n, i) => n + i.price_cents * i.qty, 0);

export function parseQuoteInput(raw: unknown): QuoteInput | { error: string } {
  const b = (raw ?? {}) as Record<string, unknown>;
  const customer_name = str(b.customer_name, 80);
  if (!customer_name) return { error: "Informe o nome do cliente." };
  const customer_phone = normalizeCustomerPhone(b.customer_phone);
  if (!customer_phone) return { error: "Telefone inválido. Use DDD + número." };

  const items = (Array.isArray(b.items) ? b.items : [])
    .slice(0, 30)
    .map((i) => {
      const o = (i ?? {}) as Record<string, unknown>;
      const qty = Math.min(999, Math.max(1, Math.round(Number(o.qty) || 1)));
      const price = Math.round(Number(o.price_cents) || 0);
      return {
        title: str(o.title, 140),
        qty,
        price_cents: Math.min(100_000_000, Math.max(0, price)),
      };
    })
    .filter((i) => i.title);
  if (items.length === 0) return { error: "Adicione ao menos um item." };

  return {
    customer_name,
    customer_phone,
    items,
    notes: optStr(b.notes, 600),
    valid_until: validDate(b.valid_until),
    followup_at: validDate(b.followup_at),
  };
}
