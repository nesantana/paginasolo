import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getLatestTenantByEmail } from "@/lib/tenantStore";
import { isAdminConfigured } from "@/lib/supabase/admin";
import { clientIp, rateLimit } from "@/lib/rateLimit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Resposta sempre igual: não revelamos se o e-mail tem site ou não.
const OK = {
  ok: true,
  message:
    "Se esse e-mail tiver um site, enviamos um link de acesso. Olhe a caixa de entrada e o spam.",
};

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

  if (
    !rateLimit(`entrar-ip:${clientIp(request)}`, 5, 60 * 60 * 1000) ||
    !rateLimit(`entrar-mail:${email}`, 3, 60 * 60 * 1000)
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
    if (tenant) {
      const base = (
        process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
      ).replace(/\/+$/, "");
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
