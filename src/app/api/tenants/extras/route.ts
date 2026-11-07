import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getTenantByToken, updateTenantExtras } from "@/lib/tenantStore";
import { readEditToken } from "@/lib/editAuth";
import { parseExtras } from "@/lib/validate";

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

/** Salva galeria, depoimentos, FAQ e oferta do site do dono (cookie de edição). */
export async function POST(request: Request) {
  const token = await readEditToken();
  const tenant = token ? await getTenantByToken(token) : null;
  if (!tenant) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401, headers: NO_STORE }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida." }, { status: 400 });
  }

  const extras = parseExtras(body);
  const saved = await updateTenantExtras(tenant.id, extras);
  if (!saved) {
    return NextResponse.json({ ok: false, error: "Falha ao salvar." }, { status: 500 });
  }
  try {
    revalidatePath(`/${saved.slug}`);
  } catch {
    // ignora fora do contexto de render
  }

  return NextResponse.json({ ok: true, extras }, { headers: NO_STORE });
}
