import { NextResponse } from "next/server";
import { getContractByCode, signContract } from "@/lib/financeStore";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { appointmentFromSignedContract } from "@/lib/flow";

type Ctx = { params: Promise<{ code: string }> };

/** O cliente aceita o contrato digitando o nome completo. */
export async function POST(request: Request, { params }: Ctx) {
  const { code } = await params;
  const ip = clientIp(request);
  if (!rateLimit(`assinar:${ip}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "Muitas tentativas." }, { status: 429 });
  }
  let body: { name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida." }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.replace(/\s+/g, " ").trim().slice(0, 80) : "";
  if (name.split(" ").filter(Boolean).length < 2) {
    return NextResponse.json({ ok: false, error: "Digite seu nome completo para aceitar." }, { status: 400 });
  }
  try {
    const c = await getContractByCode(code);
    if (!c) return NextResponse.json({ ok: false, error: "Contrato não encontrado." }, { status: 404 });
    const saved = await signContract(c, name, ip);
    if (!saved) return NextResponse.json({ ok: false, error: "Este contrato foi encerrado." }, { status: 409 });
    // Integração: contrato aceito com data de entrega já entra na agenda.
    try {
      await appointmentFromSignedContract(saved);
    } catch (e) {
      console.error("agenda a partir do contrato:", e);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("contrato assinar:", e);
    return NextResponse.json({ ok: false, error: "Não foi possível registrar." }, { status: 500 });
  }
}
