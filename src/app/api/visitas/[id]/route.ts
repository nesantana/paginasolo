import { NextResponse } from "next/server";
import { deleteVisit, isTimeOk, isVisitId, parseItems, patchVisit, type VisitPatch } from "@/lib/visitStore";
import { requirePaidOwner, NO_STORE } from "@/lib/ownerAuth";
import { parseIsoDate } from "@/lib/validate";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Ações sobre uma visita. Corpo (todos opcionais):
 *  status | starts_on+start_time | add_note | remove_note | items | followup_at (ou null)
 *  | followup_done | followup_note | address | customer_phone
 */
export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requirePaidOwner();
  if ("res" in auth) return auth.res;
  const { id } = await params;
  if (!isVisitId(id)) return NextResponse.json({ ok: false, error: "Visita inválida." }, { status: 400 });
  let b: Record<string, unknown>;
  try {
    b = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida." }, { status: 400 });
  }

  const p: VisitPatch = {};
  if (b.status === "done" || b.status === "cancelled" || b.status === "scheduled") p.status = b.status;
  if (b.starts_on) {
    const day = parseIsoDate(b.starts_on);
    const time = typeof b.start_time === "string" && b.start_time ? b.start_time : null;
    if (!day || (time !== null && !isTimeOk(time))) return NextResponse.json({ ok: false, error: "Data ou hora inválida." }, { status: 400 });
    p.reschedule = { starts_on: day, start_time: time };
  }
  if (typeof b.add_note === "string" && b.add_note.trim()) p.add_note = b.add_note;
  if (typeof b.remove_note === "string") p.remove_note = b.remove_note;
  if (Array.isArray(b.items)) p.items = parseItems(b.items);
  if ("followup_at" in b) {
    if (b.followup_at === null) p.followup_at = null;
    else {
      const d = parseIsoDate(b.followup_at);
      if (!d) return NextResponse.json({ ok: false, error: "Data inválida." }, { status: 400 });
      p.followup_at = d;
    }
  }
  if (b.followup_done === true) p.followup_done = true;
  if ("followup_note" in b) p.followup_note = typeof b.followup_note === "string" ? b.followup_note : null;
  if ("address" in b) p.address = typeof b.address === "string" ? b.address : null;
  if ("customer_phone" in b) {
    const raw = typeof b.customer_phone === "string" ? b.customer_phone.trim() : "";
    p.customer_phone = raw || null;
  }
  if (Object.keys(p).length === 0) return NextResponse.json({ ok: false, error: "Nada para atualizar." }, { status: 400 });

  try {
    const visit = await patchVisit(auth.tenant.id, id, p);
    if (!visit) return NextResponse.json({ ok: false, error: "Visita não encontrada." }, { status: 404 });
    return NextResponse.json({ ok: true, visit }, { headers: NO_STORE });
  } catch (e) {
    console.error("visitas PATCH:", e);
    return NextResponse.json({ ok: false, error: "Não foi possível salvar." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const auth = await requirePaidOwner();
  if ("res" in auth) return auth.res;
  const { id } = await params;
  if (!isVisitId(id)) return NextResponse.json({ ok: false, error: "Visita inválida." }, { status: 400 });
  try {
    const ok = await deleteVisit(auth.tenant.id, id);
    return NextResponse.json({ ok }, { status: ok ? 200 : 404, headers: NO_STORE });
  } catch (e) {
    console.error("visitas DELETE:", e);
    return NextResponse.json({ ok: false, error: "Não foi possível apagar." }, { status: 500 });
  }
}
