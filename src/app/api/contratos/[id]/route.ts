import { NextResponse } from "next/server";
import { deleteContract, setContractStatus } from "@/lib/financeStore";
import { requirePaidOwner, NO_STORE } from "@/lib/ownerAuth";
import type { ContractStatus } from "@/types/finance";

type Ctx = { params: Promise<{ id: string }> };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES: ContractStatus[] = ["sent", "completed", "cancelled"];

/** Muda a situação do contrato: enviado, serviço concluído ou cancelado. */
export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requirePaidOwner();
  if ("res" in auth) return auth.res;
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ ok: false, error: "Contrato inválido." }, { status: 400 });
  let body: { status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida." }, { status: 400 });
  }
  if (!STATUSES.includes(body.status as ContractStatus)) {
    return NextResponse.json({ ok: false, error: "Situação inválida." }, { status: 400 });
  }
  try {
    const contract = await setContractStatus(auth.tenant.id, id, body.status as ContractStatus);
    if (!contract) return NextResponse.json({ ok: false, error: "Contrato não encontrado." }, { status: 404 });
    return NextResponse.json({ ok: true, contract }, { headers: NO_STORE });
  } catch (e) {
    console.error("contratos PATCH:", e);
    return NextResponse.json({ ok: false, error: "Não foi possível salvar." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await requirePaidOwner();
  if ("res" in auth) return auth.res;
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ ok: false, error: "Contrato inválido." }, { status: 400 });
  try {
    const ok = await deleteContract(auth.tenant.id, id);
    return NextResponse.json({ ok }, { status: ok ? 200 : 404, headers: NO_STORE });
  } catch (e) {
    console.error("contratos DELETE:", e);
    return NextResponse.json({ ok: false, error: "Não foi possível excluir." }, { status: 500 });
  }
}
