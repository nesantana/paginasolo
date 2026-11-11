import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { normalizeBaseUrl } from "@/lib/siteUrl";

/**
 * Sessão do admin: cookie assinado (HMAC) com e-mail + validade.
 * Quem pode ser admin vem da env ADMIN_EMAILS (separados por vírgula).
 * A chave de assinatura é derivada da SUPABASE_SERVICE_ROLE_KEY: sem ela o admin fica desligado.
 */
export const ADMIN_COOKIE = "ps_admin";
const SESSION_MS = 12 * 60 * 60 * 1000;

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export const isAdminEmail = (email: string) =>
  adminEmails().includes(email.trim().toLowerCase());

function key(): string | null {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return k && !k.includes("sua-chave") ? `paginasolo-admin:${k}` : null;
}

const sign = (payload: string, k: string) =>
  createHmac("sha256", k).update(payload).digest("base64url");

export function createAdminSession(email: string): string | null {
  const k = key();
  if (!k) return null;
  const payload = Buffer.from(
    JSON.stringify({ e: email.toLowerCase(), x: Date.now() + SESSION_MS })
  ).toString("base64url");
  return `${payload}.${sign(payload, k)}`;
}

export function verifyAdminSession(value: string | undefined): string | null {
  const k = key();
  if (!k || !value) return null;
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload, k);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { e, x } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof e !== "string" || typeof x !== "number" || x < Date.now()) return null;
    // Recheca a lista a cada request: tirar o e-mail da env revoga na hora.
    return isAdminEmail(e) ? e : null;
  } catch {
    return null;
  }
}

/** E-mail do admin logado, ou null. */
export async function readAdmin(): Promise<string | null> {
  return verifyAdminSession((await cookies()).get(ADMIN_COOKIE)?.value);
}

export const adminCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MS / 1000,
};

/** Endereço público de quem chamou (o Supabase só redireciona para URLs liberadas). */
export function requestOrigin(request: Request): string {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (host) {
    const isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
    const proto = request.headers.get("x-forwarded-proto") || (isLocal ? "http" : "https");
    return `${proto.split(",")[0].trim()}://${host}`;
  }
  return normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL, new URL(request.url).origin);
}
