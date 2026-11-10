import { NextResponse } from "next/server";
import { updateTenantPix } from "@/lib/tenantStore";
import { requirePaidOwner, NO_STORE } from "@/lib/ownerAuth";
import { parsePixSettings } from "@/lib/contractValidate";

/** Cadastra (ou limpa) a chave Pix e o CPF/CNPJ de quem recebe. */
export async function POST(request: Request) {
  const auth = await requirePaidOwner();
  if ("res" in auth) return auth.res;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida." }, { status: 400 });
  }
  const parsed = parsePixSettings(body);
  if ("error" in parsed) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }
  try {
    const saved = await updateTenantPix(auth.tenant.id, parsed);
    if (!saved) return NextResponse.json({ ok: false, error: "Falha ao salvar." }, { status: 500 });
    return NextResponse.json({ ok: true, pix: parsed }, { headers: NO_STORE });
  } catch (e) {
    console.error("pix POST:", e);
    return NextResponse.json({ ok: false, error: "Não foi possível salvar." }, { status: 500 });
  }
}
