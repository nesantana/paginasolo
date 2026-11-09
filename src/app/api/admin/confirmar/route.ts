import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { ADMIN_COOKIE, adminCookieOptions, createAdminSession, isAdminEmail } from "@/lib/adminAuth";
import { clientIp, rateLimit } from "@/lib/rateLimit";

/** Troca o access_token do link por e-mail pela sessão do admin (se o e-mail é admin). */
export async function POST(request: Request) {
  if (!rateLimit(`adm-conf:${clientIp(request)}`, 10, 3600_000)) {
    return NextResponse.json({ ok: false, error: "Muitas tentativas." }, { status: 429 });
  }
  if (!isAdminConfigured()) {
    return NextResponse.json({ ok: false, error: "Indisponível." }, { status: 503 });
  }
  let token = "";
  try {
    const b = (await request.json()) as { access_token?: unknown };
    token = typeof b.access_token === "string" ? b.access_token : "";
  } catch {
    // validado abaixo
  }
  if (token.length < 20 || token.length > 4000) {
    return NextResponse.json({ ok: false, error: "Link inválido." }, { status: 400 });
  }

  const { data, error } = await getAdminClient().auth.getUser(token);
  const email = data?.user?.email?.toLowerCase();
  if (error || !email || !data.user?.email_confirmed_at || !isAdminEmail(email)) {
    return NextResponse.json({ ok: false, error: "Link inválido ou sem permissão." }, { status: 401 });
  }
  const session = createAdminSession(email);
  if (!session) return NextResponse.json({ ok: false, error: "Indisponível." }, { status: 503 });
  (await cookies()).set(ADMIN_COOKIE, session, adminCookieOptions);
  return NextResponse.json({ ok: true });
}
