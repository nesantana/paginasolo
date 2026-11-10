import { NextResponse } from "next/server";
import { applyPaymentAction, type PaymentAction } from "@/lib/financeStore";
import { requirePaidOwner, NO_STORE } from "@/lib/ownerAuth";
import { parseIsoDate } from "@/lib/validate";
import { METHODS } from "@/lib/contractUi";

type Ctx = { params: Promise<{ id: string; pid: string }> };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseAction(b: Record<string, unknown>): PaymentAction | null {
  switch (b.type) {
    case "paid": {
      const method = typeof b.method === "string" && METHODS.includes(b.method) ? b.method : null;
      return { type: "paid", method, paid_on: parseIsoDate(b.paid_on) };
    }
    case "undo":
      return { type: "undo" };
    case "reminded":
      return { type: "reminded" };
    case "reschedule": {
      const d = parseIsoDate(b.due_date);
      return d ? { type: "reschedule", due_date: d } : null;
    }
    case "note":
      return { type: "note", note: typeof b.note === "string" ? b.note.trim().slice(0, 200) || null : null };
    default:
      return null;
  }
}

/** Confirma recebimento, desfaz, remarca vencimento, registra lembrete ou observação. */
export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requirePaidOwner();
  if ("res" in auth) return auth.res;
  const { pid } = await params;
  if (!UUID_RE.test(pid)) return NextResponse.json({ ok: false, error: "Parcela inválida." }, { status: 400 });
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida." }, { status: 400 });
  }
  const action = parseAction(body ?? {});
  if (!action) return NextResponse.json({ ok: false, error: "Ação inválida." }, { status: 400 });
  try {
    const payment = await applyPaymentAction(auth.tenant.id, pid, action);
    if (!payment) return NextResponse.json({ ok: false, error: "Parcela não encontrada." }, { status: 404 });
    return NextResponse.json({ ok: true, payment }, { headers: NO_STORE });
  } catch (e) {
    console.error("parcela PATCH:", e);
    return NextResponse.json({ ok: false, error: "Não foi possível salvar." }, { status: 500 });
  }
}
