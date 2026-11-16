import { NextResponse } from "next/server";
import { getQuoteByCode, markQuoteViewed } from "@/lib/quoteStore";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { notifyAfter } from "@/lib/notify";
import { formatBRL } from "@/lib/quoteUi";

type Ctx = { params: Promise<{ code: string }> };

/** Chamado pelo navegador do cliente ao abrir (robôs de pré-visualização não executam JS). */
export async function POST(request: Request, { params }: Ctx) {
  const { code } = await params;
  if (!rateLimit(`visto:${clientIp(request)}`, 60, 60 * 60 * 1000)) {
    return NextResponse.json({ ok: true });
  }
  try {
    const q = await getQuoteByCode(code);
    if (q && (await markQuoteViewed(q))) {
      notifyAfter(q.tenant_id, {
        kind: "quote_viewed",
        title: `${q.customer_name} abriu seu orçamento`,
        body: q.total_cents > 0 ? `Orçamento de ${formatBRL(q.total_cents)}. É um bom momento para chamar.` : "É um bom momento para chamar.",
        url: "/dashboard/orcamentos",
      });
    }
  } catch (e) {
    console.error("orcamento visto:", e);
  }
  return NextResponse.json({ ok: true });
}
