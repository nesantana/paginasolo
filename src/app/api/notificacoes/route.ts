import { NextResponse } from "next/server";
import { readEditToken } from "@/lib/editAuth";
import { getTenantByToken } from "@/lib/tenantStore";
import { listNotifications, markNotificationsRead } from "@/lib/notify";

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

async function owner() {
  const token = await readEditToken();
  return token ? getTenantByToken(token) : null;
}

/** Sino do painel: últimas notificações + quantas não foram lidas. */
export async function GET() {
  const tenant = await owner();
  if (!tenant) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401, headers: NO_STORE });
  return NextResponse.json({ ok: true, ...(await listNotifications(tenant.id)) }, { headers: NO_STORE });
}

/** { id } marca uma como lida; sem id, marca todas. */
export async function POST(request: Request) {
  const tenant = await owner();
  if (!tenant) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401, headers: NO_STORE });
  let id: string | undefined;
  try {
    const b = await request.json();
    if (typeof b?.id === "string" && /^[0-9a-f-]{36}$/i.test(b.id)) id = b.id;
  } catch {
    // sem corpo = marcar todas
  }
  await markNotificationsRead(tenant.id, id);
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
