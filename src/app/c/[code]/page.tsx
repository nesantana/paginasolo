import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getContractByCode } from "@/lib/financeStore";
import { hasPaidPlan, quotesAvailable } from "@/lib/quoteStore";
import { getTenantById } from "@/lib/tenantStore";
import { ContractClient, type PublicPayment } from "@/components/ContractClient";
import { contractClauses } from "@/lib/contractUi";
import { buildPixPayload } from "@/lib/pix";
import { formatBRL, formatDateBR } from "@/lib/quoteUi";

// Cada abertura precisa ver o estado atual (aceito, pago...).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Seu contrato",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Props = { params: Promise<{ code: string }> };

export default async function ContractPage({ params }: Props) {
  const { code } = await params;
  if (!quotesAvailable()) notFound();

  const contract = await getContractByCode(code).catch((e) => {
    console.error("contrato page:", e);
    return null;
  });
  if (!contract) notFound();
  const tenant = await getTenantById(contract.tenant_id);
  if (!tenant) notFound();

  if (!hasPaidPlan(tenant)) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-5 text-center">
        <div className="max-w-sm space-y-2">
          <p className="text-xl font-extrabold text-slate-900">Contrato indisponível</p>
          <p className="text-slate-600">Fale direto com {tenant.business_name} pelo WhatsApp.</p>
        </div>
      </main>
    );
  }

  const color = /^#[0-9a-f]{6}$/i.test(tenant.primary_color) ? tenant.primary_color : "#3b82f6";
  const cancelled = contract.status === "cancelled";
  const closed = cancelled || contract.status === "completed";

  const payments: PublicPayment[] = await Promise.all(
    contract.payments.map(async (p) => {
      const payable = tenant.pix_key && (p.status === "pending" || p.status === "informed");
      const pixCode = payable
        ? buildPixPayload({
            key: tenant.pix_key!,
            name: tenant.business_name,
            city: tenant.city,
            amountCents: p.amount_cents,
          })
        : null;
      const qrSvg = pixCode
        ? await QRCode.toString(pixCode, { type: "svg", margin: 0, errorCorrectionLevel: "M" })
        : null;
      return {
        id: p.id,
        label: p.label,
        amount_cents: p.amount_cents,
        due_kind: p.due_kind,
        due_date: p.due_date,
        status: p.status,
        paid_at: p.paid_at,
        pixCode,
        qrSvg,
      };
    })
  );

  const clauses = contractClauses({
    contract,
    business: tenant.business_name,
    ownerDoc: tenant.owner_doc,
    city: tenant.city,
    payments: contract.payments,
  });

  return (
    <main className="min-h-dvh bg-slate-100 pb-12 print:bg-white">
      <header
        className="px-5 pb-16 pt-10 text-white print:hidden"
        style={{ background: `linear-gradient(135deg, #0a0e17 0%, #0a0e17 45%, ${color} 140%)` }}
      >
        <div className="mx-auto max-w-xl">
          <p className="text-sm font-bold uppercase tracking-wider text-white/70">Contrato</p>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight">{tenant.business_name}</h1>
          <p className="mt-1 text-white/80">
            {tenant.category} · {tenant.city}
          </p>
        </div>
      </header>

      <div className="mx-auto -mt-10 max-w-xl space-y-4 px-4 print:mt-0 print:max-w-none">
        <section className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-900/10 print:shadow-none">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Contrato de prestação de serviço</p>
          <h2 className="mt-1 text-xl font-extrabold text-slate-900">{contract.title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            Para {contract.customer_name} · emitido em {formatDateBR(contract.created_at.slice(0, 10))}
          </p>
          {cancelled && (
            <p className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600">
              Este contrato foi cancelado.
            </p>
          )}
          <p className="mt-4 flex items-center justify-between border-y-2 border-slate-900 py-3">
            <span className="text-lg font-extrabold text-slate-900">Valor total</span>
            <span className="text-2xl font-extrabold" style={{ color }}>
              {formatBRL(contract.total_cents)}
            </span>
          </p>

          <div className="mt-5 space-y-4">
            {clauses.map((c) => (
              <div key={c.title}>
                <h3 className="text-sm font-extrabold text-slate-900">{c.title}</h3>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">{c.text}</p>
              </div>
            ))}
          </div>
        </section>

        <ContractClient
          code={contract.code}
          customer={contract.customer_name}
          business={tenant.business_name}
          whatsapp={tenant.whatsapp_number}
          color={color}
          closed={closed}
          signedName={contract.signed_name}
          signedAt={contract.signed_at}
          payments={payments}
          hasPix={Boolean(tenant.pix_key)}
        />

        <p className="pt-2 text-center text-xs text-slate-400">Contrato gerado com autonomIA</p>
      </div>
    </main>
  );
}
