import { NextResponse } from "next/server";
import { requirePaidOwner, NO_STORE } from "@/lib/ownerAuth";
import { importSiteServices, listCatalog } from "@/lib/catalogStore";

/** Traz os serviços que já estão no site para o catálogo. */
export async function POST() {
  const auth = await requirePaidOwner();
  if ("res" in auth) return auth.res;
  try {
    const added = await importSiteServices(auth.tenant);
    return NextResponse.json({ ok: true, added, items: await listCatalog(auth.tenant.id) }, { headers: NO_STORE });
  } catch (e) {
    console.error("catalogo importar:", e);
    return NextResponse.json({ ok: false, error: "Não foi possível importar." }, { status: 500 });
  }
}
