import "server-only";

export type ChatMsg =
  | { role: "system" | "user" | "assistant"; content: string; tool_calls?: ToolCall[] }
  | { role: "assistant"; content: string | null; tool_calls: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };

export type ToolDef = {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

/**
 * Provedor do assistente: AI_PROVIDER=gemini (padrão) ou openai.
 * Os dois falam o mesmo formato (Chat Completions), então só mudam endereço, chave e modelo.
 */
function provider() {
  const useOpenAI = process.env.AI_PROVIDER === "openai" || (!process.env.GEMINI_API_KEY && !!process.env.OPENAI_API_KEY);
  return useOpenAI
    ? { url: "https://api.openai.com/v1/chat/completions", key: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || "gpt-5.4-nano", openai: true }
    : {
        url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        key: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
        openai: false,
      };
}

export const openaiConfigured = () => Boolean(provider().key);

/** Uma chamada ao Chat Completions. Lança erro com mensagem curta se falhar. */
export async function chatCompletion(opts: {
  messages: ChatMsg[];
  tools?: ToolDef[];
  maxTokens?: number;
}): Promise<{ content: string | null; tool_calls: ToolCall[] }> {
  const p = provider();
  const body = JSON.stringify({
    model: p.model,
    messages: opts.messages,
    ...(opts.tools?.length ? { tools: opts.tools } : {}),
    ...(p.openai ? { max_completion_tokens: opts.maxTokens ?? 1500 } : { max_tokens: opts.maxTokens ?? 1500 }),
  });

  // Sobrecarga momentânea (503/429/500) é comum: tenta até 3 vezes.
  let res!: Response;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      res = await fetch(p.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${p.key}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(18000),
        body,
      });
    } catch (e) {
      // Demorou demais (acontece de vez em quando): tenta de novo, que costuma responder rápido.
      if (attempt === 2) throw e;
      console.error("ia: tentativa", attempt + 1, "estourou o tempo");
      continue;
    }
    if (res.ok || ![429, 500, 502, 503, 504].includes(res.status)) break;
    const peek = await res.clone().text().catch(() => "");
    if (/insufficient_quota|credit_balance_exhausted/.test(peek)) break; // sem crédito não adianta repetir
    await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
  }
  if (!res.ok) {
    const raw = await res.json().catch(() => ({}));
    const err = Array.isArray(raw) ? raw[0] : raw;
    console.error("ia:", res.status, err?.error?.message || JSON.stringify(err).slice(0, 200));
    if (err?.error?.type === "insufficient_quota" || err?.error?.code === "credit_balance_exhausted") throw new Error("no_credit");
    throw new Error(res.status === 429 ? "rate_limit" : "openai_error");
  }
  const data = await res.json();
  const msg = data?.choices?.[0]?.message;
  return { content: msg?.content ?? null, tool_calls: msg?.tool_calls ?? [] };
}
