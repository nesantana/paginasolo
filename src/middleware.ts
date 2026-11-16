import { NextResponse, type NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "appautonomia.ia.br";

/**
 * Middleware Multitenant (Edge Runtime):
 * 1) `app.dominio.com` -> reescreve para `/dashboard`
 * 2) `[slug].dominio.com` -> reescreve para `/[slug]`
 * 3) Domínio raiz (`dominio.com` ou `localhost:3004`) -> permite acesso direto a `/`, `/dashboard` e `/[slug]`
 */
async function handle(request: NextRequest) {
  const url = request.nextUrl.clone();
  const { pathname } = url;

  // Ignora rotas internas de API, estáticos e assets
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const hostHeader = request.headers.get("host") || "";
  const hostname = hostHeader.split(":")[0].toLowerCase();

  // Caso 1: Subdomínio do Painel (`app.dominio.com` ou `app.localhost`)
  if (hostname === `app.${ROOT_DOMAIN}` || hostname === "app.localhost") {
    if (!pathname.startsWith("/dashboard")) {
      url.pathname = `/dashboard${pathname === "/" ? "" : pathname}`;
      const rewriteRes = NextResponse.rewrite(url);
      return updateSupabaseSession(request, rewriteRes);
    }
  }

  // Caso 2: Subdomínio de Tenant (`[slug].dominio.com` ou `[slug].localhost`)
  const isRootOrLocal =
    hostname === ROOT_DOMAIN ||
    hostname === `www.${ROOT_DOMAIN}` ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".vercel.app");

  if (!isRootOrLocal) {
    let tenantSlug = hostname;
    if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
      tenantSlug = hostname.replace(`.${ROOT_DOMAIN}`, "");
    } else if (hostname.endsWith(".localhost")) {
      tenantSlug = hostname.replace(".localhost", "");
    }

    if (tenantSlug && tenantSlug !== "www" && tenantSlug !== "app") {
      url.pathname = `/${tenantSlug}${pathname === "/" ? "" : pathname}`;
      const rewriteRes = NextResponse.rewrite(url);
      return updateSupabaseSession(request, rewriteRes);
    }
  }

  const defaultRes = NextResponse.next();
  return updateSupabaseSession(request, defaultRes);
}

/** Link de indicação (?ref=codigo): guarda o código por 30 dias para ligar o cadastro a quem indicou. */
export async function middleware(request: NextRequest) {
  const res = await handle(request);
  const ref = request.nextUrl.searchParams.get("ref")?.trim().toLowerCase();
  if (ref && /^[a-z0-9-]{3,30}$/.test(ref)) {
    res.cookies.set("ps_ref", ref, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
