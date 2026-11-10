import { NextResponse } from "next/server";
import {
  deleteAppointment, isAppointmentId, isTimeValue, patchAppointment, type AppointmentPatch,
} from "@/lib/agendaStore";
import { requirePaidOwner, NO_STORE } from "@/lib/ownerAuth";
import { parseIsoDate } from "@/lib/validate";

type Ctx = { params: Promise<{ id: string }> };

/** Conclui, cancela, reabre ou remarca um serviço. */
export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requirePaidOwner();
  if ("res" in auth) return auth.res;
  const { id } = await params;
  if (!isAppointmentId(id)) return NextResponse.json({ ok: false, error: "Serviço inválido." }, { status: 400 });
  let b: Record<string, unknown>;
  try {
    b = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida." }, { status: 400 });
  }

  let patch: AppointmentPatch | null = null;
  if (b.status === "done" || b.status === "cancelled" || b.status === "scheduled") {
    patch = { status: b.status };
  } else if (b.starts_on) {
    const day = parseIsoDate(b.starts_on);
    const time = typeof b.start_time === "string" && b.start_time ? b.start_time : null;
    if (day && (time === null || isTimeValue(time))) patch = { reschedule: { starts_on: day, start_time: time } };
  }
  if (!patch) return NextResponse.json({ ok: false, error: "Ação inválida." }, { status: 400 });

  try {
    const appointment = await patchAppointment(auth.tenant.id, id, patch);
    if (!appointment) return NextResponse.json({ ok: false, error: "Serviço não encontrado." }, { status: 404 });
    return NextResponse.json({ ok: true, appointment }, { headers: NO_STORE });
  } catch (e) {
    console.error("agenda PATCH:", e);
    return NextResponse.json({ ok: false, error: "Não foi possível salvar." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await requirePaidOwner();
  if ("res" in auth) return auth.res;
  const { id } = await params;
  if (!isAppointmentId(id)) return NextResponse.json({ ok: false, error: "Serviço inválido." }, { status: 400 });
  try {
    const ok = await deleteAppointment(auth.tenant.id, id);
    return NextResponse.json({ ok }, { status: ok ? 200 : 404, headers: NO_STORE });
  } catch (e) {
    console.error("agenda DELETE:", e);
    return NextResponse.json({ ok: false, error: "Não foi possível excluir." }, { status: 500 });
  }
}
