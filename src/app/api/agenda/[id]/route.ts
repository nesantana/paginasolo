import { NextResponse } from "next/server";
import {
  appointmentsBetween, deleteAppointment, getAppointment, isAppointmentId, isTimeValue, patchAppointment, type AppointmentPatch,
} from "@/lib/agendaStore";
import { warningsFor } from "@/lib/agendaConflicts";
import { tenantTimeZone, todayIn } from "@/lib/digest";
import { requirePaidOwner, NO_STORE } from "@/lib/ownerAuth";
import { parseIsoDate } from "@/lib/validate";
import { completeContractIfDone } from "@/lib/flow";

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
    // Remarcar para um horário que conflita: pede confirmação.
    if ("reschedule" in patch && b.force !== true) {
      const current = await getAppointment(auth.tenant.id, id);
      if (current) {
        const sameDay = await appointmentsBetween(auth.tenant.id, patch.reschedule.starts_on, patch.reschedule.starts_on);
        const warnings = warningsFor(
          { id, customer_name: current.customer_name, starts_on: patch.reschedule.starts_on, start_time: patch.reschedule.start_time, duration_min: current.duration_min },
          sameDay,
          todayIn(tenantTimeZone(auth.tenant.city))
        );
        if (warnings.length) {
          return NextResponse.json({ ok: false, needsConfirm: true, warnings }, { status: 409, headers: NO_STORE });
        }
      }
    }
    const appointment = await patchAppointment(auth.tenant.id, id, patch);
    if (!appointment) return NextResponse.json({ ok: false, error: "Serviço não encontrado." }, { status: 404 });
    // Integração: último serviço do contrato concluído -> contrato concluído (saldo passa a vencer).
    let contractCompleted = false;
    if ("status" in patch && patch.status === "done" && appointment.contract_id) {
      try {
        await completeContractIfDone(auth.tenant.id, appointment);
        contractCompleted = true;
      } catch (e) {
        console.error("concluir contrato:", e);
      }
    }
    return NextResponse.json({ ok: true, appointment, contractCompleted }, { headers: NO_STORE });
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
