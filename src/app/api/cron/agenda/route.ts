import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { listTenantsForDigest } from "@/lib/tenantStore";
import { sendDigestFor } from "@/lib/digest";
import { requestOrigin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = request.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Chamado todo dia pelo agendador da Vercel (vercel.json). Para cada dono com plano ativo,
 * manda o e-mail com os serviços e cobranças do dia, uma vez por dia.
 */
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET não configurado." }, { status: 503 });
  }
  if (!authorized(request)) return NextResponse.json({ ok: false }, { status: 401 });

  const origin = requestOrigin(request);
  const counts: Record<string, number> = {};
  const tenants = await listTenantsForDigest();
  for (const t of tenants) {
    let key: string;
    try {
      const out = await sendDigestFor(t, { origin });
      key = typeof out === "string" ? out : out.ok ? "sent" : out.reason;
    } catch (e) {
      console.error("cron agenda:", t.id, e);
      key = "error";
    }
    counts[key] = (counts[key] || 0) + 1;
  }
  return NextResponse.json({ ok: true, tenants: tenants.length, ...counts });
}
