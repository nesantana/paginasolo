import { NextResponse } from "next/server";
import { getTenantByToken, setAsaasSubscription } from "@/lib/tenantStore";
import { readEditToken } from "@/lib/editAuth";
import { createAnnualCheckout, isMercadoPagoConfigured } from "@/lib/mercadopago";
import { createMonthlyPixSubscription, isAsaasConfigured } from "@/lib/asaas";
import { isPlanId } from "@/lib/plans";
import { clientIp, rateLimit } from "@/lib/rateLimit";

/**
 * Abre o pagamento do plano escolhido:
 *  - monthly: assinatura Pix no Asaas (link da cobrança com QR Code);
 *  - annual: cartão em até 12x no Mercado Pago (Checkout Pro).
 * O plano só é liberado pelo webhook, depois que o pagamento é confirmado na API do provedor.
 */
export async function POST(request: Request) {
  if (!rateLimit(`checkout:${clientIp(request)}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "Muitas tentativas." }, { status: 429 });
  }

  let plan: unknown;
  try {
    plan = (await request.json())?.plan;
  } catch {
    // sem corpo
  }
  if (!isPlanId(plan)) {
    return NextResponse.json({ ok: false, error: "Escolha um plano." }, { status: 400 });
  }

  const token = await readEditToken();
  const tenant = token ? await getTenantByToken(token) : null;
  if (!tenant) {
    return NextResponse.json({ ok: false, error: "Sessão não encontrada." }, { status: 401 });
  }
  if (tenant.subscription_status === "active") {
    return NextResponse.json({ ok: true, alreadyActive: true, slug: tenant.slug });
  }
  if (!tenant.payer_email) {
    return NextResponse.json({ ok: false, error: "E-mail do pagador ausente." }, { status: 400 });
  }

  const notConfigured = NextResponse.json(
    { ok: false, error: "Pagamento ainda não está configurado." },
    { status: 503 }
  );

  try {
    if (plan === "annual") {
      if (!isMercadoPagoConfigured()) return notConfigured;
      const pref = await createAnnualCheckout({
        tenantId: tenant.id,
        slug: tenant.slug,
        businessName: tenant.business_name,
        payerEmail: tenant.payer_email,
      });
      if (!pref.init_point) throw new Error("Mercado Pago não retornou init_point");
      return NextResponse.json({ ok: true, url: pref.init_point });
    }

    if (!isAsaasConfigured()) return notConfigured;
    const sub = await createMonthlyPixSubscription({
      tenantId: tenant.id,
      businessName: tenant.business_name,
      email: tenant.payer_email,
      customerId: tenant.asaas_customer_id,
      subscriptionId: tenant.asaas_subscription_id,
    });
    await setAsaasSubscription(tenant.id, sub.customerId, sub.subscriptionId);
    return NextResponse.json({ ok: true, url: sub.checkoutUrl });
  } catch (e) {
    console.error("checkout:", e);
    return NextResponse.json(
      { ok: false, error: "Não conseguimos abrir o pagamento agora. Tente de novo." },
      { status: 502 }
    );
  }
}
