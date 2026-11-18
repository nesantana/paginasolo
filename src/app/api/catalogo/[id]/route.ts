import { NextResponse } from "next/server";
import { requirePaidOwner, NO_STORE } from "@/lib/ownerAuth";
import { deleteCatalogItem, parseCatalogInput, updateCatalogItem } from "@/lib/catalogStore";

type Ctx = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requirePaidOwner();
  if ("res" in auth) return auth.res;
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ ok: false, error: "Item inválido." }, { status: 400 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida." }, { status: 400 });
  }
  const input = parseCatalogInput(body);
  if ("error" in input) return NextResponse.json({ ok: false, error: input.error }, { status: 400 });
  try {
    const item = await updateCatalogItem(auth.tenant.id, id, input);
    if (!item) return NextResponse.json({ ok: false, error: "Não encontrado." }, { status: 404 });
    return NextResponse.json({ ok: true, item }, { headers: NO_STORE });
  } catch (e) {
    console.error("catalogo PATCH:", e);
    return NextResponse.json({ ok: false, error: "Não foi possível salvar." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await requirePaidOwner();
  if ("res" in auth) return auth.res;
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ ok: false, error: "Item inválido." }, { status: 400 });
  try {
    const ok = await deleteCatalogItem(auth.tenant.id, id);
    return NextResponse.json({ ok }, { status: ok ? 200 : 404, headers: NO_STORE });
  } catch (e) {
    console.error("catalogo DELETE:", e);
    return NextResponse.json({ ok: false, error: "Não foi possível apagar." }, { status: 500 });
  }
}
