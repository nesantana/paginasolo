import { NextResponse } from "next/server";
import { requirePaidOwner, NO_STORE } from "@/lib/ownerAuth";
import { sendDigestFor } from "@/lib/digest";
import { requestOrigin } from "@/lib/adminAuth";
import { clientIp, rateLimit } from "@/lib/rateLimit";

/** Manda agora, para o e-mail do próprio dono, o resumo de hoje (para conferir como chega). */
export async function POST(request: Request) {
  const auth = await requirePaidOwner();
  if ("res" in auth) return auth.res;
  if (!rateLimit(`agenda-teste:${auth.tenant.id}:${clientIp(request)}`, 4, 60 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "Muitos envios. Tente mais tarde." }, { status: 429 });
  }
  try {
    const out = await sendDigestFor(auth.tenant, { origin: requestOrigin(request), force: true });
    if (out === "sent") return NextResponse.json({ ok: true, message: `Enviado para ${auth.tenant.payer_email}.` }, { headers: NO_STORE });
    if (out === "empty")
      return NextResponse.json({ ok: false, error: "Você não tem serviço nem cobrança para hoje, então não há o que enviar." }, { headers: NO_STORE });
    if (out === "no_email")
      return NextResponse.json({ ok: false, error: "Seu site não tem e-mail cadastrado." }, { headers: NO_STORE });
    if (typeof out === "object" && !out.ok && out.reason === "not_configured")
      return NextResponse.json({ ok: false, error: "O envio de e-mail ainda não foi ativado neste ambiente." }, { status: 503, headers: NO_STORE });
    return NextResponse.json({ ok: false, error: "Não foi possível enviar o e-mail agora." }, { status: 502, headers: NO_STORE });
  } catch (e) {
    console.error("agenda teste:", e);
    return NextResponse.json({ ok: false, error: "Não foi possível enviar." }, { status: 500 });
  }
}
