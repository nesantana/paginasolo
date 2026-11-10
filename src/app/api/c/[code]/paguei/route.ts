import { NextResponse } from "next/server";
import { getContractByCode, informPayment } from "@/lib/financeStore";
import { clientIp, rateLimit } from "@/lib/rateLimit";

type Ctx = { params: Promise<{ code: string }> };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** O cliente avisa "já paguei". Fica como "aguardando confirmação" até o dono conferir. */
export async function POST(request: Request, { params }: Ctx) {
  const { code } = await params;
  if (!rateLimit(`paguei:${clientIp(request)}`, 30, 60 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "Muitas tentativas." }, { status: 429 });
  }
  let body: { payment_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida." }, { status: 400 });
  }
  const pid = typeof body.payment_id === "string" ? body.payment_id : "";
  if (!UUID_RE.test(pid)) return NextResponse.json({ ok: false, error: "Parcela inválida." }, { status: 400 });
  try {
    const c = await getContractByCode(code);
    if (!c || c.status === "cancelled") {
      return NextResponse.json({ ok: false, error: "Contrato não encontrado." }, { status: 404 });
    }
    const saved = await informPayment(c.id, pid);
    return NextResponse.json({ ok: Boolean(saved) }, { status: saved ? 200 : 409 });
  } catch (e) {
    console.error("contrato paguei:", e);
    return NextResponse.json({ ok: false, error: "Não foi possível registrar." }, { status: 500 });
  }
}
