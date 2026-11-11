/**
 * Endereço público do app, sempre com protocolo e sem barra no fim.
 * Aceita NEXT_PUBLIC_APP_URL escrito sem "https://" (ex.: "appautonomia.ia.br"),
 * que antes quebrava `new URL(...)` e derrubava as páginas dos sites.
 */
export function normalizeBaseUrl(raw: string | undefined | null, fallback: string): string {
  let v = (raw || "").trim();
  if (!v) v = fallback;
  if (!/^https?:\/\//i.test(v)) {
    const local = /^(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(v);
    v = `${local ? "http" : "https"}://${v}`;
  }
  try {
    return new URL(v).origin;
  } catch {
    return fallback.replace(/\/+$/, "");
  }
}

export const SITE_URL = normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL, "http://localhost:3004");
