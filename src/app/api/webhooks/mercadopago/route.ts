import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getPayment, getSubscription } from "@/lib/mercadopago";
import {
  activatePlan,
  applySubscriptionStatus,
  getTenantById,
  revokePlan,
} from "@/lib/tenantStore";
import { cancelCommission, recordCommission } from "@/lib/affiliateStore";
import { PLAN_PRICES } from "@/lib/plans";
import { notify } from "@/lib/notify";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
 * Webhook do Mercado Pago.
 *  - "payment": plano anual no cartão (external_reference = "<tenantId>|annual");
 *  - "subscription_preapproval": assinaturas mensais antigas (anteriores ao Asaas), ainda honradas.
 * Segurança: do corpo só usamos o id; o status é consultado direto na API do MP com nosso token,
 * e só alteramos o tenant que a própria API do MP aponta.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  let body: { type?: string; topic?: string; data?: { id?: string } } = {};
  try {
    body = await request.json();
  } catch {
    // MP também envia notificações só com query string
  }

  const topic =
    body.type || body.topic || url.searchParams.get("type") || url.searchParams.get("topic");
  const id =
    body.data?.id || url.searchParams.get("data.id") || url.searchParams.get("id");

  if (!id || !topic) return NextResponse.json({ ok: true, ignored: true });

  try {
    if (topic === "payment") return await handlePayment(String(id));
    if (topic.includes("preapproval")) return await handlePreapproval(String(id));
    return NextResponse.json({ ok: true, ignored: true });
  } catch (e) {
    console.error("webhook mp:", e);
    // 500 faz o Mercado Pago tentar de novo mais tarde
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

async function handlePayment(paymentId: string) {
  if (!/^\d+$/.test(paymentId)) return NextResponse.json({ ok: true, ignored: true });
  const pay = await getPayment(paymentId);

  const [tenantId, plan] = String(pay.external_reference ?? "").split("|");
  if (!UUID.test(tenantId ?? "") || plan !== "annual") {
    return NextResponse.json({ ok: true, ignored: true });
  }
  const tenant = await getTenantById(tenantId);
  if (!tenant) return NextResponse.json({ ok: true, ignored: true });
  const ref = `mp:${pay.id}`;

  if (pay.status === "approved") {
    if (pay.currency_id !== "BRL" || Number(pay.transaction_amount) < PLAN_PRICES.annual) {
      console.error("MP valor inesperado", pay.id, pay.transaction_amount);
      return NextResponse.json({ ok: true, ignored: true });
    }
    const out = await activatePlan(tenant.id, "annual", ref);
    if (!out) return NextResponse.json({ ok: false }, { status: 500 });
    // comissão de indicação sobre o valor do plano (idempotente por pagamento)
    await recordCommission(tenant.id, Number(pay.transaction_amount), ref);
    if (out.applied) {
      await notify(tenant.id, {
        kind: "plan",
        title: "Ferramentas liberadas! 🎉",
        body: "Plano anual confirmado. Agenda, orçamentos, contratos e Pix já estão no seu painel.",
        url: "/dashboard",
      });
    }
    refresh(tenant.slug);
    return NextResponse.json({ ok: true, status: out.tenant.subscription_status });
  }

  if (pay.status === "refunded" || pay.status === "charged_back") {
    await cancelCommission(ref);
    if (tenant.last_payment_ref === ref) {
      await revokePlan(tenant.id);
      refresh(tenant.slug);
    }
  }
  return NextResponse.json({ ok: true });
}

async function handlePreapproval(id: string) {
  const sub = await getSubscription(id);
  const tenantId = sub.external_reference;
  if (!tenantId) return NextResponse.json({ ok: true, ignored: true });

  const tenant = await getTenantById(tenantId);
  if (!tenant || tenant.mp_preapproval_id !== sub.id) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const updated = await applySubscriptionStatus(tenant.id, sub.status);
  refresh(tenant.slug);
  return NextResponse.json({ ok: true, status: updated?.subscription_status });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
