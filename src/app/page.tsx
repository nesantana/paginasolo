import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  FileText,
  Globe,
  Link2,
  MessageCircle,
  Wallet,
} from "lucide-react";
import { listPublishedTenants } from "@/lib/tenantStore";
import { AuthNav } from "@/components/AuthNav";
import { BrandLogo } from "@/components/BrandLogo";

export const revalidate = 300;

const WHO = [
  "Diarista", "Eletricista", "Pintor", "Ar-condicionado", "Gesseiro", "Encanador",
  "Marceneiro", "Mecânico", "Manicure e cabeleireira", "Barbeiro", "Fisioterapeuta", "Cozinheira e marmitas",
];

const STEPS = [
  { n: "1", t: "Responda algumas perguntas", d: "Nome, o que você faz, onde atende e seu WhatsApp. É como uma conversa." },
  { n: "2", t: "Seu site já está no ar", d: "A gente escreve os textos e publica. Grátis, sem cartão." },
  { n: "3", t: "Organize o trabalho", d: "Quer agenda, contrato e Pix? Libere as ferramentas por R$ 37/mês." },
];

const FREE = [
  "Site com botão de WhatsApp, ligação e mapa",
  "Aparece no Google",
  "5 visuais para escolher",
  "Painel para editar quando quiser",
  "Cartaz com QR Code para imprimir",
];

const TOOLS = [
  { icon: CalendarDays, t: "Agenda", d: "Marque o dia combinado e receba um e-mail de manhã com o que tem para fazer." },
  { icon: FileText, t: "Contrato simples", d: "Gere o contrato em 1 minuto e o cliente aceita pelo celular." },
  { icon: Wallet, t: "Pix e pagamentos", d: "Pagamento antes, depois ou parcelado. Veja o que já foi pago e o que falta." },
  { icon: MessageCircle, t: "Orçamento por link", d: "Envie pelo WhatsApp e seja lembrado de chamar o cliente de volta." },
  { icon: Link2, t: "Página de links", d: "Um link só para colocar no Instagram." },
];

export default async function Home() {
  const tenants = (await listPublishedTenants()).slice(0, 6);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <Link href="/" aria-label="Meu Site Novo">
            <BrandLogo size={32} className="text-xl" />
          </Link>
          <div className="flex items-center gap-2">
            <AuthNav className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" />
            <Link href="/criar" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
              Criar meu site
            </Link>
          </div>
        </div>
      </header>

      {/* PROMESSA */}
      <section className="mx-auto max-w-3xl px-5 pb-16 pt-14 text-center sm:pt-20">
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          Seu site no ar em 10 minutos. <span className="text-blue-600">De graça.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">
          Para quem trabalha por conta própria. O cliente te encontra no Google e te chama no WhatsApp.
          E, se quiser, você organiza agenda, contrato e Pix num lugar só.
        </p>
        <Link
          href="/criar"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-lg font-bold text-white hover:bg-blue-700"
        >
          Criar meu site grátis <ArrowRight className="h-5 w-5" />
        </Link>
        <ul className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
          {["Sem cartão", "Pronto em 10 minutos", "Sem fidelidade"].map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-600" /> {t}
            </li>
          ))}
        </ul>
      </section>

      {/* PARA QUEM */}
      <section className="border-y border-slate-200 bg-slate-50 px-5 py-10">
        <p className="text-center text-sm font-semibold uppercase tracking-wide text-slate-500">Feito para quem trabalha por conta própria</p>
        <ul className="mx-auto mt-5 flex max-w-3xl flex-wrap justify-center gap-2">
          {WHO.map((w) => (
            <li key={w} className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-700">
              {w}
            </li>
          ))}
        </ul>
      </section>

      {/* COMO FUNCIONA */}
      <section className="mx-auto max-w-5xl px-5 py-16">
        <h2 className="text-center text-3xl font-bold">Como funciona</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">{s.n}</span>
              <h3 className="mt-4 text-lg font-bold">{s.t}</h3>
              <p className="mt-1 text-slate-600">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* GRÁTIS x FERRAMENTAS */}
      <section className="border-y border-slate-200 bg-slate-50 px-5 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold">O site é grátis. As ferramentas, menos que uma pizza.</h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Globe className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-xl font-bold">Site</h3>
              <p className="text-3xl font-extrabold">Grátis</p>
              <ul className="mt-4 space-y-2">
                {FREE.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-slate-700">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/criar" className="mt-6 block rounded-xl border border-slate-300 py-3 text-center font-bold hover:bg-slate-50">
                Criar meu site grátis
              </Link>
            </div>

            <div className="rounded-2xl border-2 border-blue-600 bg-white p-6">
              <h3 className="text-xl font-bold">Ferramentas</h3>
              <p className="text-3xl font-extrabold">
                R$ 37<span className="text-lg font-semibold text-slate-500">/mês</span>
              </p>
              <p className="text-sm text-slate-500">Libere quando quiser. Cancele quando quiser.</p>
              <ul className="mt-5 space-y-4">
                {TOOLS.map((t) => (
                  <li key={t.t} className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                      <t.icon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block font-bold">{t.t}</span>
                      <span className="block text-sm text-slate-600">{t.d}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <Link href="/criar" className="mt-6 block rounded-xl bg-blue-600 py-3 text-center font-bold text-white hover:bg-blue-700">
                Começar grátis e liberar depois
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SITES NO AR */}
      {tenants.length > 0 && (
        <section className="mx-auto max-w-5xl px-5 py-14">
          <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-slate-500">Sites no ar</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {tenants.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/${t.slug}`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-5 py-4 hover:border-blue-400"
                >
                  <span>
                    <span className="block font-bold">{t.business_name}</span>
                    <span className="block text-sm text-slate-500">
                      {t.category} · {t.city}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* CHAMADA FINAL */}
      <section className="bg-blue-600 px-5 py-14 text-center text-white">
        <h2 className="text-3xl font-bold">Comece agora. Leva 10 minutos.</h2>
        <Link
          href="/criar"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-bold text-blue-700 hover:bg-blue-50"
        >
          Criar meu site grátis <ArrowRight className="h-5 w-5" />
        </Link>
      </section>

      <footer className="py-6 text-center text-sm text-slate-500">
        Meu Site Novo ·{" "}
        <a
          href="https://wa.me/5567981513750?text=Ol%C3%A1!%20Quero%20saber%20mais%20sobre%20o%20Meu%20Site%20Novo."
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-slate-900"
        >
          Dúvidas? WhatsApp
        </a>
      </footer>
    </div>
  );
}
