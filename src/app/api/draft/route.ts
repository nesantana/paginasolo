import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { parseTenantInput } from "@/lib/validate";
import { generateCopy } from "@/lib/ai";
import { createDraftTenant } from "@/lib/tenantStore";
import { EDIT_COOKIE, editCookieOptions, newEditToken } from "@/lib/editAuth";
import { HINT_COOKIE, OWNER_HINT_MAX_AGE, hintCookieOptions } from "@/lib/sessionHint";
import { clientIp, rateLimit } from "@/lib/rateLimit";

/** Recebe as respostas do chat, gera o texto, cria o rascunho (preview) e o acesso por token. */
export async function POST(request: Request) {
  if (!rateLimit(`draft:${clientIp(request)}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json(
      { ok: false, error: "Muitas tentativas. Tente novamente em alguns minutos." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = parseTenantInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }
  const input = parsed.data;
  if (!input.payer_email) {
    return NextResponse.json({ ok: false, error: "Informe seu e-mail." }, { status: 400 });
  }
  if (input.services.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Informe pelo menos um serviço." },
      { status: 400 }
    );
  }

  const copy = await generateCopy({
    business_name: input.business_name,
    category: input.category,
    city: input.city,
    services: input.services.map((s) => s.title),
  });

  const token = newEditToken();
  const tenant = await createDraftTenant(
    {
      ...input,
      headline: copy.headline,
      description: copy.description,
      services: copy.services,
    },
    token
  );

  (await cookies()).set(EDIT_COOKIE, token, editCookieOptions);
  (await cookies()).set(HINT_COOKIE, "o", hintCookieOptions(OWNER_HINT_MAX_AGE));
  try {
    revalidatePath(`/${tenant.slug}`);
  } catch {
    // ignora fora do contexto de render
  }

  return NextResponse.json({
    ok: true,
    slug: tenant.slug,
    // Quem tiver este link edita o site: mostrar uma vez e guardar para recuperação.
    accessPath: `/api/acesso?t=${token}`,
  });
}
