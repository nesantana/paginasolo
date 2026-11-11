import Link from "next/link";
import { listPublishedTenants } from "@/lib/tenantStore";
import { Reveal } from "@/components/Reveal";
import { AuthNav } from "@/components/AuthNav";
import { BrandLogo } from "@/components/BrandLogo";
import {
  ArrowRight,
  Bell,
  CalendarClock,
  CalendarDays,
  Check,
  Clock,
  FileText,
  Globe,
  Hammer,
  Link2,
  Mail,
  MessageCircle,
  MessageSquare,
  Paintbrush,
  QrCode,
  Rocket,
  Scissors,
  Sparkles,
  Wallet,
  Wrench,
  Zap,
} from "lucide-react";

export const revalidate = 300;

const NICHES = [
  { icon: Sparkles, label: "Diaristas" },
  { icon: Zap, label: "Eletricistas" },
  { icon: Paintbrush, label: "Pintores" },
  { icon: Wrench, label: "Ar-condicionado" },
  { icon: Hammer, label: "Mestres de obras" },
  { icon: Hammer, label: "Gesseiros e pedreiros" },
  { icon: Wrench, label: "Encanadores" },
  { icon: Hammer, label: "Marceneiros" },
  { icon: Scissors, label: "Cabeleireiras e barbeiros" },
];

const STEPS = [
  {
    icon: MessageSquare,
    t: "Conte o que você faz",
    d: "Uma conversa rápida: nome, serviços, cidade e WhatsApp. Seu site profissional já fica pronto.",
  },
  {
    icon: Sparkles,
    t: "Peça para a IA",
    d: "Escreva como no WhatsApp: \"orçamento para o Carlos, instalação de ar, R$ 450, 50/50\". Ela monta o orçamento, o contrato e marca o dia. Você só confirma.",
  },
  {
    icon: Wallet,
    t: "Receba por Pix",
    d: "Cobre antes, depois ou parcelado, com QR Code. Veja quem já pagou e quem falta.",
  },
];

const FERRAMENTAS = [
  {
    icon: Sparkles,
    t: "Assistente com IA",
    d: "Peça por mensagem: orçamento, contrato, agenda. Pergunte \"o que tenho amanhã?\" ou \"quanto ganhei este mês?\" e ele responde.",
    glow: "bg-[#8b5cf6]/40",
  },
  {
    icon: CalendarDays,
    t: "Agenda com aviso por e-mail",
    d: "Marque o dia combinado com o cliente. De manhã, você recebe um e-mail com o que tem para fazer hoje.",
    glow: "bg-[#3b82f6]/30",
  },
  {
    icon: FileText,
    t: "Contrato simples",
    d: "Gere o contrato em 1 minuto. O cliente lê e aceita pelo celular, sem imprimir nada.",
    glow: "bg-[#8b5cf6]/30",
  },
  {
    icon: Wallet,
    t: "Pix antes e depois",
    d: "Entrada, saldo na entrega ou parcelado. Cada parcela vai com QR Code e Pix copia e cola.",
    glow: "bg-[#25D366]/25",
  },
  {
    icon: MessageCircle,
    t: "Orçamento por link",
    d: "Escolha os serviços e envie pelo WhatsApp. Você vê quando o cliente abriu e quando aceitou.",
    glow: "bg-sky-500/30",
  },
  {
    icon: CalendarClock,
    t: "Lembrete para chamar de volta",
    d: "Marque quando quer retomar o contato. No dia, o painel mostra quem chamar, com a mensagem pronta.",
    glow: "bg-[#8b5cf6]/30",
  },
  {
    icon: Globe,
    t: "Site profissional no Google",
    d: "Seu site com WhatsApp, mapa e serviços, feito para o cliente da sua cidade te encontrar.",
    glow: "bg-sky-500/30",
  },
  {
    icon: Link2,
    t: "Página de links para o Instagram",
    d: "Um único link na bio com WhatsApp, site, mapa e o que mais você quiser.",
    glow: "bg-[#3b82f6]/30",
  },
  {
    icon: QrCode,
    t: "Cartaz com QR Code",
    d: "Imprima e cole na vitrine, no carro ou no uniforme. O cliente aponta o celular e te chama.",
    glow: "bg-yellow-400/25",
  },
];

export default async function Home() {
  const tenants = (await listPublishedTenants()).slice(0, 6);

  return (
    <div className="min-h-screen overflow-x-clip bg-[#0a0e17] text-white">
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
            <AuthNav className="rounded-full px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:text-white" />
            <Link
              href="/criar"
              className="glass rounded-full px-5 py-2.5 text-sm font-bold transition hover:bg-white/15"
            >
              Começar agora
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
              Eletricista, diarista, pedreiro, pintor e autônomos
            </span>

            <h1
              className="animate-fade-up mt-6 text-[2.6rem] font-extrabold leading-[1.04] tracking-tight sm:text-6xl lg:text-[4.2rem]"
              style={{ animationDelay: "120ms" }}
            >
              Autônomo? <span className="text-gradient">Resolvo o seu problema em 10 minutos.</span>
            </h1>

            <p
              className="animate-fade-up mx-auto mt-6 max-w-xl text-lg text-slate-300 lg:mx-0"
              style={{ animationDelay: "240ms" }}
            >
              Fale com a IA como falaria com um colega e ela faz a papelada: monta o orçamento, gera o contrato,
              marca o dia na agenda e cobra por Pix. Você só confirma e vai trabalhar.
            </p>

            <div
              className="animate-fade-up mt-9 flex flex-col items-center gap-4 sm:flex-row lg:justify-start justify-center"
              style={{ animationDelay: "360ms" }}
            >
              <Link
                href="/criar"
                className="btn-shine group inline-flex w-full items-center justify-center gap-2 rounded-2xl px-8 py-4 text-base font-extrabold shadow-2xl shadow-[#3b82f6]/30 transition hover:scale-[1.03] sm:w-auto"
              >
                Começar agora
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
              {["Pronto em 10 minutos", "R$ 37/mês", "Sem fidelidade"].map((t) => (
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
                    <CalendarDays className="h-3 w-3" /> Hoje
                  </div>
                  <p className="mt-3 text-lg font-extrabold leading-tight">2 serviços marcados</p>
                  <p className="mt-1 text-xs opacity-90">e 1 pagamento para receber</p>
                  <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold">
                    <Mail className="h-3 w-3" /> aviso enviado às 6h
                  </span>
                </div>
                <div className="-mt-4 space-y-2 px-4 pb-4">
                  <div className="flex items-center justify-between rounded-xl bg-white p-3 text-xs shadow-lg">
                    <div>
                      <p className="font-bold">Troca de chuveiro</p>
                      <p className="text-slate-500">Maria · 8h</p>
                    </div>
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">agendado</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-white p-3 text-xs shadow-lg">
                    <div>
                      <p className="font-bold">Pintura da sala</p>
                      <p className="text-slate-500">João · 14h</p>
                    </div>
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">agendado</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <p className="font-bold">Contrato da Ana</p>
                      <span className="font-extrabold text-emerald-600">R$ 150 pago</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-slate-200">
                      <div className="h-full w-1/2 rounded-full bg-emerald-500" />
                    </div>
                    <p className="mt-1.5 text-slate-500">Falta R$ 150 na entrega</p>
                  </div>
                  <div className="animate-pulse-ring flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-xs font-extrabold text-white">
                    <MessageCircle className="h-4 w-4" /> Cobrar por Pix
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
                  <Wallet className="h-4 w-4 text-emerald-400" />
                </span>
                <div className="text-xs">
                  <p className="font-bold">Pix recebido: R$ 150</p>
                  <p className="text-slate-400">contrato da Ana · agora</p>
                </div>
              </div>
            </div>

            <div
              className="animate-pop-in absolute right-0 top-72 hidden sm:block"
              style={{ animationDelay: "1300ms" }}
            >
              <div className="animate-float flex items-center gap-3 rounded-2xl border border-white/15 bg-[#0f172a] px-4 py-3 shadow-2xl shadow-black/50">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3b82f6]/20">
                  <FileText className="h-4 w-4 text-[#67e8f9]" />
                </span>
                <div className="text-xs">
                  <p className="font-bold">Contrato aceito</p>
                  <p className="text-slate-400">pelo celular do cliente</p>
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
                  <p className="font-bold">Pix com QR Code</p>
                  <p className="text-slate-400">valor certo, na hora</p>
                </div>
              </div>
            </div>

            <div
              className="animate-pop-in absolute right-2 bottom-6 hidden sm:block"
              style={{ animationDelay: "2500ms" }}
            >
              <div className="animate-float flex items-center gap-3 rounded-2xl border border-white/15 bg-[#0f172a] px-4 py-3 shadow-2xl shadow-black/50">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-400/20">
                  <Bell className="h-4 w-4 text-yellow-300" />
                </span>
                <div className="text-xs">
                  <p className="font-bold">Serviço amanhã, 8h</p>
                  <p className="text-slate-400">lembrete por e-mail</p>
                </div>
              </div>
            </div>

            <div
              className="animate-pop-in absolute left-2 bottom-6 hidden sm:block"
              style={{ animationDelay: "1700ms" }}
            >
              <div className="animate-float-slow flex items-center gap-3 rounded-2xl border border-white/15 bg-[#0f172a] px-4 py-3 shadow-2xl shadow-black/50">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#8b5cf6]/25">
                  <Sparkles className="h-4 w-4 text-[#c4b5fd]" />
                </span>
                <div className="text-xs">
                  <p className="font-bold">Orçamento feito pela IA</p>
                  <p className="text-slate-400">você só confirma</p>
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
            Do primeiro contato ao <span className="text-gradient">dinheiro na conta</span>
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
            Feito para o dia a dia de quem <span className="text-gradient">trabalha sozinho</span>
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          <Reveal className="md:col-span-2">
            <div className="glass relative h-full overflow-hidden rounded-3xl p-8">
              <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[#3b82f6]/25 blur-3xl" />
              <CalendarDays className="h-8 w-8 text-[#67e8f9]" />
              <h3 className="mt-5 text-2xl font-extrabold">Nunca mais esqueça um serviço</h3>
              <p className="mt-2 max-w-md text-slate-300">
                Marcou com o cliente? Coloque na agenda. No dia, chega um e-mail de manhã com horário, endereço e
                telefone de cada serviço.
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="relative h-full overflow-hidden rounded-3xl bg-gradient-to-br from-[#25D366] to-[#0e9f4f] p-8 text-zinc-950">
              <FileText className="h-8 w-8" />
              <h3 className="mt-5 text-2xl font-extrabold">Contrato em 1 minuto</h3>
              <p className="mt-2 font-medium opacity-80">O cliente aceita pelo celular.</p>
            </div>
          </Reveal>

          <Reveal delay={0}>
            <div className="glass h-full rounded-3xl p-8">
              <QrCode className="h-8 w-8 text-sky-400" />
              <h3 className="mt-5 text-2xl font-extrabold">Pix com QR Code</h3>
              <p className="mt-2 text-slate-300">Antes, depois ou parcelado. O valor já vai certo.</p>
            </div>
          </Reveal>

          <Reveal delay={120} className="md:col-span-2">
            <div className="glass relative h-full overflow-hidden rounded-3xl p-8">
              <div className="absolute -bottom-12 right-0 h-48 w-48 rounded-full bg-sky-500/20 blur-3xl" />
              <Wallet className="h-8 w-8 text-[#67e8f9]" />
              <h3 className="mt-5 text-2xl font-extrabold">Saiba quem já pagou e quem falta</h3>
              <p className="mt-2 max-w-md text-slate-300">
                Recebido, a receber, atrasado e o que vence esta semana, em números simples. Chega de conta no
                caderno.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== TUDO EM UM LUGAR ===== */}
      <section className="relative isolate mx-auto max-w-6xl px-5 pb-24">
        <div className="absolute left-1/2 top-10 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-[#8b5cf6]/15 blur-[110px]" />
        <Reveal className="text-center">
          <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold text-[#a5f3fc]">
            <Sparkles className="h-3.5 w-3.5" />
            Tudo em um lugar
          </span>
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-5xl">
            Menos papelada, mais <span className="text-gradient">tempo de trabalho</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-300">
            Tudo incluso nos R$ 37/mês. Funciona direto do celular, sem curso e sem complicação.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FERRAMENTAS.map((f, i) => {
            const Icon = f.icon;
            return (
              <Reveal key={f.t} delay={(i % 3) * 120}>
                <div className="glass group relative h-full overflow-hidden rounded-3xl p-7 transition duration-300 hover:-translate-y-2 hover:border-[#3b82f6]/50">
                  <div className={`absolute -right-8 -top-8 h-28 w-28 rounded-full blur-3xl ${f.glow}`} />
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
                <p className="text-sm font-bold uppercase tracking-wider text-[#67e8f9]">Plano único</p>
                <p className="mt-3 text-7xl font-extrabold tracking-tight">
                  R$ 37
                  <span className="text-2xl font-semibold text-slate-400">/mês</span>
                </p>
                <p className="mt-3 text-slate-300">Menos que uma pizza. Se paga no primeiro serviço que você não esquecer de cobrar.</p>
              </div>
              <div>
                <ul className="space-y-3">
                  {[
                    "Assistente com IA: orçamento, contrato e agenda por mensagem",
                    "Agenda com aviso por e-mail",
                    "Contratos aceitos pelo celular",
                    "Pix com QR Code e controle de pagamentos",
                    "Orçamentos e lembrete para chamar de volta",
                    "Seu site profissional no Google",
                    "Página de links e cartaz com QR",
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
                  Começar agora
                  <Rocket className="h-5 w-5" />
                </Link>
                <p className="mt-3 text-center text-xs text-slate-400">
                  Travou em algum passo? Chame a gente no WhatsApp.
                </p>
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
              Quem já usa
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
            Chega de papelada, caderno e cobrança no zap.{" "}
            <span className="text-gradient">Deixe a IA cuidar disso.</span>
          </h2>
          <Link
            href="/criar"
            className="btn-shine mt-9 inline-flex items-center gap-2 rounded-2xl px-9 py-4 text-lg font-extrabold shadow-2xl shadow-[#3b82f6]/30 transition hover:scale-[1.04]"
          >
            Começar agora
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
