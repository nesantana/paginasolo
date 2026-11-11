import { NextResponse } from "next/server";
import { createVisit, listFollowups, listVisits, parseVisit } from "@/lib/visitStore";
import { requirePaidOwner, NO_STORE } from "@/lib/ownerAuth";
import { tenantTimeZone, todayIn } from "@/lib/digest";
import { clientIp, rateLimit } from "@/lib/rateLimit";

/** Visitas técnicas do dono (mais recentes primeiro) e os retornos pendentes. */
export async function GET() {
  const auth = await requirePaidOwner();
  if ("res" in auth) return auth.res;
  try {
    const [visits, followups] = await Promise.all([listVisits(auth.tenant.id), listFollowups(auth.tenant.id)]);
    return NextResponse.json(
      { ok: true, today: todayIn(tenantTimeZone(auth.tenant.city)), visits, followups },
      { headers: NO_STORE }
    );
  } catch (e) {
    console.error("visitas GET:", e);
    return NextResponse.json({ ok: false, error: "Falha ao carregar." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requirePaidOwner();
  if ("res" in auth) return auth.res;
  if (!rateLimit(`visitas:${auth.tenant.id}:${clientIp(request)}`, 120, 60 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "Muitas tentativas." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida." }, { status: 400 });
  }
  const input = parseVisit(body);
  if ("error" in input) return NextResponse.json({ ok: false, error: input.error }, { status: 400 });
  try {
    const visit = await createVisit(auth.tenant.id, input);
    return NextResponse.json({ ok: true, visit }, { headers: NO_STORE });
  } catch (e) {
    console.error("visitas POST:", e);
    return NextResponse.json({ ok: false, error: "Não foi possível salvar." }, { status: 500 });
  }
}
