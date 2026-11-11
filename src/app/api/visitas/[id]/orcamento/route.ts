import { NextResponse } from "next/server";
import { getVisit, isVisitId, visitToQuote } from "@/lib/visitStore";
import { requirePaidOwner, NO_STORE } from "@/lib/ownerAuth";

type Ctx = { params: Promise<{ id: string }> };

/** Gera o orçamento a partir dos itens da visita. Corpo opcional: { phone }. */
export async function POST(request: Request, { params }: Ctx) {
  const auth = await requirePaidOwner();
  if ("res" in auth) return auth.res;
  const { id } = await params;
  if (!isVisitId(id)) return NextResponse.json({ ok: false, error: "Visita inválida." }, { status: 400 });
  let b: Record<string, unknown> = {};
  try {
    b = (await request.json()) as Record<string, unknown>;
  } catch {
    /* sem corpo */
  }
  try {
    const visit = await getVisit(auth.tenant.id, id);
    if (!visit) return NextResponse.json({ ok: false, error: "Visita não encontrada." }, { status: 404 });
    if (visit.quote_id) return NextResponse.json({ ok: false, error: "Essa visita já virou orçamento." }, { status: 409 });
    const r = await visitToQuote(auth.tenant.id, visit, { phone: typeof b.phone === "string" ? b.phone : null });
    if ("error" in r) return NextResponse.json({ ok: false, error: r.error }, { status: 400 });
    return NextResponse.json({ ok: true, quote: r.quote }, { headers: NO_STORE });
  } catch (e) {
    console.error("visitas orcamento:", e);
    return NextResponse.json({ ok: false, error: "Não foi possível gerar." }, { status: 500 });
  }
}
