import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getLatestTenantByEmail } from "@/lib/tenantStore";
import { isAdminConfigured } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/adminAuth";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { normalizeBaseUrl } from "@/lib/siteUrl";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Resposta sempre igual: não revelamos se o e-mail tem site ou não.
const OK = {
  ok: true,
  message:
    "Se esse e-mail tiver um site, enviamos um link de acesso. Olhe a caixa de entrada e o spam.",
};

/**
 * Endereço público de quem chamou. O Supabase só redireciona para URLs que estão
 * na lista de Redirect URLs, então um endereço forjado cai no site_url e não vaza o token.
 */
function requestOrigin(request: Request): string {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (host) {
    const isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
    const proto = request.headers.get("x-forwarded-proto") || (isLocal ? "http" : "https");
    return `${proto.split(",")[0].trim()}://${host}`;
  }
  return normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL, new URL(request.url).origin);
}

/** Pede o link de acesso por e-mail (Supabase envia; só dispara se o e-mail tem site). */
export async function POST(request: Request) {
  let body: { email?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email) || email.length > 120) {
    return NextResponse.json({ ok: false, error: "Digite um e-mail válido." }, { status: 400 });
  }

  // Em desenvolvimento não limitamos, para poder testar o fluxo à vontade.
  if (
    process.env.NODE_ENV === "production" &&
    (!rateLimit(`entrar-ip:${clientIp(request)}`, 5, 60 * 60 * 1000) ||
      !rateLimit(`entrar-mail:${email}`, 3, 60 * 60 * 1000))
  ) {
    return NextResponse.json(
      { ok: false, error: "Muitas tentativas. Tente de novo em alguns minutos." },
      { status: 429 }
    );
  }

  if (!isAdminConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Login por e-mail indisponível neste ambiente." },
      { status: 503 }
    );
  }

  try {
    const tenant = await getLatestTenantByEmail(email);
    if (tenant || isAdminEmail(email)) {
      // O link volta para o mesmo endereço de onde o pedido saiu (Vercel ou localhost).
      const base = requestOrigin(request);
      // Fluxo "implicit": o link funciona em qualquer aparelho, sem cookie de verificação.
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false, flowType: "implicit" } }
      );
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${base}/entrar/confirmar`, shouldCreateUser: true },
      });
      if (error) console.error("entrar otp:", error.message);
    }
  } catch (e) {
    console.error("entrar:", e);
  }
  return NextResponse.json(OK);
}
