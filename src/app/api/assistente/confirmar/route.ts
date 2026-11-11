import { NextResponse } from "next/server";
import { requirePaidOwner, NO_STORE } from "@/lib/ownerAuth";
import { applyProposal } from "@/lib/assistant";
import { rateLimit } from "@/lib/rateLimit";
import { requestOrigin } from "@/lib/adminAuth";

/** O dono tocou em "Confirmar" num cartão do assistente: aí sim salva (com as mesmas validações do app). */
export async function POST(request: Request) {
  const auth = await requirePaidOwner();
  if ("res" in auth) return auth.res;
  if (!rateLimit(`ia-ok:${auth.tenant.id}`, 60, 60 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "Muitas tentativas." }, { status: 429, headers: NO_STORE });
  }
  let body: { kind?: unknown; args?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida." }, { status: 400 });
  }
  try {
    const out = await applyProposal(auth.tenant, String(body.kind || ""), body.args, requestOrigin(request));
    return NextResponse.json(out, { status: out.ok ? 200 : 400, headers: NO_STORE });
  } catch (e) {
    console.error("assistente confirmar:", e);
    return NextResponse.json({ ok: false, error: "Não foi possível salvar." }, { status: 500, headers: NO_STORE });
  }
}
