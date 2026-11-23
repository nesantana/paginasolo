import { NextResponse } from "next/server";
import { requirePaidOwner, NO_STORE } from "@/lib/ownerAuth";
import { rateLimit } from "@/lib/rateLimit";
import { transcribeAudio } from "@/lib/transcribe";

export const maxDuration = 60;
const MAX_BYTES = 6 * 1024 * 1024;

/** Recebe o áudio gravado no chat e devolve o texto. O áudio não é guardado. */
export async function POST(request: Request) {
  const auth = await requirePaidOwner();
  if ("res" in auth) return auth.res;
  if (!rateLimit(`ia-a:${auth.tenant.id}`, 30, 60 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "Muitos áudios em pouco tempo. Tente mais tarde." }, { status: 429, headers: NO_STORE });
  }

  let file: File | null = null;
  try {
    const f = (await request.formData()).get("audio");
    if (f instanceof File) file = f;
  } catch {
    // cai no erro abaixo
  }
  if (!file || file.size < 500) return NextResponse.json({ ok: false, error: "Não ouvi nada. Tente gravar de novo." }, { status: 400, headers: NO_STORE });
  if (file.size > MAX_BYTES) return NextResponse.json({ ok: false, error: "Áudio muito longo. Grave um pedaço menor." }, { status: 413, headers: NO_STORE });

  try {
    const text = await transcribeAudio(file, file.type || "audio/webm");
    return NextResponse.json({ ok: true, text: text.slice(0, 1000) }, { headers: NO_STORE });
  } catch (e) {
    const off = e instanceof Error && e.message === "not_configured";
    return NextResponse.json(
      { ok: false, error: off ? "O áudio ainda não está ligado. Escreva a mensagem." : "Não consegui entender o áudio. Tente de novo ou escreva." },
      { status: off ? 503 : 502, headers: NO_STORE }
    );
  }
}
