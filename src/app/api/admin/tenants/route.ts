import { NextResponse } from "next/server";
import { readAdmin } from "@/lib/adminAuth";
import { getTenantByToken, listAllTenantsForAdmin } from "@/lib/tenantStore";
import { readEditToken } from "@/lib/editAuth";
import { PLAN_PRICES, monthlyValue } from "@/lib/plans";

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
  const payingRows = tenants.filter((t) => t.subscription_status === "active" && !t.complimentary);
  const annual = payingRows.filter((t) => t.plan === "annual").length;
  // assinaturas antigas (sem plano gravado) eram mensais
  const monthly = paying - annual;
  const mrr = Math.round(payingRows.reduce((s, t) => s + monthlyValue(t.plan), 0) * 100) / 100;

  return NextResponse.json(
    {
      ok: true,
      admin,
      hasSite,
      prices: PLAN_PRICES,
      summary: {
        total: tenants.length,
        paying,
        premium,
        drafts,
        inactive,
        monthly,
        annual,
        mrr,
        arr: Math.round(mrr * 12 * 100) / 100,
        // Quantos dos sites criados (fora cortesias) chegaram a pagar.
        conversion: nonComp > 0 ? Math.round((paying / nonComp) * 1000) / 10 : 0,
      },
      tenants,
    },
    { headers: NO_STORE }
  );
}
