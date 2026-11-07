import { NextResponse } from "next/server";
import { acceptQuote, getQuoteByCode } from "@/lib/quoteStore";
import { clientIp, rateLimit } from "@/lib/rateLimit";

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
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("orcamento aceitar:", e);
    return NextResponse.json({ ok: false, error: "Não foi possível registrar." }, { status: 500 });
  }
}
