import { NextResponse } from "next/server";
import { getContractByCode, markContractViewed } from "@/lib/financeStore";
import { clientIp, rateLimit } from "@/lib/rateLimit";

type Ctx = { params: Promise<{ code: string }> };

/** Marca a primeira abertura do contrato (chamado pelo navegador de quem abriu). */
export async function POST(request: Request, { params }: Ctx) {
  const { code } = await params;
  if (!rateLimit(`cvisto:${clientIp(request)}`, 60, 60 * 60 * 1000)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }
  try {
    const c = await getContractByCode(code);
    if (c) await markContractViewed(c);
  } catch (e) {
    console.error("contrato visto:", e);
  }
  return NextResponse.json({ ok: true });
}
