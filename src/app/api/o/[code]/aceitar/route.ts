import { NextResponse } from "next/server";
import { acceptQuote, getQuoteByCode } from "@/lib/quoteStore";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { getTenantById } from "@/lib/tenantStore";
import { contractFromAcceptedQuote } from "@/lib/flow";

type Ctx = { params: Promise<{ code: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const { code } = await params;
  if (!rateLimit(`aceitar:${clientIp(request)}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "Muitas tentativas." }, { status: 429 });
  }
  try {
    const q = await getQuoteByCode(code);
    if (!q) return NextResponse.json({ ok: false, error: "Orçamento não encontrado." }, { status: 404 });
    const saved = await acceptQuote(q);
    if (!saved) {
      return NextResponse.json({ ok: false, error: "Este orçamento foi encerrado." }, { status: 409 });
    }
    // Integração: orçamento aceito já vira um contrato (rascunho) para o dono revisar e enviar.
    try {
      const tenant = await getTenantById(saved.tenant_id);
      if (tenant) await contractFromAcceptedQuote(saved, tenant);
    } catch (e) {
      console.error("contrato a partir do orçamento:", e);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("orcamento aceitar:", e);
    return NextResponse.json({ ok: false, error: "Não foi possível registrar." }, { status: 500 });
  }
}
