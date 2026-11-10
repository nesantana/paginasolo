import { NextResponse } from "next/server";
import { listContracts } from "@/lib/financeStore";
import { listQuotes } from "@/lib/quoteStore";
import { requirePaidOwner, NO_STORE } from "@/lib/ownerAuth";

/** Tela Financeiro: Pix cadastrado, contratos com parcelas e orçamentos aceitos (para gerar contrato). */
export async function GET() {
  const auth = await requirePaidOwner();
  if ("res" in auth) return auth.res;
  try {
    const [contracts, quotes] = await Promise.all([
      listContracts(auth.tenant.id),
      listQuotes(auth.tenant.id),
    ]);
    const used = new Set(contracts.map((c) => c.quote_id).filter(Boolean));
    return NextResponse.json(
      {
        ok: true,
        pix: {
          pix_key: auth.tenant.pix_key,
          pix_key_type: auth.tenant.pix_key_type,
          owner_doc: auth.tenant.owner_doc,
        },
        contracts,
        acceptedQuotes: quotes.filter((q) => q.status === "accepted" && !used.has(q.id)),
      },
      { headers: NO_STORE }
    );
  } catch (e) {
    console.error("financeiro GET:", e);
    return NextResponse.json({ ok: false, error: "Falha ao carregar." }, { status: 500 });
  }
}
