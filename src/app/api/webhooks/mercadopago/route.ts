import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSubscription } from "@/lib/mercadopago";
import { applySubscriptionStatus, getTenantById } from "@/lib/tenantStore";

/**
 * Webhook do Mercado Pago (tópico "subscription_preapproval").
 * Segurança: do corpo só usamos o id; o status é consultado direto na API do MP
 * com nosso token, e só alteramos o tenant cujo mp_preapproval_id bate com esse id.
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

  if (!id || !topic?.includes("preapproval")) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const sub = await getSubscription(String(id));
    const tenantId = sub.external_reference;
    if (!tenantId) return NextResponse.json({ ok: true, ignored: true });

    const tenant = await getTenantById(tenantId);
    if (!tenant || tenant.mp_preapproval_id !== sub.id) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const updated = await applySubscriptionStatus(tenant.id, sub.status);
    try {
      revalidatePath(`/${tenant.slug}`);
      revalidatePath("/sitemap.xml");
      revalidatePath("/");
    } catch {
      // ignora fora do contexto de render
    }
    return NextResponse.json({ ok: true, status: updated?.subscription_status });
  } catch (e) {
    console.error("webhook mp:", e);
    // 500 faz o Mercado Pago tentar de novo mais tarde
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
