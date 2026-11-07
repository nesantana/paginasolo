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
      primary_color: COLOR_RE.test(color) ? color : "#FF6600",
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
