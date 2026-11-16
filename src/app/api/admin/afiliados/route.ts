import { NextResponse } from "next/server";
import { readAdmin } from "@/lib/adminAuth";
import {
  affiliatesAvailable,
  createInfluencer,
  listAffiliatesAdmin,
  markPayout,
  updateAffiliate,
  validateAffiliatePatch,
  DEFAULT_RATE,
  MIN_PAYOUT,
  type AffiliatePatch,
} from "@/lib/affiliateStore";

const NO_STORE = { "Cache-Control": "no-store" };
const UUID = /^[0-9a-f-]{36}$/i;

/** Afiliados e saques. Só admin. */
export async function GET() {
  const admin = await readAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401, headers: NO_STORE });
  if (!affiliatesAvailable()) {
    return NextResponse.json({ ok: false, error: "Supabase não configurado." }, { status: 503, headers: NO_STORE });
  }
  return NextResponse.json(
    { ok: true, defaultRate: DEFAULT_RATE, minPayout: MIN_PAYOUT, ...(await listAffiliatesAdmin()) },
    { headers: NO_STORE }
  );
}

type Body = {
  action?: unknown;
  id?: unknown;
  email?: unknown;
  status?: unknown;
  note?: unknown;
  kind?: unknown;
  code?: unknown;
  rate?: unknown;
  max_payments?: unknown;
  active?: unknown;
};

/** Ações: update (taxa/limite/ativo/código), influencer (cria por e-mail), payout (pago/recusado). */
export async function POST(request: Request) {
  const admin = await readAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!affiliatesAvailable()) {
    return NextResponse.json({ ok: false, error: "Supabase não configurado." }, { status: 503 });
  }

  let b: Body = {};
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida." }, { status: 400 });
  }
  const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

  const patch = (): Partial<AffiliatePatch> => ({
    kind: b.kind as AffiliatePatch["kind"],
    code: typeof b.code === "string" ? b.code : "",
    rate: typeof b.rate === "number" ? b.rate : Number.NaN,
    max_payments:
      b.max_payments === null || b.max_payments === "" || b.max_payments === undefined
        ? null
        : Number(b.max_payments),
    active: b.active as boolean,
  });

  if (b.action === "update") {
    if (typeof b.id !== "string" || !UUID.test(b.id)) return fail("Afiliado inválido.");
    const p = patch();
    const invalid = validateAffiliatePatch(p);
    if (invalid) return fail(invalid);
    const error = await updateAffiliate(b.id, p as AffiliatePatch);
    if (error) return fail(error);
    console.log(`admin ${admin}: afiliado ${b.id} → ${p.rate}% / ${p.max_payments ?? "todos"} pagamentos`);
    return NextResponse.json({ ok: true });
  }

  if (b.action === "influencer") {
    if (typeof b.email !== "string" || !b.email.includes("@")) return fail("Informe o e-mail do site.");
    const p = { ...patch(), kind: "influencer" as const, active: true };
    const invalid = validateAffiliatePatch(p);
    if (invalid) return fail(invalid);
    const error = await createInfluencer(b.email, {
      code: p.code as string,
      rate: p.rate as number,
      max_payments: p.max_payments as number | null,
    });
    if (error) return fail(error);
    return NextResponse.json({ ok: true });
  }

  if (b.action === "payout") {
    if (typeof b.id !== "string" || !UUID.test(b.id)) return fail("Saque inválido.");
    if (b.status !== "pago" && b.status !== "recusado") return fail("Status inválido.");
    const note = typeof b.note === "string" && b.note.trim() ? b.note.trim().slice(0, 140) : null;
    const error = await markPayout(b.id, b.status, note);
    if (error) return fail(error);
    console.log(`admin ${admin}: saque ${b.id} ${b.status}`);
    return NextResponse.json({ ok: true });
  }

  return fail("Ação inválida.");
}
