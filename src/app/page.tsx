import Link from "next/link";
import { listPublishedTenants } from "@/lib/tenantStore";
import { Reveal } from "@/components/Reveal";
import { BrandLogo } from "@/components/BrandLogo";
import {
  ArrowRight,
  BarChart3,
  Bell,
  CalendarCheck,
  CalendarClock,
  Check,
  FileText,
  Link2,
  Clock,
  HelpCircle,
  Image as ImageIcon,
  QrCode,
  Star,
  Tag,
  MapPin,
  MessageCircle,
  MessageSquare,
  Rocket,
  Scissors,
  Search,
  Sparkles,
  Stethoscope,
  Wrench,
  Car,
  Store,
  Hammer,
  Utensils,
  Zap,
} from "lucide-react";

export const revalidate = 300;

const NICHES = [
  { icon: Wrench, label: "Ar-condicionado" },
  { icon: Scissors, label: "Salões e barbearias" },
  { icon: Stethoscope, label: "Clínicas e dentistas" },
  { icon: Car, label: "Oficinas e auto center" },
  { icon: Hammer, label: "Eletricistas e obras" },
  { icon: Store, label: "Lojas e assistências" },
  { icon: Utensils, label: "Restaurantes" },
];

const STEPS = [
  {
    icon: MessageSquare,
    t: "Converse",
    d: "O assistente pergunta nome, serviços, cidade e WhatsApp.",
  },
  {
    icon: Sparkles,
    t: "Veja pronto",
    d: "A IA escreve os textos e monta o site. Prévia grátis.",
  },
  {
    icon: Rocket,
    t: "Publique",
    d: "Assine e entre no ar, já otimizado para o Google.",
  },
];

const DIFERENCIAIS = [
  {
    icon: QrCode,
    t: "Cartaz com QR Code",
    d: "Imprima um cartaz pronto para a vitrine ou o balcão. O cliente aponta o celular e cai no seu site ou no seu WhatsApp.",
    glow: "bg-[#3b82f6]/30",
  },
  {
    icon: ImageIcon,
    t: "Galeria de fotos",
    d: "Mostre seus trabalhos com até 6 fotos. Quem vê o resultado confia mais e chama mais.",
    glow: "bg-sky-500/30",
  },
  {
    icon: Star,
    t: "Depoimentos e avaliações",
    d: "Coloque o que seus clientes dizem e um botão para avaliar você no Google.",
    glow: "bg-yellow-400/25",
  },
  {
    icon: HelpCircle,
    t: "Perguntas frequentes",
    d: "Já vem com respostas prontas para as dúvidas mais comuns. Você edita como quiser e ainda ajuda no Google.",
    glow: "bg-emerald-500/25",
  },
  {
    icon: Tag,
    t: "Promoção em destaque",
    d: "Uma faixa de oferta no topo do site, como “10% off na primeira visita”. Troque em segundos.",
    glow: "bg-[#8b5cf6]/30",
  },
  {
    icon: FileText,
    t: "Orçamento por link",
    d: "Escolha os serviços, digite o nome e o WhatsApp do cliente e envie um orçamento bonito em 1 toque. Você vê quando ele abriu e quando aceitou.",
    glow: "bg-[#3b82f6]/30",
  },
  {
    icon: CalendarClock,
    t: "Follow-up que não deixa cliente esfriar",
    d: "Marque quando quer chamar de novo (amanhã, 7 dias...). No dia, o painel mostra quem você precisa chamar, com a mensagem pronta.",
    glow: "bg-[#8b5cf6]/30",
  },
  {
    icon: Link2,
    t: "Página de links para o Instagram",
    d: "Um único link na bio com WhatsApp, site, mapa, avaliações e o que mais você quiser. Pronto, sem montar nada.",
    glow: "bg-sky-500/30",
  },
  {
    icon: CalendarCheck,
    t: "Resumo semanal no WhatsApp",
    d: "Receba os números da semana com um toque: visitas, cliques no WhatsApp e ligações.",
    glow: "bg-[#25D366]/25",
  },
];

export default async function PaginaSoloHome() {
  const tenants = (await listPublishedTenants()).slice(0, 6);

  return (
    <div className="min-h-screen bg-[#0a0e17] text-white overflow-x-clip">
      {/* ===== HERO ===== */}
      <section className="relative isolate">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="grid-bg absolute inset-0" />
          <div className="animate-blob absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-[#3b82f6]/35 blur-[110px]" />
          <div
            className="animate-blob absolute top-40 -right-24 h-[26rem] w-[26rem] rounded-full bg-[#8b5cf6]/25 blur-[110px]"
            style={{ animationDelay: "-6s" }}
          />
          <div
            className="animate-blob absolute bottom-0 left-1/3 h-[22rem] w-[22rem] rounded-full bg-sky-500/20 blur-[110px]"
            style={{ animationDelay: "-12s" }}
          />
        </div>

        <header className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5">
          <Link href="/" aria-label="Meu Site Novo">
            <BrandLogo size={40} className="text-2xl" />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/entrar"
              className="rounded-full px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:text-white"
            >
              Entrar
            </Link>
            <Link
              href="/criar"
              className="glass rounded-full px-5 py-2.5 text-sm font-bold transition hover:bg-white/15"
            >
              Criar meu site
            </Link>
          </div>
        </header>

        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-24 pt-10 lg:grid-cols-2 lg:pb-32 lg:pt-16">
          <div className="text-center lg:text-left">
            <span
              className="animate-fade-up glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold text-[#a5f3fc]"
              style={{ animationDelay: "0ms" }}
            >
              <Zap className="h-3.5 w-3.5" />
              Sem programador. Sem designer.
            </span>

            <h1
              className="animate-fade-up mt-6 text-[2.6rem] font-extrabold leading-[1.04] tracking-tight sm:text-6xl lg:text-[4.2rem]"
              style={{ animationDelay: "120ms" }}
            >
              Seu negócio no Google e no{" "}
              <span className="text-gradient">WhatsApp do cliente</span> em 10
              minutos.
            </h1>

            <p
              className="animate-fade-up mx-auto mt-6 max-w-xl text-lg text-slate-300 lg:mx-0"
              style={{ animationDelay: "240ms" }}
            >
              Responda algumas perguntas e receba um site profissional, feito
              para gerar pedidos de orçamento. Por menos de uma pizza por mês.
            </p>

            <div
              className="animate-fade-up mt-9 flex flex-col items-center gap-4 sm:flex-row lg:justify-start justify-center"
              style={{ animationDelay: "360ms" }}
            >
              <Link
                href="/criar"
                className="btn-shine group inline-flex w-full items-center justify-center gap-2 rounded-2xl px-8 py-4 text-base font-extrabold shadow-2xl shadow-[#3b82f6]/30 transition hover:scale-[1.03] sm:w-auto"
              >
                Criar meu site grátis
                <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
              </Link>
              <Link
                href="/climatizacao-pantanal"
                className="text-sm font-semibold text-slate-300 underline underline-offset-4 hover:text-white"
              >
                Ver site de exemplo
              </Link>
            </div>

            <ul
              className="animate-fade-up mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-400 lg:justify-start"
              style={{ animationDelay: "480ms" }}
            >
              {["Prévia grátis", "R$ 37/mês", "Sem fidelidade"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-400" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Celular + cards flutuantes */}
          <div className="relative mx-auto h-[31rem] w-full max-w-lg sm:h-[34rem]">
            <div className="animate-float absolute left-1/2 top-0 w-[17rem] -translate-x-1/2 rounded-[2.4rem] border border-white/20 bg-[#0f172a] p-3 shadow-2xl shadow-black/60">
              <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-white/20" />
              <div className="overflow-hidden rounded-[1.7rem] bg-white text-slate-900">
                <div className="bg-gradient-to-br from-[#06b6d4] to-[#8b5cf6] p-5 pb-8 text-white">
                  <div className="flex items-center gap-2 text-[11px] font-bold opacity-90">
                    <MapPin className="h-3 w-3" /> Campo Grande - MS
                  </div>
                  <p className="mt-3 text-lg font-extrabold leading-tight">
                    Pantanal Climatização
                  </p>
                  <p className="mt-1 text-xs opacity-90">
                    Instalação e manutenção com garantia
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold">
                    <Tag className="h-3 w-3" /> 10% off na 1ª visita
                  </span>
                </div>
                <div className="-mt-4 space-y-2 px-4 pb-4">
                  <div className="rounded-xl bg-white p-3 text-xs shadow-lg">
                    <p className="font-bold">Instalação de Split</p>
                    <p className="text-slate-500">Com garantia</p>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-white p-3 text-xs shadow-lg">
                    <div>
                      <p className="font-bold">Limpeza completa</p>
                      <p className="text-slate-500">Elimina fungos</p>
                    </div>
                    <span className="font-extrabold text-emerald-600">R$ 160</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      "from-sky-300 to-sky-500",
                      "from-amber-200 to-orange-400",
                      "from-emerald-300 to-teal-500",
                    ].map((g) => (
                      <div
                        key={g}
                        className={`flex h-12 items-center justify-center rounded-lg bg-gradient-to-br ${g}`}
                      >
                        <ImageIcon className="h-4 w-4 text-white/80" />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-0.5 py-0.5">
                    {[0, 1, 2, 3, 4].map((s) => (
                      <Star key={s} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    ))}
                    <span className="ml-1.5 text-[10px] font-bold text-slate-500">
                      avaliações no Google
                    </span>
                  </div>
                  <div className="animate-pulse-ring flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-xs font-extrabold text-white">
                    <MessageCircle className="h-4 w-4" /> Pedir orçamento
                  </div>
                </div>
              </div>
            </div>

            <div
              className="animate-pop-in absolute inset-x-0 bottom-2 flex justify-center sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-28 sm:justify-start"
              style={{ animationDelay: "900ms" }}
            >
              <div className="animate-float-slow flex items-center gap-3 rounded-2xl border border-white/15 bg-[#0f172a] px-4 py-3 shadow-2xl shadow-black/50">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20">
                  <Bell className="h-4 w-4 text-emerald-400" />
                </span>
                <div className="text-xs">
                  <p className="font-bold">Novo pedido de orçamento</p>
                  <p className="text-slate-400">pelo WhatsApp · agora</p>
                </div>
              </div>
            </div>

            <div
              className="animate-pop-in absolute right-0 top-72 hidden sm:block"
              style={{ animationDelay: "1300ms" }}
            >
              <div className="animate-float flex items-center gap-3 rounded-2xl border border-white/15 bg-[#0f172a] px-4 py-3 shadow-2xl shadow-black/50">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3b82f6]/20">
                  <Search className="h-4 w-4 text-[#67e8f9]" />
                </span>
                <div className="text-xs">
                  <p className="font-bold">Achou você no Google</p>
                  <p className="text-slate-400">ar-condicionado perto de mim</p>
                </div>
              </div>
            </div>

            <div
              className="animate-pop-in absolute right-0 top-10 hidden sm:block"
              style={{ animationDelay: "2100ms" }}
            >
              <div className="animate-float-slow flex items-center gap-3 rounded-2xl border border-white/15 bg-[#0f172a] px-4 py-3 shadow-2xl shadow-black/50">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white">
                  <QrCode className="h-6 w-6 text-slate-900" />
                </span>
                <div className="text-xs">
                  <p className="font-bold">Cartaz com QR Code</p>
                  <p className="text-slate-400">pronto para imprimir</p>
                </div>
              </div>
            </div>

            <div
              className="animate-pop-in absolute right-2 bottom-6 hidden sm:block"
              style={{ animationDelay: "2500ms" }}
            >
              <div className="animate-float flex items-center gap-3 rounded-2xl border border-white/15 bg-[#0f172a] px-4 py-3 shadow-2xl shadow-black/50">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-400/20">
                  <CalendarCheck className="h-4 w-4 text-yellow-300" />
                </span>
                <div className="text-xs">
                  <p className="font-bold">Resumo da semana</p>
                  <p className="text-slate-400">42 cliques no WhatsApp</p>
                </div>
              </div>
            </div>

            <div
              className="animate-pop-in absolute left-2 bottom-6 hidden sm:block"
              style={{ animationDelay: "1700ms" }}
            >
              <div className="animate-float-slow flex items-center gap-3 rounded-2xl border border-white/15 bg-[#0f172a] px-4 py-3 shadow-2xl shadow-black/50">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500/20">
                  <BarChart3 className="h-4 w-4 text-sky-400" />
                </span>
                <div className="text-xs">
                  <p className="font-bold">Visitas e cliques</p>
                  <p className="text-slate-400">no seu painel</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FAIXA DE NICHOS ===== */}
      <section className="border-y border-white/10 bg-white/[0.03] py-5">
        <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
          <div className="animate-marquee flex w-max gap-4">
            {[...NICHES, ...NICHES].map((n, i) => {
              const Icon = n.icon;
              return (
                <span
                  key={i}
                  className="glass flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-slate-200"
                >
                  <Icon className="h-4 w-4 text-[#67e8f9]" />
                  {n.label}
                </span>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== COMO FUNCIONA ===== */}
      <section className="mx-auto max-w-6xl px-5 py-24">
        <Reveal className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
            Do zero ao ar em <span className="text-gradient">3 passos</span>
          </h2>
        </Reveal>

        <div className="relative mt-16 grid gap-6 md:grid-cols-3">
          <div className="absolute left-[16%] right-[16%] top-10 hidden h-px bg-gradient-to-r from-transparent via-[#3b82f6]/60 to-transparent md:block" />
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal key={s.t} delay={i * 140}>
                <div className="glass group relative h-full rounded-3xl p-7 transition duration-300 hover:-translate-y-2 hover:border-[#3b82f6]/50">
                  <div className="btn-shine flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg shadow-[#3b82f6]/30">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="absolute right-6 top-5 text-5xl font-extrabold text-white/[0.06]">
                    {i + 1}
                  </span>
                  <h3 className="mt-6 text-xl font-extrabold">{s.t}</h3>
                  <p className="mt-2 text-slate-300">{s.d}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ===== BENEFÍCIOS ===== */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <Reveal className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
            Feito para <span className="text-gradient">vender</span>
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          <Reveal className="md:col-span-2">
            <div className="glass relative h-full overflow-hidden rounded-3xl p-8">
              <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[#3b82f6]/25 blur-3xl" />
              <Search className="h-8 w-8 text-[#67e8f9]" />
              <h3 className="mt-5 text-2xl font-extrabold">
                Apareça quando procurarem na sua cidade
              </h3>
              <p className="mt-2 max-w-md text-slate-300">
                SEO local pronto: título, descrição e dados do negócio
                estruturados para o Google te indicar.
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="relative h-full overflow-hidden rounded-3xl bg-gradient-to-br from-[#25D366] to-[#0e9f4f] p-8 text-zinc-950">
              <MessageCircle className="h-8 w-8" />
              <h3 className="mt-5 text-2xl font-extrabold">1 clique no WhatsApp</h3>
              <p className="mt-2 font-medium opacity-80">
                O cliente já chega dizendo qual serviço quer.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0}>
            <div className="glass h-full rounded-3xl p-8">
              <Clock className="h-8 w-8 text-sky-400" />
              <h3 className="mt-5 text-2xl font-extrabold">Abre em 1 segundo</h3>
              <p className="mt-2 text-slate-300">
                Página leve, rápida até no 4G.
              </p>
            </div>
          </Reveal>

          <Reveal delay={120} className="md:col-span-2">
            <div className="glass relative h-full overflow-hidden rounded-3xl p-8">
              <div className="absolute -bottom-12 right-0 h-48 w-48 rounded-full bg-sky-500/20 blur-3xl" />
              <BarChart3 className="h-8 w-8 text-[#67e8f9]" />
              <h3 className="mt-5 text-2xl font-extrabold">
                Veja quantos clientes chamaram
              </h3>
              <p className="mt-2 max-w-md text-slate-300">
                Visitas, cliques no WhatsApp e ligações em 3 números simples.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== DIFERENCIAIS ===== */}
      <section className="relative isolate mx-auto max-w-6xl px-5 pb-24">
        <div className="absolute left-1/2 top-10 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-[#8b5cf6]/15 blur-[110px]" />
        <Reveal className="text-center">
          <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold text-[#a5f3fc]">
            <Sparkles className="h-3.5 w-3.5" />
            Só o Meu Site Novo tem
          </span>
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-5xl">
            Mais que um site: uma{" "}
            <span className="text-gradient">máquina de clientes</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-300">
            Tudo incluso nos R$ 37/mês: do site ao orçamento que fecha a venda. Você mexe sozinho, direto do celular.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {DIFERENCIAIS.map((f, i) => {
            const Icon = f.icon;
            return (
              <Reveal key={f.t} delay={(i % 3) * 120}>
                <div className="glass group relative h-full overflow-hidden rounded-3xl p-7 transition duration-300 hover:-translate-y-2 hover:border-[#3b82f6]/50">
                  <div
                    className={`absolute -right-8 -top-8 h-28 w-28 rounded-full blur-3xl ${f.glow}`}
                  />
                  <span className="btn-shine flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg shadow-[#3b82f6]/30">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-5 text-xl font-extrabold">{f.t}</h3>
                  <p className="mt-2 text-slate-300">{f.d}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ===== PREÇO ===== */}
      <section className="mx-auto max-w-5xl px-5 pb-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] p-px">
            <div className="animate-spin-slow absolute inset-[-100%] bg-[conic-gradient(from_0deg,transparent_0_70%,#3b82f6_85%,#8b5cf6_100%)]" />
            <div className="relative grid items-center gap-8 rounded-[calc(2rem-1px)] bg-[#0f172a] p-8 sm:p-12 md:grid-cols-2">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-[#67e8f9]">
                  Plano único
                </p>
                <p className="mt-3 text-7xl font-extrabold tracking-tight">
                  R$ 37
                  <span className="text-2xl font-semibold text-slate-400">/mês</span>
                </p>
                <p className="mt-3 text-slate-300">
                  Se paga no primeiro serviço fechado.
                </p>
              </div>
              <div>
                <ul className="space-y-3">
                  {[
                    "Prévia grátis antes de pagar",
                    "Hospedagem rápida inclusa",
                    "WhatsApp, ligação e mapa",
                    "Painel para editar quando quiser",
                    "Cartaz com QR, fotos, FAQ e depoimentos",
                    "Orçamentos, follow-up e página de links",
                    "Cancele quando quiser",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20">
                        <Check className="h-4 w-4 text-emerald-400" />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/criar"
                  className="btn-shine mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-8 py-4 font-extrabold shadow-xl shadow-[#3b82f6]/30 transition hover:scale-[1.02]"
                >
                  Criar meu site grátis
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ===== SITES NO AR ===== */}
      {tenants.length > 0 && (
        <section className="mx-auto max-w-5xl px-5 pb-24">
          <Reveal>
            <h2 className="text-center text-sm font-bold uppercase tracking-wider text-slate-400">
              Sites no ar
            </h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {tenants.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/${t.slug}`}
                    className="glass group flex items-center justify-between rounded-2xl px-5 py-4 transition hover:-translate-y-1 hover:border-[#3b82f6]/50"
                  >
                    <span>
                      <span className="block font-bold">{t.business_name}</span>
                      <span className="block text-sm text-slate-400">
                        {t.category} · {t.city}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-[#67e8f9] transition group-hover:translate-x-1" />
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
        </section>
      )}

      {/* ===== CTA FINAL ===== */}
      <section className="relative isolate overflow-hidden border-t border-white/10 py-24 text-center">
        <div className="animate-blob absolute left-1/2 top-1/2 -z-10 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3b82f6]/30 blur-[100px]" />
        <Reveal>
          <h2 className="mx-auto max-w-2xl px-5 text-3xl font-extrabold tracking-tight sm:text-5xl">
            Seu concorrente já está no Google.{" "}
            <span className="text-gradient">E você?</span>
          </h2>
          <Link
            href="/criar"
            className="btn-shine mt-9 inline-flex items-center gap-2 rounded-2xl px-9 py-4 text-lg font-extrabold shadow-2xl shadow-[#3b82f6]/30 transition hover:scale-[1.04]"
          >
            Criar meu site grátis
            <ArrowRight className="h-5 w-5" />
          </Link>
        </Reveal>
      </section>

      <footer className="border-t border-white/10 py-6 text-center text-sm text-slate-500">
        Meu Site Novo ·{" "}
        <a
          href="https://wa.me/5567981513750?text=Ol%C3%A1!%20Quero%20saber%20mais%20sobre%20o%20Meu%20Site%20Novo."
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-white"
        >
          Dúvidas? WhatsApp
        </a>
      </footer>
    </div>
  );
}
