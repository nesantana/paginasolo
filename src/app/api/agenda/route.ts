import { NextResponse } from "next/server";
import { appointmentsBetween, createAppointment, listAppointments, parseAppointment } from "@/lib/agendaStore";
import { warningsFor } from "@/lib/agendaConflicts";
import { parseIsoDate } from "@/lib/validate";
import { listContracts } from "@/lib/financeStore";
import { requirePaidOwner, NO_STORE } from "@/lib/ownerAuth";
import { addDays, tenantTimeZone, todayIn } from "@/lib/digest";
import { mailConfigured } from "@/lib/mailer";
import { clientIp, rateLimit } from "@/lib/rateLimit";

/** Agenda do dono: serviços de uma semana atrás em diante + contratos para preencher rápido. */
export async function GET(request: Request) {
  const auth = await requirePaidOwner();
  if ("res" in auth) return auth.res;
  try {
    const today = todayIn(tenantTimeZone(auth.tenant.city));
    const asked = parseIsoDate(new URL(request.url).searchParams.get("from"));
    const [appointments, contracts] = await Promise.all([
      listAppointments(auth.tenant.id, asked || addDays(today, -7)),
      listContracts(auth.tenant.id),
    ]);
    return NextResponse.json(
      {
        ok: true,
        today,
        email: auth.tenant.payer_email,
        emailReady: mailConfigured(),
        appointments,
        contracts: contracts
          .filter((c) => c.status !== "cancelled")
          .map((c) => ({
            id: c.id,
            customer_name: c.customer_name,
            customer_phone: c.customer_phone,
            title: c.title,
            delivery_date: c.delivery_date,
          })),
      },
      { headers: NO_STORE }
    );
  } catch (e) {
    console.error("agenda GET:", e);
    return NextResponse.json({ ok: false, error: "Falha ao carregar." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requirePaidOwner();
  if ("res" in auth) return auth.res;
  if (!rateLimit(`agenda:${auth.tenant.id}:${clientIp(request)}`, 120, 60 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "Muitas tentativas." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida." }, { status: 400 });
  }
  const input = parseAppointment(body);
  if ("error" in input) return NextResponse.json({ ok: false, error: input.error }, { status: 400 });
  try {
    // Avisos (conflito de horário, dia cheio, data passada...): pede confirmação, não trava.
    const force = (body as { force?: unknown } | null)?.force === true;
    if (!force) {
      const today = todayIn(tenantTimeZone(auth.tenant.city));
      const sameDay = await appointmentsBetween(auth.tenant.id, input.starts_on, input.starts_on);
      const warnings = warningsFor(
        { customer_name: input.customer_name, starts_on: input.starts_on, start_time: input.start_time, duration_min: input.duration_min },
        sameDay,
        today
      );
      if (warnings.length) {
        return NextResponse.json({ ok: false, needsConfirm: true, warnings }, { status: 409, headers: NO_STORE });
      }
    }
    const appointment = await createAppointment(auth.tenant.id, input);
    return NextResponse.json({ ok: true, appointment }, { headers: NO_STORE });
  } catch (e) {
    console.error("agenda POST:", e);
    return NextResponse.json({ ok: false, error: "Não foi possível salvar." }, { status: 500 });
  }
}
