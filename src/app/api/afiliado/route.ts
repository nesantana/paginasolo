import { NextResponse } from "next/server";
import { readEditToken } from "@/lib/editAuth";
import { getTenantByToken } from "@/lib/tenantStore";
import {
  affiliatesAvailable,
  getMyAffiliate,
  requestAffiliatePayout,
  saveAffiliatePix,
} from "@/lib/affiliateStore";
import { clientIp, rateLimit } from "@/lib/rateLimit";

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

async function owner() {
  const token = await readEditToken();
  return token ? getTenantByToken(token) : null;
}

/** Painel de indicações do dono do site. */
export async function GET() {
  const tenant = await owner();
  if (!tenant) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401, headers: NO_STORE });
  if (!affiliatesAvailable()) {
    return NextResponse.json({ ok: false, error: "Indisponível neste ambiente." }, { status: 503, headers: NO_STORE });
  }
  return NextResponse.json({ ok: true, affiliate: await getMyAffiliate(tenant) }, { headers: NO_STORE });
}

/** Ações: { action: "pix", key, type } ou { action: "payout" }. */
export async function POST(request: Request) {
  const tenant = await owner();
  if (!tenant) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401, headers: NO_STORE });
  if (!affiliatesAvailable()) {
    return NextResponse.json({ ok: false, error: "Indisponível neste ambiente." }, { status: 503, headers: NO_STORE });
  }
  if (!rateLimit(`afiliado:${clientIp(request)}`, 30, 60 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "Muitas tentativas." }, { status: 429, headers: NO_STORE });
  }

  let b: { action?: unknown; key?: unknown; type?: unknown } = {};
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida." }, { status: 400, headers: NO_STORE });
  }

  let error: string | null;
  if (b.action === "pix") {
    error = await saveAffiliatePix(
      tenant,
      typeof b.key === "string" ? b.key : "",
      typeof b.type === "string" ? b.type : ""
    );
  } else if (b.action === "payout") {
    error = await requestAffiliatePayout(tenant);
  } else {
    return NextResponse.json({ ok: false, error: "Ação inválida." }, { status: 400, headers: NO_STORE });
  }
  if (error) return NextResponse.json({ ok: false, error }, { status: 400, headers: NO_STORE });
  return NextResponse.json({ ok: true, affiliate: await getMyAffiliate(tenant) }, { headers: NO_STORE });
}
