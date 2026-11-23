import "server-only";

/** Áudio → texto em português. Tenta OpenAI primeiro (aceita webm/mp4) e usa o Gemini como reserva. */
export async function transcribeAudio(file: Blob, mime: string): Promise<string> {
  const errors: string[] = [];

  if (process.env.OPENAI_API_KEY) {
    try {
      const form = new FormData();
      const ext = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : mime.includes("wav") ? "wav" : "webm";
      form.append("file", file, `audio.${ext}`);
      form.append("model", process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe");
      form.append("language", "pt");
      form.append("prompt", "Autônomo brasileiro falando de orçamento, serviço, cliente, valor em reais, agenda e visita.");
      const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: form,
        signal: AbortSignal.timeout(40_000),
      });
      if (res.ok) {
        const d = (await res.json()) as { text?: string };
        if (d.text?.trim()) return d.text.trim();
        errors.push("openai: vazio");
      } else errors.push(`openai ${res.status}`);
    } catch (e) {
      errors.push(`openai: ${e instanceof Error ? e.message : "erro"}`);
    }
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      const data = Buffer.from(await file.arrayBuffer()).toString("base64");
      const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: "Transcreva este áudio em português do Brasil, exatamente como foi falado. Responda só com a transcrição. Se não houver fala, responda vazio." },
                { inline_data: { mime_type: mime.split(";")[0] || "audio/webm", data } },
              ],
            },
          ],
        }),
        signal: AbortSignal.timeout(40_000),
      });
      if (res.ok) {
        const d = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
        const t = d.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim();
        if (t) return t;
        errors.push("gemini: vazio");
      } else errors.push(`gemini ${res.status}`);
    } catch (e) {
      errors.push(`gemini: ${e instanceof Error ? e.message : "erro"}`);
    }
  }

  console.error("transcribe:", errors.join(" | ") || "sem chave");
  throw new Error(errors.length ? "failed" : "not_configured");
}
