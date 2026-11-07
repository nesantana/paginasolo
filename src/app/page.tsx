import Link from "next/link";
import { listPublishedTenants } from "@/lib/tenantStore";
import {
  MessageSquare,
  Search,
  Smartphone,
  ArrowRight,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Clock,
  MapPin,
  Wrench,
  Stethoscope,
  Scissors,
  Car,
  Store,
  Hammer,
  PhoneCall,
} from "lucide-react";

export const revalidate = 300;

export default async function PaginaSoloHome() {
  const tenants = await listPublishedTenants();

  return (
    <div className="min-h-screen flex flex-col bg-[#07111a] text-white selection:bg-[#FF6600] selection:text-white">
      {/* BARRA DE TOPO COMERCIAL (Visual MSSolo) */}
      <header className="border-b border-white/10 bg-[#07111a]/95 backdrop-blur-xl sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-baseline group">
              <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                Página<span className="text-[#FF9C40]">Solo</span>
              </span>
              <span className="h-2 w-2 rounded-full bg-[#FF6600] ml-1 group-hover:scale-125 transition-transform" />
            </Link>
            <span className="hidden md:inline-block border-l border-white/15 pl-3 text-xs text-slate-300">
              Um produto <strong className="text-white">MSSolo</strong> • Sites rápidos que trazem clientes no WhatsApp
            </span>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/climatizacao-pantanal"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs sm:text-sm font-bold text-slate-200 transition-all"
            >
              <span>Ver Exemplo de Site Pronto</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#FF9C40]" />
            </Link>
            <Link
              href="/criar"
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#FF9C40] to-[#FF6600] hover:from-[#FF6600] hover:to-[#e65c00] px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-extrabold text-white shadow-lg shadow-[#FF6600]/25 transition-all"
            >
              <span>Criar Meu Site Agora</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* 1. HERO COMERCIAL DIRETO AO PONTO */}
        <section className="relative overflow-hidden py-12 sm:py-20 lg:py-24 border-b border-white/10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              {/* Coluna Esquerda: Promessa Comercial Simples */}
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#FF7113]/40 bg-[#FF6600]/10 px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider text-[#FF9C40]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>No ar em menos de 10 minutos • Sem precisar entender de computador</span>
                </div>

                <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-extrabold leading-[1.1] tracking-tight text-white">
                  Seu negócio visto na internet em menos de 10 minutos.{" "}
                  <span className="text-[#FF9C40]">Por menos de uma pizza por mês.</span>
                </h1>

                <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                  Converse com o nosso assistente: ele pergunta o nome da empresa, onde vocês ficam e o que fazem, e{" "}
                  <strong className="text-white">monta o seu site na hora</strong>. Seu site já nasce preparado para o Google e para seus clientes chamarem no WhatsApp com 1 clique.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3.5 pt-2">
                  <Link
                    href="/criar"
                    className="inline-flex items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-[#FF9C40] to-[#FF6600] hover:from-[#FF6600] hover:to-[#e65c00] px-8 py-4 text-sm sm:text-base font-extrabold text-white shadow-xl shadow-[#FF6600]/30 transition-all"
                  >
                    <span>Criar Meu Site Agora</span>
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link
                    href="/climatizacao-pantanal"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 px-6 py-4 text-sm sm:text-base font-extrabold text-white transition-all"
                  >
                    <span>Ver Exemplo Real no Ar</span>
                    <ExternalLink className="w-4 h-4 text-[#FF9C40]" />
                  </Link>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-xs sm:text-sm text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Fácil igual mandar mensagem no WhatsApp
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    R$ 37/mês • Sem fidelidade • Cancele quando quiser
                  </span>
                </div>
              </div>

              {/* Coluna Direita: Demonstração Visual de Como Fica o Site no Celular */}
              <div className="lg:col-span-5">
                <div className="rounded-3xl bg-[#0c1d2c] border border-white/15 p-5 sm:p-6 shadow-2xl relative">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider">
                        Como seu cliente vê no celular
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-400">
                      Abre em menos de 1 segundo
                    </span>
                  </div>

                  {/* Miniatura de uma página gerada */}
                  <div className="rounded-2xl bg-[#07111a] border border-white/10 p-5 space-y-4">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FF6600]/15 border border-[#FF6600]/30 px-3 py-1 text-[11px] font-bold text-[#FF9C40]">
                      <MapPin className="w-3 h-3" />
                      <span>Ar-Condicionado em Campo Grande - MS</span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-extrabold text-white leading-snug">
                      Pantanal Climatização — Instalação e Manutenção com Garantia
                    </h3>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      Atendimento rápido no mesmo dia para residências, clínicas e comércios. Chame agora e peça seu orçamento.
                    </p>

                    <div className="space-y-2 pt-1">
                      <div className="rounded-xl bg-[#0c1d2c] border border-white/10 p-3 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-extrabold text-white">
                            Instalação de Split e Inverter
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Com garantia e materiais inclusos
                          </div>
                        </div>
                        <span className="text-[11px] font-extrabold text-emerald-400">
                          Pedir Orçamento →
                        </span>
                      </div>

                      <div className="rounded-xl bg-[#0c1d2c] border border-white/10 p-3 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-extrabold text-white">
                            Limpeza e Higienização Completa
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Elimina fungos e economiza energia
                          </div>
                        </div>
                        <span className="text-[11px] font-extrabold text-emerald-400">
                          R$ 160 →
                        </span>
                      </div>
                    </div>

                    <Link
                      href="/climatizacao-pantanal"
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 py-3.5 px-4 text-xs sm:text-sm font-extrabold text-zinc-950 shadow-lg transition-all"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Solicitar Orçamento no WhatsApp</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. SEÇÃO CLARA (ALTO CONTRASTE MSSOLO): COMO FUNCIONA EM 3 PASSOS */}
        <section className="py-16 sm:py-20 bg-[#F8FAFC] text-[#07111a]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
              <span className="inline-block rounded-full bg-[#FF6600]/10 border border-[#FF6600]/25 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-[#FF6600]">
                Simples de verdade
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#07111a]">
                Do zero ao site no ar em 3 passos
              </h2>
              <p className="text-sm sm:text-base text-slate-600">
                Sem programador, sem designer. Você só conversa, vê o site pronto e publica. Depois, muda textos e telefone quando quiser pelo celular.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Passo 1 */}
              <div className="rounded-3xl bg-white border border-slate-200 p-7 shadow-sm flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="h-12 w-12 rounded-2xl bg-[#07111a] text-[#FF9C40] font-extrabold text-lg flex items-center justify-center shadow-md">
                    1
                  </div>
                  <h3 className="text-lg font-extrabold text-[#07111a]">
                    Converse com o assistente
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Nome da empresa, o que vocês fazem, cidade, WhatsApp, endereço e logo. É como mandar mensagem.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-bold text-[#FF6600]">
                  ⏱ Leva menos de 1 minuto
                </div>
              </div>

              {/* Passo 2 */}
              <div className="rounded-3xl bg-white border border-slate-200 p-7 shadow-sm flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="h-12 w-12 rounded-2xl bg-[#07111a] text-[#FF9C40] font-extrabold text-lg flex items-center justify-center shadow-md">
                    2
                  </div>
                  <h3 className="text-lg font-extrabold text-[#07111a]">
                    Veja seu site pronto
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Os textos são escritos por IA a partir das suas respostas, pensando em quem procura o seu serviço no Google. Você vê tudo funcionando antes de pagar.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-bold text-[#FF6600]">
                  ✨ Prévia completa, sem pagar
                </div>
              </div>

              {/* Passo 3 */}
              <div className="rounded-3xl bg-white border border-slate-200 p-7 shadow-sm flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="h-12 w-12 rounded-2xl bg-[#FF6600] text-white font-extrabold text-lg flex items-center justify-center shadow-md">
                    3
                  </div>
                  <h3 className="text-lg font-extrabold text-[#07111a]">
                    Publique e apareça
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Ao ativar a assinatura, seu site entra no ar e é enviado ao Google. Também serve para a bio do Instagram e para mandar aos clientes.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-bold text-emerald-600">
                  🚀 Entra no ar assim que o pagamento confirma
                </div>
              </div>
            </div>

            {/* Para quem é ideal */}
            <div className="mt-14 rounded-3xl bg-[#0c1d2c] text-white p-6 sm:p-10 shadow-xl">
              <div className="text-center max-w-2xl mx-auto mb-8">
                <h3 className="text-xl sm:text-2xl font-extrabold">
                  Feito sob medida para quem presta serviço ou tem comércio local
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  Ideal para profissionais que querem passar confiança e receber pedidos de orçamento direto no WhatsApp:
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                {[
                  { icon: Wrench, label: "Ar-Condicionado & Refrigeração" },
                  { icon: Hammer, label: "Eletricistas, Vidraçarias & Obras" },
                  { icon: Stethoscope, label: "Clínicas, Dentistas & Saúde" },
                  { icon: Scissors, label: "Salões, Estética & Barbearias" },
                  { icon: Car, label: "Oficinas, Guincho & Auto Center" },
                  { icon: Store, label: "Lojas, Assistências & Comércios" },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={i}
                      className="rounded-2xl bg-[#07111a] border border-white/10 p-4 text-center flex flex-col items-center justify-center gap-2.5"
                    >
                      <Icon className="w-6 h-6 text-[#FF9C40]" />
                      <span className="text-xs font-bold text-slate-200 leading-snug">
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* 3. POR QUE TER UMA PÁGINA SOLO? (Benefícios Comerciais) */}
        <section className="py-16 sm:py-20 bg-[#0b1926] border-t border-white/10">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#FF9C40]">
                Mais clientes, zero dor de cabeça
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
                Por que pequenos negócios estão trocando sites complicados pelo PáginaSolo?
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-2xl bg-[#07111a] border border-white/10 p-6 space-y-3">
                <div className="h-11 w-11 rounded-xl bg-[#FF6600]/15 flex items-center justify-center">
                  <Search className="w-6 h-6 text-[#FF9C40]" />
                </div>
                <h3 className="text-lg font-extrabold text-white">
                  Apareça quando procurarem no Google da sua cidade
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Quando alguém pesquisa <em>&ldquo;conserto de ar-condicionado em Campo Grande&rdquo;</em> ou <em>&ldquo;vidraçaria perto de mim&rdquo;</em>, sua página já tem toda a estrutura certa para o Google te indicar.
                </p>
              </div>

              <div className="rounded-2xl bg-[#07111a] border border-white/10 p-6 space-y-3">
                <div className="h-11 w-11 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-lg font-extrabold text-white">
                  O cliente já chega pronto no seu WhatsApp
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Nada de formulários longos que ninguém responde. O cliente vê seus serviços, clica no botão verde e já abre o seu WhatsApp dizendo exatamente qual serviço ele quer.
                </p>
              </div>

              <div className="rounded-2xl bg-[#07111a] border border-white/10 p-6 space-y-3">
                <div className="h-11 w-11 rounded-xl bg-sky-500/15 flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-sky-400" />
                </div>
                <h3 className="text-lg font-extrabold text-white">
                  Saiba exatamente quantas pessoas chamaram você
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Sem gráficos confusos. No seu painel você vê apenas 3 números claros: quantas pessoas entraram no site, quantas clicaram no seu WhatsApp e o resultado do mês.
                </p>
              </div>
            </div>

            {/* PREÇO SIMPLES E ACESSÍVEL */}
            <div className="rounded-3xl bg-gradient-to-r from-[#0c1d2c] to-[#07111a] border border-[#FF6600]/40 p-6 sm:p-10 flex flex-col lg:flex-row items-center justify-between gap-8 shadow-2xl">
              <div className="space-y-3 max-w-xl text-center lg:text-left">
                <span className="inline-block rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-extrabold text-emerald-300">
                  Preço simbólico que se paga no primeiro serviço fechado
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                  Seu site por menos de uma pizza por mês
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Inclui hospedagem ultra-rápida, botão direto para o seu WhatsApp, endereço com mapa do Google e painel fácil para você alterar informações quando quiser.
                </p>
              </div>

              <div className="rounded-2xl bg-[#07111a] border border-white/15 p-6 text-center min-w-[270px] space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Plano Completo PáginaSolo
                </div>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-sm font-bold text-slate-400">R$</span>
                  <span className="text-4xl sm:text-5xl font-extrabold text-white">
                    37
                  </span>
                  <span className="text-xs text-slate-400">/mês</span>
                </div>
                <Link
                  href="/criar"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#FF9C40] to-[#FF6600] px-6 py-3.5 text-xs sm:text-sm font-extrabold text-white shadow-lg shadow-[#FF6600]/30"
                >
                  <span>Montar meu site grátis</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <div className="text-[11px] text-slate-400">
                  Você só paga se gostar do resultado
                </div>
              </div>
            </div>

            {/* Exemplos de Empresas no Ar */}
            <div className="rounded-2xl bg-[#07111a] border border-white/15 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>Veja exemplos de páginas prontas funcionando agora ({tenants.length})</span>
                </h2>
                <span className="text-xs text-slate-400">
                  Clique em qualquer uma para testar como o cliente vê:
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tenants.map((t) => (
                  <Link
                    key={t.id}
                    href={`/${t.slug}`}
                    className="rounded-xl bg-[#0c1d2c] border border-white/10 hover:border-[#FF9C40] p-4 flex items-center justify-between gap-3 transition-all group"
                  >
                    <div>
                      <div className="text-sm font-extrabold text-white group-hover:text-[#FF9C40] transition-colors">
                        {t.business_name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {t.category} • {t.city}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-[#FF9C40]">
                      <span>Abrir site</span>
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* RODAPÉ COMERCIAL MSSOLO */}
      <footer className="border-t border-white/10 bg-[#07111a] py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white">
              Página<span className="text-[#FF9C40]">Solo</span>
            </span>
            <span>•</span>
            <span>Uma solução da <strong className="text-white">MSSolo</strong> (Campo Grande - MS)</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://wa.me/5567981513750?text=Ol%C3%A1!%20Quero%20saber%20mais%20sobre%20o%20P%C3%A1ginaSolo%20da%20MSSolo."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-emerald-400 hover:underline font-bold"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Dúvidas? Fale com a MSSolo no WhatsApp</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
