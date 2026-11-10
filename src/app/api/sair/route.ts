import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { EDIT_COOKIE } from "@/lib/editAuth";
import { ADMIN_COOKIE } from "@/lib/adminAuth";
import { HINT_COOKIE } from "@/lib/sessionHint";

/** Sai da conta neste aparelho: apaga o acesso do dono, do admin e o marcador. */
export async function POST() {
  const jar = await cookies();
  jar.delete(EDIT_COOKIE);
  jar.delete(ADMIN_COOKIE);
  jar.delete(HINT_COOKIE);
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
