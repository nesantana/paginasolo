import { NextResponse } from "next/server";
import { requirePaidOwner, NO_STORE } from "@/lib/ownerAuth";
import { openaiConfigured } from "@/lib/openai";
import { runAssistant } from "@/lib/assistant";
import { rateLimit } from "@/lib/rateLimit";
import { requestOrigin } from "@/lib/adminAuth";

export const maxDuration = 60;

/** Chat do assistente: só para quem tem o plano ativo. O texto vai e volta, sem salvar nada. */
export async function POST(request: Request) {
  const auth = await requirePaidOwner();
  if ("res" in auth) return auth.res;
  if (!openaiConfigured()) {
    return NextResponse.json({ ok: false, error: "O assistente ainda não está ligado." }, { status: 503, headers: NO_STORE });
  }
  const id = auth.tenant.id;
  if (!rateLimit(`ia-h:${id}`, 40, 60 * 60 * 1000) || !rateLimit(`ia-d:${id}`, 150, 24 * 60 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "Você usou muitas mensagens por hoje. Tente mais tarde." }, { status: 429, headers: NO_STORE });
  }

  let body: { messages?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida." }, { status: 400 });
  }
  const raw = Array.isArray(body.messages) ? body.messages : [];
  const history = raw
    .slice(-14)
    .map((m) => ({ role: (m as { role?: string })?.role, content: String((m as { content?: unknown })?.content ?? "").slice(0, 1500) }))
    .filter((m): m is { role: "user" | "assistant"; content: string } => (m.role === "user" || m.role === "assistant") && m.content.trim().length > 0);
  if (!history.length || history[history.length - 1].role !== "user") {
    return NextResponse.json({ ok: false, error: "Mensagem vazia." }, { status: 400 });
  }

  try {
    const out = await runAssistant(auth.tenant, history, requestOrigin(request));
    return NextResponse.json({ ok: true, ...out }, { headers: NO_STORE });
  } catch (e) {
    console.error("assistente:", e);
    if (e instanceof Error && e.message === "no_credit") {
      console.error("assistente: conta da OpenAI sem crédito");
      return NextResponse.json({ ok: false, error: "O assistente está indisponível no momento. Tente mais tarde." }, { status: 503, headers: NO_STORE });
    }
    const limited = e instanceof Error && e.message === "rate_limit";
    return NextResponse.json(
      { ok: false, error: limited ? "O assistente está ocupado. Tente de novo em um minuto." : "Não consegui responder agora. Tente de novo." },
      { status: 502, headers: NO_STORE }
    );
  }
}
