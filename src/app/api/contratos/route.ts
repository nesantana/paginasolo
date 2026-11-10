import { NextResponse } from "next/server";
import { createContract } from "@/lib/financeStore";
import { requirePaidOwner, NO_STORE } from "@/lib/ownerAuth";
import { parseContractInput } from "@/lib/contractValidate";
import { todayISO } from "@/lib/quoteUi";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const auth = await requirePaidOwner();
  if ("res" in auth) return auth.res;
  if (!rateLimit(`contrato:${auth.tenant.id}:${clientIp(request)}`, 60, 60 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "Muitas tentativas." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida." }, { status: 400 });
  }
  const input = parseContractInput(body, todayISO());
  if ("error" in input) {
    return NextResponse.json({ ok: false, error: input.error }, { status: 400 });
  }
  try {
    const contract = await createContract(auth.tenant.id, input);
    return NextResponse.json({ ok: true, contract }, { headers: NO_STORE });
  } catch (e) {
    console.error("contratos POST:", e);
    return NextResponse.json({ ok: false, error: "Não foi possível salvar." }, { status: 500 });
  }
}
