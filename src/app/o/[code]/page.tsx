import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getQuoteByCode, hasPaidPlan, quotesAvailable } from "@/lib/quoteStore";
import { getTenantById } from "@/lib/tenantStore";
import { QuoteActions } from "@/components/QuoteActions";
import { formatBRL, formatDateBR, todayISO } from "@/lib/quoteUi";

// Cada abertura precisa ver o estado atual (aceito, validade...).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Seu orçamento",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Props = { params: Promise<{ code: string }> };

export default async function QuotePage({ params }: Props) {
  const { code } = await params;
  if (!quotesAvailable()) notFound();

  const quote = await getQuoteByCode(code).catch((e) => {
    console.error("orcamento page:", e);
    return null;
  });
  if (!quote) notFound();
  const tenant = await getTenantById(quote.tenant_id);
  if (!tenant) notFound();

  if (!hasPaidPlan(tenant)) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-5 text-center">
        <div className="max-w-sm space-y-2">
          <p className="text-xl font-extrabold text-slate-900">Orçamento indisponível</p>
          <p className="text-slate-600">
            Fale direto com {tenant.business_name} pelo WhatsApp para receber um novo.
          </p>
        </div>
      </main>
    );
  }

  const color = /^#[0-9a-f]{6}$/i.test(tenant.primary_color) ? tenant.primary_color : "#3b82f6";
  const expired = Boolean(quote.valid_until && quote.valid_until < todayISO());
  const declined = quote.status === "declined";
  const closed = expired || declined;
  const createdBR = formatDateBR(quote.created_at.slice(0, 10));

  return (
    <main className="min-h-dvh bg-slate-100 pb-12">
      <header
        className="px-5 pb-16 pt-10 text-white"
        style={{ background: `linear-gradient(135deg, #0a0e17 0%, #0a0e17 45%, ${color} 140%)` }}
      >
        <div className="mx-auto max-w-xl">
          <p className="text-sm font-bold uppercase tracking-wider text-white/70">Orçamento</p>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight">{tenant.business_name}</h1>
          <p className="mt-1 text-white/80">
            {tenant.category} · {tenant.city}
          </p>
        </div>
      </header>

      <div className="mx-auto -mt-10 max-w-xl space-y-4 px-4">
        <section className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-900/10">
          <p className="text-sm text-slate-500">Preparado para</p>
          <p className="text-xl font-extrabold text-slate-900">{quote.customer_name}</p>
          <p className="mt-1 text-xs text-slate-500">
            Emitido em {createdBR}
            {quote.valid_until && !expired && ` · válido até ${formatDateBR(quote.valid_until)}`}
          </p>
          {expired && (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">
              Este orçamento venceu em {formatDateBR(quote.valid_until)}. Chame no WhatsApp para
              atualizar.
            </p>
          )}
          {declined && (
            <p className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600">
              Este orçamento foi encerrado.
            </p>
          )}

          <ul className="mt-5 divide-y divide-slate-100">
            {quote.items.map((it, i) => (
              <li key={i} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900">{it.title}</p>
                  {it.qty > 1 && (
                    <p className="text-sm text-slate-500">
                      {it.qty} × {it.price_cents > 0 ? formatBRL(it.price_cents) : "a combinar"}
                    </p>
                  )}
                </div>
                <p className="shrink-0 font-extrabold text-slate-900">
                  {it.price_cents > 0 ? formatBRL(it.price_cents * it.qty) : "A combinar"}
                </p>
              </li>
            ))}
          </ul>

          {quote.total_cents > 0 && (
            <div className="mt-2 flex items-center justify-between border-t-2 border-slate-900 pt-4">
              <p className="text-lg font-extrabold text-slate-900">Total</p>
              <p className="text-3xl font-extrabold" style={{ color }}>
                {formatBRL(quote.total_cents)}
              </p>
            </div>
          )}

          {quote.notes && (
            <p className="mt-5 whitespace-pre-line rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
              {quote.notes}
            </p>
          )}
        </section>

        <QuoteActions
          code={quote.code}
          whatsapp={tenant.whatsapp_number}
          customer={quote.customer_name}
          business={tenant.business_name}
          totalCents={quote.total_cents}
          accepted={quote.status === "accepted"}
          closed={closed}
          color={color}
        />

        <p className="pt-2 text-center text-xs text-slate-400">Orçamento gerado com autonomIA</p>
      </div>
    </main>
  );
}
