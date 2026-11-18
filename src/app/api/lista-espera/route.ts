import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "@/lib/supabase/admin";
import { normalizeCustomerPhone } from "@/lib/validate";

const db = () => getAdminClient() as unknown as SupabaseClient;

/** Cadastro público na lista de espera do lançamento. */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida." }, { status: 400 });
  }
  // Campo-armadilha: robôs preenchem, pessoas não veem.
  if (typeof body.site === "string" && body.site.trim()) return NextResponse.json({ ok: true });

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const profession = typeof body.profession === "string" ? body.profession.trim().slice(0, 60) : "";
  const phone = normalizeCustomerPhone(body.phone);
  if (!name) return NextResponse.json({ ok: false, error: "Informe seu nome." }, { status: 400 });
  if (!phone) return NextResponse.json({ ok: false, error: "WhatsApp inválido. Use DDD + número." }, { status: 400 });

  try {
    const { error } = await db()
      .from("waitlist")
      .upsert({ name, phone, profession: profession || null, source: "site" }, { onConflict: "phone", ignoreDuplicates: true });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("lista-espera:", e);
    return NextResponse.json({ ok: false, error: "Não foi possível salvar agora. Tente de novo." }, { status: 500 });
  }
}
