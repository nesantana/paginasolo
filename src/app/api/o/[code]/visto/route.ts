import { NextResponse } from "next/server";
import { getQuoteByCode, markQuoteViewed } from "@/lib/quoteStore";
import { clientIp, rateLimit } from "@/lib/rateLimit";

type Ctx = { params: Promise<{ code: string }> };

/** Chamado pelo navegador do cliente ao abrir (robôs de pré-visualização não executam JS). */
export async function POST(request: Request, { params }: Ctx) {
  const { code } = await params;
  if (!rateLimit(`visto:${clientIp(request)}`, 60, 60 * 60 * 1000)) {
    return NextResponse.json({ ok: true });
  }
  try {
    const q = await getQuoteByCode(code);
    if (q) await markQuoteViewed(q);
  } catch (e) {
    console.error("orcamento visto:", e);
  }
  return NextResponse.json({ ok: true });
}
