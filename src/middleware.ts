import { NextResponse, type NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "appautonomia.ia.br";

/**
 * Middleware Multitenant (Edge Runtime):
 * 1) `app.dominio.com` -> reescreve para `/dashboard`
 * 2) `[slug].dominio.com` -> reescreve para `/[slug]`
 * 3) Domínio raiz (`dominio.com` ou `localhost:3004`) -> permite acesso direto a `/`, `/dashboard` e `/[slug]`
 */
export async function middleware(request: NextRequest) {
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

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
