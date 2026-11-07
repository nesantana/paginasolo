import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { updateTenantLinks } from "@/lib/tenantStore";
import { requirePaidOwner, NO_STORE } from "@/lib/ownerAuth";
import { parseLinks } from "@/lib/validate";

/** Salva os links da página /{slug}/links (plano ativo). */
export async function POST(request: Request) {
  const auth = await requirePaidOwner();
  if ("res" in auth) return auth.res;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida." }, { status: 400 });
  }
  const links = parseLinks(body);
  const saved = await updateTenantLinks(auth.tenant.id, links);
  if (!saved) {
    return NextResponse.json({ ok: false, error: "Falha ao salvar." }, { status: 500 });
  }
  try {
    revalidatePath(`/${saved.slug}/links`);
  } catch {
    // fora do contexto de render
  }
  return NextResponse.json({ ok: true, links }, { headers: NO_STORE });
}
