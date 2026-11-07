import { NextResponse } from "next/server";
import { deleteQuote, getQuoteForTenant, patchQuote, type QuotePatch } from "@/lib/quoteStore";
import { requirePaidOwner, NO_STORE } from "@/lib/ownerAuth";
import { parseIsoDate } from "@/lib/validate";
import type { QuoteStatus } from "@/types/database.types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES: QuoteStatus[] = ["draft", "sent", "viewed", "accepted", "declined"];

type Ctx = { params: Promise<{ id: string }> };

/**
 * Ações do dono sobre um orçamento. Corpo (todos opcionais):
 *  - status
 *  - mark_sent: true            → registra envio (draft → sent)
 *  - followup_at: "YYYY-MM-DD"  → (re)agenda o contato e reabre o follow-up
 *  - followup_done: true        → "já chamei", tira da lista de hoje
 *  - followup_note: texto
 */
export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requirePaidOwner();
  if ("res" in auth) return auth.res;
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ ok: false, error: "Orçamento inválido." }, { status: 400 });
  }

  let b: Record<string, unknown> = {};
  try {
    b = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida." }, { status: 400 });
  }

  const patch: QuotePatch = {};
  const now = new Date().toISOString();

  if (typeof b.status === "string") {
    if (!STATUSES.includes(b.status as QuoteStatus)) {
      return NextResponse.json({ ok: false, error: "Status inválido." }, { status: 400 });
    }
    patch.status = b.status as QuoteStatus;
    // fechou ou perdeu: não há mais o que cobrar
    if (patch.status === "accepted" || patch.status === "declined") {
      patch.followup_done_at = now;
    }
  }
  if (b.mark_sent === true) {
    patch.sent_at = now;
    if (!patch.status) patch.status = "sent";
  }
  if ("followup_at" in b) {
    if (b.followup_at === null) {
      patch.followup_at = null;
    } else {
      const d = parseIsoDate(b.followup_at);
      if (!d) {
        return NextResponse.json({ ok: false, error: "Data inválida." }, { status: 400 });
      }
      patch.followup_at = d;
      patch.followup_done_at = null;
    }
  }
  if (b.followup_done === true) patch.followup_done_at = now;
  if (typeof b.followup_note === "string") {
    patch.followup_note = b.followup_note.trim().slice(0, 300) || null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "Nada para atualizar." }, { status: 400 });
  }

  try {
    // "mark_sent" não pode rebaixar um orçamento já visto/decidido
    if (b.mark_sent === true && !("status" in b)) {
      const current = await getQuoteForTenant(auth.tenant.id, id);
      if (current && current.status !== "draft") delete patch.status;
    }
    const quote = await patchQuote(auth.tenant.id, id, patch);
    if (!quote) {
      return NextResponse.json({ ok: false, error: "Não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, quote }, { headers: NO_STORE });
  } catch (e) {
    console.error("orcamentos PATCH:", e);
    return NextResponse.json({ ok: false, error: "Não foi possível salvar." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await requirePaidOwner();
  if ("res" in auth) return auth.res;
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ ok: false, error: "Orçamento inválido." }, { status: 400 });
  }
  try {
    const ok = await deleteQuote(auth.tenant.id, id);
    return NextResponse.json({ ok }, { status: ok ? 200 : 404, headers: NO_STORE });
  } catch (e) {
    console.error("orcamentos DELETE:", e);
    return NextResponse.json({ ok: false, error: "Não foi possível apagar." }, { status: 500 });
  }
}
