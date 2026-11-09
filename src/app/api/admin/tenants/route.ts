import { NextResponse } from "next/server";
import { readAdmin } from "@/lib/adminAuth";
import { getTenantByToken, listAllTenantsForAdmin } from "@/lib/tenantStore";
import { readEditToken } from "@/lib/editAuth";
import { PLAN_PRICE_BRL } from "@/lib/mercadopago";

const NO_STORE = { "Cache-Control": "no-store" };

/** Lista de sites + resumo de faturamento estimado. Só admin. */
export async function GET() {
  const admin = await readAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401, headers: NO_STORE });

  const tenants = await listAllTenantsForAdmin();
  const editToken = await readEditToken();
  const hasSite = Boolean(editToken && (await getTenantByToken(editToken)));
  const paying = tenants.filter((t) => t.subscription_status === "active" && !t.complimentary).length;
  const premium = tenants.filter((t) => t.subscription_status === "active" && t.complimentary).length;
  const drafts = tenants.filter((t) => t.subscription_status === "draft").length;
  const inactive = tenants.filter((t) => ["past_due", "cancelled"].includes(t.subscription_status)).length;
  const nonComp = paying + drafts + inactive;

  return NextResponse.json(
    {
      ok: true,
      admin,
      hasSite,
      price: PLAN_PRICE_BRL,
      summary: {
        total: tenants.length,
        paying,
        premium,
        drafts,
        inactive,
        mrr: paying * PLAN_PRICE_BRL,
        arr: paying * PLAN_PRICE_BRL * 12,
        // Quantos dos sites criados (fora cortesias) chegaram a pagar.
        conversion: nonComp > 0 ? Math.round((paying / nonComp) * 1000) / 10 : 0,
      },
      tenants,
    },
    { headers: NO_STORE }
  );
}
