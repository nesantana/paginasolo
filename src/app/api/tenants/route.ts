import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  getDashboardSummary,
  getTenantByToken,
  updateTenantContent,
} from "@/lib/tenantStore";
import { readEditToken } from "@/lib/editAuth";
import { parseTenantInput } from "@/lib/validate";

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

async function currentTenant() {
  const token = await readEditToken();
  return token ? getTenantByToken(token) : null;
}

/** Painel do dono: devolve apenas o site do dono do cookie. */
export async function GET() {
  const tenant = await currentTenant();
  if (!tenant) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401, headers: NO_STORE }
    );
  }
  return NextResponse.json(
    { ok: true, ...(await getDashboardSummary(tenant)) },
    { headers: NO_STORE }
  );
}

/** Edição do conteúdo. Slug, status e pagamento não são editáveis por aqui. */
export async function POST(request: Request) {
  const tenant = await currentTenant();
  if (!tenant) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401, headers: NO_STORE }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = parseTenantInput({
    ...(body as object),
    payer_email: tenant.payer_email,
  });
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const saved = await updateTenantContent(tenant.id, parsed.data);
  if (!saved) {
    return NextResponse.json({ ok: false, error: "Falha ao salvar." }, { status: 500 });
  }
  try {
    revalidatePath(`/${saved.slug}`);
  } catch {
    // ignora fora do contexto de render
  }

  return NextResponse.json(
    { ok: true, ...(await getDashboardSummary(saved)) },
    { headers: NO_STORE }
  );
}
