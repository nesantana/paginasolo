import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readAdmin } from "@/lib/adminAuth";
import { getAdminClient } from "@/lib/supabase/admin";

const NO_STORE = { "Cache-Control": "no-store" };
const db = () => getAdminClient() as unknown as SupabaseClient;

/** Lista de espera do lançamento. Só admin. */
export async function GET() {
  const admin = await readAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401, headers: NO_STORE });
  const { data, error } = await db()
    .from("waitlist")
    .select("id,name,phone,profession,created_at")
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) return NextResponse.json({ ok: false, error: "Falha ao carregar." }, { status: 500, headers: NO_STORE });
  return NextResponse.json({ ok: true, items: data || [] }, { headers: NO_STORE });
}

export async function DELETE(request: Request) {
  const admin = await readAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401, headers: NO_STORE });
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ ok: false, error: "Inválido." }, { status: 400, headers: NO_STORE });
  const { error } = await db().from("waitlist").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: "Não foi possível apagar." }, { status: 500, headers: NO_STORE });
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
