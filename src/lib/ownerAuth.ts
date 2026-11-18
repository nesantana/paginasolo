import "server-only";
import { NextResponse } from "next/server";
import { readEditToken } from "@/lib/editAuth";
import { getTenantByToken } from "@/lib/tenantStore";
import { quotesAvailable } from "@/lib/quoteStore";
import type { TenantRow } from "@/types/database.types";

export const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

/** Dono autenticado pelo cookie de edição. As ferramentas são abertas a todos; o limite de clientes grátis fica em freeLimit. */
export async function requirePaidOwner(): Promise<
  { tenant: TenantRow } | { res: NextResponse }
> {
  const token = await readEditToken();
  const tenant = token ? await getTenantByToken(token) : null;
  if (!tenant) {
    return {
      res: NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401, headers: NO_STORE }
      ),
    };
  }
  if (!quotesAvailable()) {
    return {
      res: NextResponse.json(
        { ok: false, error: "Recurso indisponível neste ambiente." },
        { status: 503, headers: NO_STORE }
      ),
    };
  }
  return { tenant };
}
