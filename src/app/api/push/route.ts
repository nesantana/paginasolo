import { NextResponse } from "next/server";
import { readEditToken } from "@/lib/editAuth";
import { getTenantByToken } from "@/lib/tenantStore";
import { removePushSubscription, savePushSubscription } from "@/lib/notify";

const NO_STORE = { "Cache-Control": "no-store" };

async function owner() {
  const token = await readEditToken();
  return token ? getTenantByToken(token) : null;
}

const isHttps = (v: unknown): v is string =>
  typeof v === "string" && v.length < 800 && /^https:\/\//.test(v);
const isKey = (v: unknown): v is string =>
  typeof v === "string" && v.length >= 10 && v.length < 200 && /^[A-Za-z0-9_-]+=*$/.test(v);

/** Registra este aparelho para receber notificações do navegador. */
export async function POST(request: Request) {
  const tenant = await owner();
  if (!tenant) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401, headers: NO_STORE });
  let b: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } = {};
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida." }, { status: 400 });
  }
  if (!isHttps(b.endpoint) || !isKey(b.keys?.p256dh) || !isKey(b.keys?.auth)) {
    return NextResponse.json({ ok: false, error: "Inscrição inválida." }, { status: 400 });
  }
  const ok = await savePushSubscription(
    tenant.id,
    { endpoint: b.endpoint, p256dh: b.keys.p256dh as string, auth: b.keys.auth as string },
    request.headers.get("user-agent")
  );
  return NextResponse.json({ ok }, { status: ok ? 200 : 503, headers: NO_STORE });
}

/** Desliga as notificações deste aparelho. */
export async function DELETE(request: Request) {
  const tenant = await owner();
  if (!tenant) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401, headers: NO_STORE });
  let endpoint = "";
  try {
    const b = await request.json();
    endpoint = typeof b?.endpoint === "string" ? b.endpoint : "";
  } catch {
    // sem corpo
  }
  if (endpoint) await removePushSubscription(tenant.id, endpoint);
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
