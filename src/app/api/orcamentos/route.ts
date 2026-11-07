import { NextResponse } from "next/server";
import { createQuote, listQuotes } from "@/lib/quoteStore";
import { requirePaidOwner, NO_STORE } from "@/lib/ownerAuth";
import { parseQuoteInput } from "@/lib/validate";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export async function GET() {
  const auth = await requirePaidOwner();
  if ("res" in auth) return auth.res;
  try {
    const quotes = await listQuotes(auth.tenant.id);
    return NextResponse.json({ ok: true, quotes }, { headers: NO_STORE });
  } catch (e) {
    console.error("orcamentos GET:", e);
    return NextResponse.json({ ok: false, error: "Falha ao carregar." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requirePaidOwner();
  if ("res" in auth) return auth.res;
  if (!rateLimit(`orc:${auth.tenant.id}:${clientIp(request)}`, 120, 60 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "Muitas tentativas." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida." }, { status: 400 });
  }
  const input = parseQuoteInput(body);
  if ("error" in input) {
    return NextResponse.json({ ok: false, error: input.error }, { status: 400 });
  }
  try {
    const quote = await createQuote(auth.tenant.id, input);
    return NextResponse.json({ ok: true, quote }, { headers: NO_STORE });
  } catch (e) {
    console.error("orcamentos POST:", e);
    return NextResponse.json({ ok: false, error: "Não foi possível salvar." }, { status: 500 });
  }
}
