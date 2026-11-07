import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { getLatestTenantByEmail, rotateEditToken } from "@/lib/tenantStore";
import { EDIT_COOKIE, editCookieOptions, newEditToken } from "@/lib/editAuth";
import { clientIp, rateLimit } from "@/lib/rateLimit";

/**
 * Recebe o access_token do link enviado por e-mail, confirma com o Supabase que o
 * e-mail é do usuário e devolve o acesso ao painel (novo token de edição no cookie).
 */
export async function POST(request: Request) {
  if (!rateLimit(`confirmar:${clientIp(request)}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "Muitas tentativas." }, { status: 429 });
  }
  if (!isAdminConfigured()) {
    return NextResponse.json({ ok: false, error: "Indisponível." }, { status: 503 });
  }

  let accessToken = "";
  try {
    const b = (await request.json()) as { access_token?: unknown };
    accessToken = typeof b.access_token === "string" ? b.access_token : "";
  } catch {
    // cai na validação abaixo
  }
  if (accessToken.length < 20 || accessToken.length > 4000) {
    return NextResponse.json({ ok: false, error: "Link inválido." }, { status: 400 });
  }

  const { data, error } = await getAdminClient().auth.getUser(accessToken);
  const email = data?.user?.email?.toLowerCase();
  if (error || !email || !data.user?.email_confirmed_at) {
    return NextResponse.json(
      { ok: false, error: "Link inválido ou expirado. Peça um novo." },
      { status: 401 }
    );
  }

  const tenant = await getLatestTenantByEmail(email);
  if (!tenant) {
    return NextResponse.json({ ok: false, error: "Nenhum site encontrado." }, { status: 404 });
  }

  const token = newEditToken();
  await rotateEditToken(tenant.id, token);
  (await cookies()).set(EDIT_COOKIE, token, editCookieOptions);
  return NextResponse.json({ ok: true });
}
