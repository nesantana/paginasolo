import { NextResponse } from "next/server";
import { acceptQuote, getQuoteByCode } from "@/lib/quoteStore";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { getTenantById } from "@/lib/tenantStore";
import { contractFromAcceptedQuote } from "@/lib/flow";
import { notifyAfter } from "@/lib/notify";
import { formatBRL } from "@/lib/quoteUi";

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
    let contractReady = false;
    let contractId: string | null = null;
    try {
      const tenant = await getTenantById(saved.tenant_id);
      if (tenant) {
        const made = await contractFromAcceptedQuote(saved, tenant);
        contractReady = Boolean(made);
        contractId = made?.id ?? null;
      }
    } catch (e) {
      console.error("contrato a partir do orçamento:", e);
    }
    if (q.status !== "accepted") {
      notifyAfter(saved.tenant_id, {
        kind: "quote_accepted",
        title: `${saved.customer_name} aceitou o orçamento${saved.total_cents > 0 ? ` de ${formatBRL(saved.total_cents)}` : ""}!`,
        body: contractReady
          ? "O contrato já está pronto. Revise e envie para ele assinar."
          : "Fale com ele para combinar os próximos passos.",
        url: `/dashboard/clientes/${contractId ?? saved.id}`,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("orcamento aceitar:", e);
    return NextResponse.json({ ok: false, error: "Não foi possível registrar." }, { status: 500 });
  }
}
