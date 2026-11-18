import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requirePaidOwner, NO_STORE } from "@/lib/ownerAuth";
import { deleteCatalogItem, getCatalogItem, parseCatalogInput, siteHasRoom, syncSiteServices, updateCatalogItem } from "@/lib/catalogStore";

type Ctx = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fresh(slug: string) {
  try {
    revalidatePath(`/${slug}`);
  } catch {
    // fora de render
  }
}

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
    const before = await getCatalogItem(auth.tenant.id, id);
    if (!before) return NextResponse.json({ ok: false, error: "Não encontrado." }, { status: 404 });
    let warning = "";
    if (input.show_on_site && !siteHasRoom(auth.tenant, input.name)) {
      input.show_on_site = false;
      warning = "Seu site comporta até 8 serviços. O item foi salvo, mas não entrou no site.";
    }
    const item = await updateCatalogItem(auth.tenant.id, id, input);
    if (!item) return NextResponse.json({ ok: false, error: "Não encontrado." }, { status: 404 });
    if (before.show_on_site || item.show_on_site) {
      const renamed = before.show_on_site && before.name !== item.name ? before.name : undefined;
      const t = await syncSiteServices(auth.tenant, { upsert: item, removeTitle: renamed });
      if (t) fresh(t.slug);
    }
    return NextResponse.json({ ok: true, item, warning }, { headers: NO_STORE });
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
    const before = await getCatalogItem(auth.tenant.id, id);
    const ok = await deleteCatalogItem(auth.tenant.id, id);
    if (ok && before?.show_on_site) {
      const t = await syncSiteServices(auth.tenant, { removeTitle: before.name });
      if (t) fresh(t.slug);
    }
    return NextResponse.json({ ok }, { status: ok ? 200 : 404, headers: NO_STORE });
  } catch (e) {
    console.error("catalogo DELETE:", e);
    return NextResponse.json({ ok: false, error: "Não foi possível apagar." }, { status: 500 });
  }
}
