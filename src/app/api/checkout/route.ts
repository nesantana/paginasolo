import { NextResponse } from "next/server";
import { getTenantByToken, setPayerAndPreapproval } from "@/lib/tenantStore";
import { readEditToken } from "@/lib/editAuth";
import {
  createSubscription,
  isMercadoPagoConfigured,
  PLAN_PRICE_BRL,
} from "@/lib/mercadopago";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  if (!rateLimit(`checkout:${clientIp(request)}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "Muitas tentativas." }, { status: 429 });
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
  if (!isMercadoPagoConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Pagamento ainda não está configurado." },
      { status: 503 }
    );
  }

  try {
    const sub = await createSubscription({
      tenantId: tenant.id,
      slug: tenant.slug,
      businessName: tenant.business_name,
      payerEmail: tenant.payer_email,
    });
    if (!sub.init_point) throw new Error("Mercado Pago não retornou init_point");
    await setPayerAndPreapproval(tenant.id, tenant.payer_email, sub.id);
    return NextResponse.json({ ok: true, url: sub.init_point, price: PLAN_PRICE_BRL });
  } catch (e) {
    console.error("checkout:", e);
    return NextResponse.json(
      { ok: false, error: "Não conseguimos abrir o pagamento agora. Tente de novo." },
      { status: 502 }
    );
  }
}
