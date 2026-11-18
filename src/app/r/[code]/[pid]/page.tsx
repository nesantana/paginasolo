import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContractByCode } from "@/lib/financeStore";
import { quotesAvailable } from "@/lib/quoteStore";
import { getTenantById } from "@/lib/tenantStore";
import { PrintReceipt } from "@/components/PrintButton2";
import { formatBRL, formatDateBR, prettyCity } from "@/lib/quoteUi";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Recibo", robots: { index: false, follow: false }, referrer: "no-referrer" };

type Props = { params: Promise<{ code: string; pid: string }> };

export default async function ReceiptPage({ params }: Props) {
  const { code, pid } = await params;
  if (!quotesAvailable()) notFound();
  const contract = await getContractByCode(code).catch(() => null);
  if (!contract) notFound();
  const pay = contract.payments.find((p) => p.id === pid);
  if (!pay || pay.status !== "paid") notFound();
  const tenant = await getTenantById(contract.tenant_id);
  if (!tenant) notFound();

  const color = /^#[0-9a-f]{6}$/i.test(tenant.primary_color) ? tenant.primary_color : "#3b82f6";
  const paidOn = (pay.paid_at || "").slice(0, 10);
  const number = pay.id.slice(0, 8).toUpperCase();

  return (
    <main className="min-h-dvh bg-slate-100 px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto max-w-xl space-y-4">
        <article className="rounded-3xl bg-white p-7 shadow-xl shadow-slate-900/10 print:rounded-none print:shadow-none">
          <header className="flex items-start justify-between gap-4 border-b-2 pb-5" style={{ borderColor: color }}>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Recibo</p>
              <h1 className="text-2xl font-extrabold text-slate-900">{tenant.business_name}</h1>
              <p className="text-sm text-slate-500">
                {tenant.category} · {prettyCity(tenant.city)}
                {tenant.owner_doc ? ` · ${tenant.owner_doc}` : ""}
              </p>
            </div>
            <p className="shrink-0 text-right text-xs text-slate-500">
              Nº {number}
              <br />
              {formatDateBR(paidOn)}
            </p>
          </header>

          <p className="mt-6 text-center text-sm text-slate-500">Valor recebido</p>
          <p className="text-center text-5xl font-extrabold" style={{ color }}>
            {formatBRL(pay.amount_cents)}
          </p>

          <p className="mt-6 leading-relaxed text-slate-800">
            Recebi de <strong>{contract.customer_name}</strong> a quantia de <strong>{formatBRL(pay.amount_cents)}</strong>,
            referente a <strong>{pay.label}</strong> do serviço <strong>{contract.title}</strong>
            {pay.paid_method ? `, pago via ${pay.paid_method}` : ""}, em {formatDateBR(paidOn)}.
          </p>
          <p className="mt-3 text-sm text-slate-600">
            Valor total do serviço: {formatBRL(contract.total_cents)}. Dou plena e geral quitação do valor acima.
          </p>

          <div className="mt-10 border-t border-slate-300 pt-2 text-center text-sm text-slate-600">
            {tenant.business_name}
          </div>
        </article>
        <PrintReceipt />
        <p className="text-center text-xs text-slate-400 print:hidden">Recibo gerado com autonomIA</p>
      </div>
    </main>
  );
}
