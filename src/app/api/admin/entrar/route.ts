import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminConfigured } from "@/lib/supabase/admin";
import { isAdminEmail, requestOrigin } from "@/lib/adminAuth";
import { clientIp, rateLimit } from "@/lib/rateLimit";

const OK = { ok: true, message: "Se esse e-mail for de administrador, enviamos o link de acesso." };

/** Envia o link de acesso (Supabase Auth) só se o e-mail estiver em ADMIN_EMAILS. Resposta sempre igual. */
export async function POST(request: Request) {
  let email = "";
  try {
    const b = (await request.json()) as { email?: unknown };
    email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) {
    return NextResponse.json({ ok: false, error: "Digite um e-mail válido." }, { status: 400 });
  }
  if (
    process.env.NODE_ENV === "production" &&
    (!rateLimit(`adm-ip:${clientIp(request)}`, 5, 3600_000) || !rateLimit(`adm-mail:${email}`, 3, 3600_000))
  ) {
    return NextResponse.json({ ok: false, error: "Muitas tentativas." }, { status: 429 });
  }
  if (!isAdminConfigured()) {
    return NextResponse.json({ ok: false, error: "Indisponível neste ambiente." }, { status: 503 });
  }

  if (isAdminEmail(email)) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false, flowType: "implicit" } }
      );
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${requestOrigin(request)}/admin/confirmar`, shouldCreateUser: true },
      });
      if (error) console.error("admin otp:", error.message);
    } catch (e) {
      console.error("admin entrar:", e);
    }
  }
  return NextResponse.json(OK);
}
