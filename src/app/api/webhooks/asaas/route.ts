import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { timingSafeEqual } from "crypto";
import { getAsaasSubscription } from "@/lib/asaas";
import { activatePlan, getTenantById, revokePlan } from "@/lib/tenantStore";
import { cancelCommission, recordCommission } from "@/lib/affiliateStore";
import { PLAN_PRICES } from "@/lib/plans";
import { notify } from "@/lib/notify";

type AsaasEvent = {
  event?: string;
  payment?: { id?: string; value?: number; subscription?: string | null };
  subscription?: { id?: string; externalReference?: string | null };
};

const ok = () => NextResponse.json({ ok: true });

function tokenOk(received: string | null): boolean {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!expected || !received) return false; // sem token configurado, nada é aceito
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function refresh(slug: string) {
  try {
    revalidatePath(`/${slug}`);
    revalidatePath("/sitemap.xml");
    revalidatePath("/");
  } catch {
    // ignora fora do contexto de render
  }
}

/**
 * Webhook do Asaas (plano mensal por Pix).
 * Autenticação: cabeçalho asaas-access-token = ASAAS_WEBHOOK_TOKEN.
 * O dono do pagamento vem da assinatura consultada na API do Asaas (externalReference = id do site),
 * nunca do corpo recebido, e precisa bater com a assinatura gravada no site.
 */
export async function POST(request: Request) {
  if (!tokenOk(request.headers.get("asaas-access-token"))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let ev: AsaasEvent;
  try {
    ev = await request.json();
  } catch {
    return ok();
  }

  try {
    const type = ev.event || "";
    const paymentId = ev.payment?.id;
    const subId = ev.payment?.subscription || ev.subscription?.id || null;
    if (!subId) return ok();

    const sub = await getAsaasSubscription(subId);
    const tenantId = sub.externalReference;
    if (!tenantId) return ok();
    const tenant = await getTenantById(tenantId);
    if (!tenant || tenant.asaas_subscription_id !== sub.id) return ok();

    if ((type === "PAYMENT_RECEIVED" || type === "PAYMENT_CONFIRMED") && paymentId) {
      const value = Number(ev.payment?.value);
      if (!(value >= PLAN_PRICES.monthly)) {
        console.error("Asaas valor inesperado", paymentId, ev.payment?.value);
        return ok();
      }
      const ref = `asaas:${paymentId}`;
      // CONFIRMED e RECEIVED chegam para o mesmo pagamento: a referência garante uma aplicação só
      const out = await activatePlan(tenant.id, "monthly", ref);
      if (!out) return NextResponse.json({ ok: false }, { status: 500 });
      await recordCommission(tenant.id, value, ref);
      if (out.applied) {
        await notify(tenant.id, {
          kind: "plan",
          title: "Pagamento confirmado!",
          body: "Plano mensal ativo. Suas ferramentas estão liberadas.",
          url: "/dashboard",
        });
      }
      refresh(tenant.slug);
      return ok();
    }

    if (type === "PAYMENT_REFUNDED" || type === "PAYMENT_CHARGEBACK_REQUESTED") {
      if (paymentId) await cancelCommission(`asaas:${paymentId}`);
      if (paymentId && tenant.last_payment_ref === `asaas:${paymentId}`) {
        await revokePlan(tenant.id);
        refresh(tenant.slug);
      }
      return ok();
    }
    // PAYMENT_OVERDUE e cancelamento da assinatura: o acesso segue até plan_expires_at
    // (mensalidade paga + folga) e cai sozinho depois, sem precisar de ação aqui.
    return ok();
  } catch (e) {
    console.error("webhook asaas:", e);
    // 500 faz o Asaas tentar de novo
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET() {
  return ok();
}
