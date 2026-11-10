import { NextResponse } from "next/server";
import { getContractForTenant, replacePayments } from "@/lib/financeStore";
import { requirePaidOwner, NO_STORE } from "@/lib/ownerAuth";
import { parsePayments } from "@/lib/contractValidate";
import { tenantTimeZone, todayIn } from "@/lib/digest";

type Ctx = { params: Promise<{ id: string }> };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Troca a forma de pagamento de um contrato que ainda não recebeu nada (ex.: o gerado do orçamento). */
export async function PUT(request: Request, { params }: Ctx) {
  const auth = await requirePaidOwner();
  if ("res" in auth) return auth.res;
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ ok: false, error: "Contrato inválido." }, { status: 400 });

  let body: { payments?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida." }, { status: 400 });
  }

  try {
    const contract = await getContractForTenant(auth.tenant.id, id);
    if (!contract) return NextResponse.json({ ok: false, error: "Contrato não encontrado." }, { status: 404 });

    const today = todayIn(tenantTimeZone(auth.tenant.city));
    const payments = parsePayments(body.payments, contract.total_cents, today);
    if ("error" in payments) return NextResponse.json({ ok: false, error: payments.error }, { status: 400 });

    const saved = await replacePayments(auth.tenant.id, id, payments);
    if (saved === "locked") {
      return NextResponse.json(
        { ok: false, error: "Este contrato já tem pagamento registrado ou foi encerrado. Não dá para trocar a forma de pagamento." },
        { status: 409 }
      );
    }
    if (!saved) return NextResponse.json({ ok: false, error: "Contrato não encontrado." }, { status: 404 });
    return NextResponse.json({ ok: true, contract: saved }, { headers: NO_STORE });
  } catch (e) {
    console.error("plano PUT:", e);
    return NextResponse.json({ ok: false, error: "Não foi possível salvar." }, { status: 500 });
  }
}
