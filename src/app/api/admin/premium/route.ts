import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { readAdmin } from "@/lib/adminAuth";
import { getTenantById, setComplimentary } from "@/lib/tenantStore";

/** Dá ou remove o premium (cortesia) de um site. Só admin. */
export async function POST(request: Request) {
  const admin = await readAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  let b: { id?: unknown; grant?: unknown; note?: unknown } = {};
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida." }, { status: 400 });
  }
  const id = typeof b.id === "string" ? b.id : "";
  if (!/^[0-9a-f-]{36}$/i.test(id) || typeof b.grant !== "boolean") {
    return NextResponse.json({ ok: false, error: "Dados inválidos." }, { status: 400 });
  }
  const note =
    typeof b.note === "string" && b.note.trim()
      ? `${b.note.trim().slice(0, 140)} (por ${admin})`
      : `Concedido por ${admin}`;

  const before = await getTenantById(id);
  if (!before) return NextResponse.json({ ok: false, error: "Site não encontrado." }, { status: 404 });

  const updated = await setComplimentary(id, b.grant, b.grant ? note : null);
  if (!updated) return NextResponse.json({ ok: false, error: "Não foi possível alterar." }, { status: 400 });

  try {
    revalidatePath(`/${updated.slug}`);
    revalidatePath("/sitemap.xml");
  } catch {
    // ignora fora do contexto de render
  }
  console.log(`admin ${admin}: ${b.grant ? "premium ON" : "premium OFF"} ${updated.slug}`);
  return NextResponse.json({ ok: true, tenant: updated });
}
