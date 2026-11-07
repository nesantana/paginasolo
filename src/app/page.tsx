import Link from "next/link";
import { listPublishedTenants } from "@/lib/tenantStore";
import { ArrowRight, Check } from "lucide-react";

export const revalidate = 300;

const STEPS = [
  { t: "Converse com o assistente", d: "Nome, serviços, cidade e WhatsApp. Leva poucos minutos." },
  { t: "Veja o site pronto", d: "A IA escreve os textos. Você confere antes de pagar." },
  { t: "Publique", d: "Assine e o site entra no ar, pronto para o Google." },
];

export default async function PaginaSoloHome() {
  const tenants = (await listPublishedTenants()).slice(0, 6);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="mx-auto max-w-5xl px-5 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-extrabold tracking-tight">
          Página<span className="text-[#FF6600]">Solo</span>
        </Link>
        <Link
          href="/criar"
          className="rounded-lg bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold px-4 py-2 transition-colors"
        >
          Criar meu site
        </Link>
      </header>

      <main>
        {/* Herói */}
        <section className="mx-auto max-w-3xl px-5 pt-14 pb-16 sm:pt-24 sm:pb-24 text-center">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05]">
            Seu site no ar em 10 minutos.
          </h1>
          <p className="mt-5 text-lg sm:text-xl text-slate-600">
            Para quem tem negócio local. Os clientes te acham no Google e chamam
            no WhatsApp.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/criar"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF6600] hover:bg-[#e65c00] text-white font-bold px-7 py-4 text-base transition-colors w-full sm:w-auto"
            >
              Criar meu site grátis
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/climatizacao-pantanal"
              className="text-base font-semibold text-slate-700 underline underline-offset-4 px-3 py-3"
            >
              Ver um exemplo
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Prévia grátis · R$ 37/mês só se você publicar · Cancele quando quiser
          </p>
        </section>

        {/* Como funciona */}
        <section className="bg-slate-50 border-y border-slate-200">
          <div className="mx-auto max-w-5xl px-5 py-14 sm:py-16">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-center">
              Como funciona
            </h2>
            <ol className="mt-10 grid gap-8 sm:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.t}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white text-sm font-bold">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 font-bold text-lg">{s.t}</h3>
                  <p className="mt-1 text-slate-600">{s.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Preço */}
        <section className="mx-auto max-w-md px-5 py-16 sm:py-20 text-center">
          <p className="text-6xl font-extrabold tracking-tight">
            R$ 37<span className="text-xl font-semibold text-slate-500">/mês</span>
          </p>
          <ul className="mt-6 space-y-2 text-left inline-block">
            {[
              "Hospedagem rápida inclusa",
              "Botão de WhatsApp e mapa",
              "Painel para editar quando quiser",
              "Relatório de visitas e cliques",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Link
              href="/criar"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF6600] hover:bg-[#e65c00] text-white font-bold px-7 py-4 transition-colors w-full"
            >
              Começar agora
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>

        {/* Exemplos */}
        {tenants.length > 0 && (
          <section className="mx-auto max-w-5xl px-5 pb-16">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Sites no ar
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {tenants.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/${t.slug}`}
                    className="flex items-center justify-between rounded-xl border border-slate-200 hover:border-slate-400 px-4 py-3 transition-colors"
                  >
                    <span>
                      <span className="block font-semibold">{t.business_name}</span>
                      <span className="block text-sm text-slate-500">
                        {t.category} · {t.city}
                      </span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">
        PáginaSolo · MSSolo, Campo Grande - MS ·{" "}
        <a
          href="https://wa.me/5567981513750?text=Ol%C3%A1!%20Quero%20saber%20mais%20sobre%20o%20P%C3%A1ginaSolo%20da%20MSSolo."
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4"
        >
          Dúvidas? WhatsApp
        </a>
      </footer>
    </div>
  );
}
