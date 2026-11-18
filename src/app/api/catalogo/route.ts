import { NextResponse } from "next/server";
import { requirePaidOwner, NO_STORE } from "@/lib/ownerAuth";
import { createCatalogItem, listCatalog, parseCatalogInput } from "@/lib/catalogStore";

export async function GET() {
  const auth = await requirePaidOwner();
  if ("res" in auth) return auth.res;
  try {
    return NextResponse.json({ ok: true, items: await listCatalog(auth.tenant.id) }, { headers: NO_STORE });
  } catch (e) {
    console.error("catalogo GET:", e);
    return NextResponse.json({ ok: false, error: "Falha ao carregar." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requirePaidOwner();
  if ("res" in auth) return auth.res;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida." }, { status: 400 });
  }
  const input = parseCatalogInput(body);
  if ("error" in input) return NextResponse.json({ ok: false, error: input.error }, { status: 400 });
  try {
    const item = await createCatalogItem(auth.tenant.id, input);
    if ("error" in item) return NextResponse.json({ ok: false, error: item.error }, { status: 400 });
    return NextResponse.json({ ok: true, item }, { headers: NO_STORE });
  } catch (e) {
    console.error("catalogo POST:", e);
    return NextResponse.json({ ok: false, error: "Não foi possível salvar." }, { status: 500 });
  }
}
