import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getTenantByToken } from "@/lib/tenantStore";
import { EDIT_COOKIE, editCookieOptions } from "@/lib/editAuth";

/** Link mágico do painel: valida o token, grava o cookie e manda para /dashboard. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("t") || "";
  const tenant = /^[A-Za-z0-9_-]{20,64}$/.test(token)
    ? await getTenantByToken(token)
    : null;

  const res = NextResponse.redirect(new URL(tenant ? "/dashboard" : "/criar", url.origin));
  res.headers.set("Referrer-Policy", "no-referrer");
  if (tenant) {
    (await cookies()).set(EDIT_COOKIE, token, editCookieOptions);
  }
  return res;
}
