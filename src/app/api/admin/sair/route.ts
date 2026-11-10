import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE } from "@/lib/adminAuth";
import { HINT_COOKIE } from "@/lib/sessionHint";

export async function POST() {
  (await cookies()).delete(ADMIN_COOKIE);
  (await cookies()).delete(HINT_COOKIE);
  return NextResponse.json({ ok: true });
}
