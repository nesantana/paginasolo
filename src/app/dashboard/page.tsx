"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { PublishButton } from "@/components/PublishButton";
import { SiteExtras } from "@/components/SiteExtras";
import { OwnerTools } from "@/components/OwnerTools";
import type { TenantRow, TenantServiceItem } from "@/types/database.types";
import type { TenantDashboardSummary } from "@/lib/tenantStore";
import { BrandLogo } from "@/components/BrandLogo";
import {
  Users,
  MessageSquare,
  TrendingUp,
  ExternalLink,
  PlusCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  BarChart3,
  Edit3,
  Trash2,
  Plus,
  Copy,
  Check,
  Palette,
} from "lucide-react";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type PresetTemplate = {
  id: string;
  label: string;
  category: string;
  headlineSuffix: string;
  description: string;
  services: TenantServiceItem[];
};

const BUSINESS_PRESETS: PresetTemplate[] = [
  {
    id: "ar",
    label: "❄️ Ar-Condicionado",
    category: "Instalação e Manutenção de Ar-Condicionado",
    headlineSuffix: "Instalação, Limpeza e Conserto de Ar-Condicionado com Garantia",
    description:
      "Atendimento rápido em residências, clínicas e comércios. Chame no WhatsApp e peça seu orçamento sem compromisso.",
    services: [
      {
        title: "Instalação de Ar-Condicionado Split e Inverter",
        description:
          "Instalação completa nos padrões de fábrica, com bomba de vácuo e garantia.",
        price_optional: "Orçamento no WhatsApp",
      },
      {
        title: "Limpeza e Higienização Completa",
        description:
          "Elimina fungos, mau cheiro e faz seu aparelho gelar mais gastando menos energia.",
        price_optional: "A partir de R$ 150",
      },
      {
        title: "Conserto e Recarga de Gás",
        description:
          "Visita técnica rápida para aparelhos que pararam de gelar ou estão pingando.",
        price_optional: "Atendimento Rápido",
      },
    ],
  },
  {
    id: "eletricista",
    label: "⚡ Eletricista / Reparos",
    category: "Eletricista Residencial e Comercial",
    headlineSuffix: "Eletricista de Confiança com Atendimento Rápido e Garantia",
    description:
      "Instalações elétricas, troca de fiação, disjuntores, chuveiros, iluminação e reparos de emergência. Chame agora no WhatsApp.",
    services: [
      {
        title: "Conserto de Curto-Circuito e Queda de Energia",
        description:
          "Identificação rápida do problema, troca de disjuntores e revisão do quadro elétrico.",
        price_optional: "Plantão Rápido",
      },
      {
        title: "Instalação de Chuveiros, Tomadas e Luminárias",
        description:
          "Serviço limpo, seguro e com acabamento perfeito para sua casa ou comércio.",
        price_optional: "Orçamento no WhatsApp",
      },
      {
        title: "Padrão de Entrada e Reforma Elétrica",
        description:
          "Adequação completa de fiação e quadro de distribuição dentro das normas.",
        price_optional: "Sob Consulta",
      },
    ],
  },
  {
    id: "vidracaria",
    label: "🪟 Vidraçaria / Esquadrias",
    category: "Vidraçaria, Box e Espelhos sob Medida",
    headlineSuffix: "Box para Banheiro, Vidros Temperados e Espelhos sob Medida",
    description:
      "Fabricação e instalação com acabamento de primeira linha, entrega no prazo combinado e orçamento grátis pelo WhatsApp.",
    services: [
      {
        title: "Box de Vidro Temperado para Banheiro",
        description:
          "Diversos modelos e cores de alumínio com vedação perfeita e garantia.",
        price_optional: "Orçamento Grátis",
      },
      {
        title: "Janelas, Portas de Blindex e Fechamento de Área",
        description:
          "Medição no local e instalação rápida por equipe própria especializada.",
        price_optional: "Sob Medida",
      },
      {
        title: "Espelhos Decorativos e Bisotê",
        description:
          "Espelhos sob medida para salas, quartos, banheiros e academias.",
        price_optional: "Orçamento no WhatsApp",
      },
    ],
  },
  {
    id: "clinica",
    label: "🦷 Clínica / Consultório",
    category: "Clínica Odontológica e Atendimento Especializado",
    headlineSuffix: "Cuidado, Tecnologia e Atendimento Humanizado para o Seu Sorriso",
    description:
      "Agende sua avaliação direto pelo WhatsApp de forma simples e rápida. Ambiente confortável e profissionais experientes.",
    services: [
      {
        title: "Avaliação Completa e Limpeza Preventiva",
        description:
          "Check-up detalhado com orientação clara e planejamento do seu tratamento.",
        price_optional: "Agendar no WhatsApp",
      },
      {
        title: "Implantes, Próteses e Reabilitação",
        description:
          "Volte a mastigar e sorrir com segurança usando materiais de alta durabilidade.",
        price_optional: "Avaliação Especializada",
      },
      {
        title: "Estética Dental e Clareamento",
        description:
          "Procedimentos modernos e seguros para valorizar o seu sorriso.",
        price_optional: "Consulte Condições",
      },
    ],
  },
  {
    id: "estetica",
    label: "✂️ Salão / Barbearia / Estética",
    category: "Estética, Beleza e Bem-Estar",
    headlineSuffix: "Atendimento com Hora Marcada e Profissionais Especializados",
    description:
      "Reserve seu horário em poucos segundos direto pelo nosso WhatsApp. Produtos de primeira linha e ambiente climatizado.",
    services: [
      {
        title: "Atendimento Principal com Hora Marcada",
        description:
          "Atendimento personalizado sem fila de espera e com produtos profissionais.",
        price_optional: "Ver Horários",
      },
      {
        title: "Pacotes Especiais e Tratamentos",
        description:
          "Combos completos com condição especial para clientes da página.",
        price_optional: "Chamar no WhatsApp",
      },
    ],
  },
  {
    id: "oficina",
    label: "🚗 Oficina / Auto Center",
    category: "Oficina Mecânica e Revisão Automotiva",
    headlineSuffix: "Mecânica de Confiança, Diagnóstico Honesto e Garantia no Serviço",
    description:
      "Revisão preventiva, freios, suspensão, troca de óleo e injeção eletrônica. Fale direto com nossa oficina pelo WhatsApp.",
    services: [
      {
        title: "Revisão Completa, Freios e Suspensão",
        description:
          "Orçamento transparente antes de executar qualquer serviço no seu veículo.",
        price_optional: "Agendar Revisão",
      },
      {
        title: "Diagnóstico Computadorizado e Injeção",
        description:
          "Equipamentos modernos para encontrar a falha exata sem troca desnecessária de peças.",
        price_optional: "Orçamento no WhatsApp",
      },
    ],
  },
];

const COLOR_OPTIONS = [
  { label: "Laranja", hex: "#FF6600" },
  { label: "Verde WhatsApp", hex: "#10B981" },
  { label: "Azul Confiança", hex: "#0284C7" },
  { label: "Vermelho Destaque", hex: "#E11D48" },
  { label: "Dourado Premium", hex: "#D97706" },
];

export default function ClientDashboardPage() {
  const [summary, setSummary] = useState<TenantDashboardSummary | null>(null);
  const [mode, setMode] = useState<"overview" | "onboarding" | "quick_edit">(
    "overview"
  );
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Estado do Criador em 3 Passos
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [bizName, setBizName] = useState("");
  const [bizWhatsapp, setBizWhatsapp] = useState("");
  const [bizCategory, setBizCategory] = useState("");
  const [bizCity, setBizCity] = useState("Campo Grande - MS");
  const [bizAddress, setBizAddress] = useState("");
  const [bizHours, setBizHours] = useState("Segunda a Sábado: 08h às 18h");
  const [bizHeadline, setBizHeadline] = useState("");
  const [bizDescription, setBizDescription] = useState("");
  const [bizColor, setBizColor] = useState("#3b82f6");
  const [bizSlug, setBizSlug] = useState("");
  const [bizMetaPixel, setBizMetaPixel] = useState("");
  const [bizGoogleTag, setBizGoogleTag] = useState("");
  const [services, setServices] = useState<TenantServiceItem[]>([
    {
      title: "Atendimento e Orçamento Especializado",
      description:
        "Serviço completo com garantia, materiais de qualidade e atendimento rápido.",
      price_optional: "Orçamento no WhatsApp",
    },
  ]);

  const loadSummary = async (tenantId?: string) => {
    const query = tenantId ? `?tenantId=${tenantId}` : "";
    const res = await fetch(`/api/tenants${query}`, { cache: "no-store" });
    if (res.status === 401) {
      // sem acesso: manda criar um site (ou usar o link de acesso)
      window.location.href = "/criar";
      return;
    }
    const data = await res.json();
    if (data.tenant) {
      setSummary(data);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const applyPreset = (preset: PresetTemplate) => {
    setSelectedPreset(preset.id);
    setBizCategory(preset.category);
    const prefix = bizName.trim() ? `${bizName.trim()} — ` : "";
    setBizHeadline(`${prefix}${preset.headlineSuffix}`);
    setBizDescription(preset.description);
    setServices(preset.services.map((s) => ({ ...s })));
  };

  const populateFormFromTenant = (t: TenantRow) => {
    setBizName(t.business_name);
    setBizWhatsapp(t.whatsapp_number);
    setBizCategory(t.category);
    setBizCity(t.city);
    setBizAddress(t.address || "");
    setBizHours(t.opening_hours || "");
    setBizHeadline(t.headline || "");
    setBizDescription(t.description || "");
    setBizColor(t.primary_color || "#3b82f6");
    setBizSlug(t.slug);
    setBizMetaPixel(t.meta_pixel_id || "");
    setBizGoogleTag(t.google_tag_id || "");
    setServices(
      t.services && t.services.length > 0
        ? t.services
        : [
            {
              title: "Serviço Principal",
              description: "Atendimento com garantia.",
              price_optional: "Orçamento no WhatsApp",
            },
          ]
    );
  };

  const startNewOnboarding = () => {
    setSelectedPreset("");
    setBizName("");
    setBizWhatsapp("");
    setBizCategory("");
    setBizCity("Campo Grande - MS");
    setBizAddress("");
    setBizHours("Segunda a Sábado: 08h às 18h");
    setBizHeadline("");
    setBizDescription("");
    setBizColor("#3b82f6");
    setBizSlug("");
    setServices([
      {
        title: "Atendimento Principal com Garantia",
        description:
          "Serviço executado por profissionais qualificados com atendimento rápido.",
        price_optional: "Orçamento no WhatsApp",
      },
    ]);
    setStep(1);
    setMode("onboarding");
  };

  const startQuickEdit = () => {
    if (!summary?.tenant) return;
    populateFormFromTenant(summary.tenant);
    setMode("quick_edit");
  };

  const copySiteLink = () => {
    if (!summary?.tenant) return;
    const url = `${window.location.origin}/${summary.tenant.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handlePublishOrSave = async (isEditingExisting: boolean) => {
    if (!bizName.trim()) {
      alert("Por favor, digite o Nome da sua Empresa ou o seu Nome Profissional.");
      return;
    }

    const finalSlug = bizSlug.trim() || slugify(bizName.trim());

    setSaving(true);
    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: isEditingExisting ? summary?.tenant.id : undefined,
          business_name: bizName.trim(),
          whatsapp_number: bizWhatsapp.trim() || "5567981513750",
          category: bizCategory.trim() || "Atendimento e Serviços",
          city: bizCity.trim() || "Campo Grande - MS",
          address: bizAddress.trim(),
          opening_hours: bizHours.trim(),
          headline:
            bizHeadline.trim() ||
            `${bizName.trim()} — Especialista em ${
              bizCategory.trim() || "Serviços"
            } em ${bizCity.trim()}`,
          description:
            bizDescription.trim() ||
            "Atendimento rápido direto pelo WhatsApp com orçamento sem compromisso e garantia.",
          primary_color: bizColor,
          meta_pixel_id: bizMetaPixel.trim(),
          google_tag_id: bizGoogleTag.trim(),
          slug: finalSlug,
          services: services.filter((s) => s.title.trim()),
        }),
      });
      const data = await res.json();
      if (data.ok && data.tenant) {
        setSummary(data);
        setMode("overview");
        setToast(
          isEditingExisting
            ? "Pronto! Suas alterações já foram salvas e seu site já está atualizado."
            : `Parabéns! O site da "${data.tenant.business_name}" já está no ar!`
        );
        setTimeout(() => setToast(""), 5000);
      }
    } finally {
      setSaving(false);
    }
  };

  const maxDailyViews = useMemo(() => {
    if (!summary) return 10;
    return Math.max(
      10,
      ...summary.metrics.dailySeries.map((d) => d.pageviews)
    );
  }, [summary]);

  if (!summary) {
    return (
      <div className="min-h-screen bg-[#0a0e17] text-white flex items-center justify-center p-6 font-bold">
        Abrindo o painel da sua página...
      </div>
    );
  }

  const { tenant, allTenants, metrics } = summary;

  return (
    <div className="min-h-screen bg-[#0a0e17] text-white pb-16">
      {/* Barra Superior Simples */}
      <header className="border-b border-white/10 bg-[#0f172a] sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="Meu Site Novo">
              <BrandLogo size={32} className="text-lg" />
            </Link>

            {allTenants.length > 1 && (
              <select
                value={tenant.id}
                onChange={(e) => loadSummary(e.target.value)}
                aria-label="Selecionar empresa"
                className="rounded-xl border border-white/15 bg-[#0a0e17] px-3 py-2 text-xs font-bold text-white"
              >
                {allTenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.business_name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <Link
              href={`/${tenant.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 px-4 py-2 text-xs font-extrabold text-zinc-950 shadow-lg shadow-emerald-500/20 transition-all"
            >
              <span>Ver Meu Site no Ar</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 space-y-6">
        {toast && (
          <div className="rounded-2xl bg-emerald-500/15 border border-emerald-500/40 px-5 py-4 text-xs sm:text-sm font-bold text-emerald-200 flex items-center gap-2.5 shadow-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{toast}</span>
          </div>
        )}

        {/* MODO 1: VISÃO GERAL SIMPLES PARA O DONO DO NEGÓCIO */}
        {mode === "overview" && (
          <div className="space-y-6">
            {/* Quem chamar hoje + ferramentas do plano */}
            <OwnerTools key={tenant.id} tenant={tenant} />

            {/* Cartão Principal da Empresa */}
            <div className="rounded-3xl bg-[#0f172a] border border-white/15 p-5 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-xl">
              <div className="space-y-1.5">
                {tenant.subscription_status === "active" ? (
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-300">
                      Seu site está no ar e funcionando
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#3b82f6]/15 border border-[#3b82f6]/40 px-3 py-1">
                      <span className="h-2 w-2 rounded-full bg-[#67e8f9]" />
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#67e8f9]">
                        {tenant.subscription_status === "draft"
                          ? "Prévia: ainda não está no Google"
                          : "Assinatura inativa: site fora do ar"}
                      </span>
                    </div>
                    <PublishButton
                      label={
                        tenant.subscription_status === "draft"
                          ? "Publicar por R$ 37/mês"
                          : "Reativar por R$ 37/mês"
                      }
                    />
                  </div>
                )}

                <h1 className="text-xl sm:text-2xl font-extrabold text-white pt-1">
                  {tenant.business_name}
                </h1>

                <p className="text-xs sm:text-sm text-slate-300">
                  Ramo: <strong className="text-white">{tenant.category}</strong> • Cidade:{" "}
                  <strong className="text-white">{tenant.city}</strong>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={copySiteLink}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-[#0a0e17] hover:bg-white/10 px-4 py-3 text-xs sm:text-sm font-extrabold text-white cursor-pointer transition-all"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300">Link Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-[#67e8f9]" />
                      <span>Copiar Link para Instagram / WhatsApp</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={startQuickEdit}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#06b6d4] to-[#6366f1] hover:from-[#0891b2] hover:to-[#4f46e5] px-5 py-3 text-xs sm:text-sm font-extrabold text-white shadow-lg shadow-[#3b82f6]/25 cursor-pointer transition-all"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Editar Textos, Serviços ou WhatsApp</span>
                </button>
              </div>
            </div>

            {/* OS 3 CARTÕES SIMPLES DE RESULTADO */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Card 1: Pessoas que entraram no site */}
              <div className="rounded-2xl bg-[#0f172a] border border-white/10 p-6">
                <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-slate-300">
                  <span>Visitas no seu site (30 dias)</span>
                  <Users className="w-5 h-5 text-sky-400" />
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
                  {metrics.monthlyPageviews}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Quantas pessoas abriram sua página neste mês
                </p>
              </div>

              {/* Card 2: Pessoas que clicaram no WhatsApp */}
              <div className="rounded-2xl bg-[#0f172a] border border-emerald-500/30 p-6">
                <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                  <span>Chamaram no WhatsApp</span>
                  <MessageSquare className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 mt-2">
                  {metrics.monthlyWhatsappClicks}
                </div>
                <p className="text-xs text-slate-300 mt-2">
                  Clientes interessados que clicaram para falar com você
                </p>
              </div>

              {/* Card 3: Aproveitamento */}
              <div className="rounded-2xl bg-[#0f172a] border border-[#38bdf8]/30 p-6">
                <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-[#67e8f9]">
                  <span>Aproveitamento do Site</span>
                  <TrendingUp className="w-5 h-5 text-[#67e8f9]" />
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-[#67e8f9] mt-2">
                  {metrics.conversionRate}%
                </div>
                <p className="text-xs text-slate-300 mt-2">
                  De cada 100 pessoas que entram, cerca de{" "}
                  <strong className="text-white">
                    {Math.round(metrics.conversionRate)}
                  </strong>{" "}
                  chamam no WhatsApp
                </p>
              </div>
            </div>

            {/* GRÁFICO DE BARRAS DOS ÚLTIMOS 30 DIAS */}
            <div className="rounded-2xl bg-[#0f172a] border border-white/15 p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#67e8f9]" />
                  <h2 className="text-base sm:text-lg font-extrabold text-white">
                    Movimento da sua página dia a dia (Últimos 30 dias)
                  </h2>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="inline-flex items-center gap-1.5 text-slate-300">
                    <span className="h-3 w-3 rounded-sm bg-sky-500/60" />
                    Visitas no site
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-emerald-300 font-bold">
                    <span className="h-3 w-3 rounded-sm bg-emerald-400" />
                    Cliques no WhatsApp
                  </span>
                </div>
              </div>

              <div className="h-48 pt-6 pb-2 px-1 flex items-end gap-1 sm:gap-1.5 border-b border-white/10 overflow-x-auto">
                {metrics.dailySeries.map((point) => {
                  const viewHeightPct = Math.max(
                    6,
                    Math.round((point.pageviews / maxDailyViews) * 100)
                  );
                  const clickHeightPct = Math.max(
                    point.whatsappClicks > 0 ? 6 : 0,
                    Math.round((point.whatsappClicks / maxDailyViews) * 100)
                  );

                  return (
                    <div
                      key={point.date}
                      className="flex-1 min-w-[14px] h-full flex flex-col justify-end items-center group relative"
                      title={`Dia ${point.label}: ${point.pageviews} visitas • ${point.whatsappClicks} pessoas chamaram no WhatsApp`}
                    >
                      <div className="w-full h-full flex items-end justify-center gap-[2px]">
                        <div
                          className="w-1/2 rounded-t bg-sky-500/50 group-hover:bg-sky-400 transition-all"
                          style={{ height: `${viewHeightPct}%` }}
                        />
                        <div
                          className="w-1/2 rounded-t bg-emerald-400 group-hover:bg-emerald-300 transition-all"
                          style={{ height: `${clickHeightPct}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-slate-400 mt-1.5 hidden md:block">
                        {point.label.slice(0, 2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <SiteExtras
              key={tenant.id}
              tenant={tenant}
              series={metrics.dailySeries}
            />
          </div>
        )}

        {/* MODO 2: CRIAR SITE EM 3 PASSOS SUPER SIMPLES */}
        {mode === "onboarding" && (
          <div className="max-w-2xl mx-auto rounded-3xl bg-[#0f172a] border border-white/15 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#67e8f9]">
                  Passo {step} de 3 • Muito Fácil
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-0.5">
                  {step === 1 && "1. Qual é o seu negócio e seu WhatsApp?"}
                  {step === 2 && "2. Quais serviços você oferece?"}
                  {step === 3 && "3. Confira como ficou e coloque no ar!"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setMode("overview")}
                className="text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Voltar
              </button>
            </div>

            {step === 1 && (
              <div className="space-y-5">
                {/* Botões de Modelo Pronto em 1 Clique */}
                <div className="rounded-2xl bg-[#0a0e17] border border-white/10 p-4 space-y-2.5">
                  <div className="text-xs font-extrabold text-[#67e8f9]">
                    💡 Quer ir mais rápido? Toque no seu ramo para preencher um modelo pronto:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {BUSINESS_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        className={`rounded-xl px-3 py-2.5 text-xs font-bold text-left border transition-all cursor-pointer ${
                          selectedPreset === preset.id
                            ? "bg-[#3b82f6] border-[#67e8f9] text-white shadow-md"
                            : "bg-[#0f172a] border-white/10 text-slate-200 hover:border-white/30"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1.5">
                      Nome da sua Empresa ou seu Nome *
                    </label>
                    <input
                      type="text"
                      value={bizName}
                      onChange={(e) => {
                        setBizName(e.target.value);
                        setBizSlug(slugify(e.target.value));
                      }}
                      placeholder="Ex: Silva Ar-Condicionado"
                      className="w-full rounded-xl border border-white/15 bg-[#0a0e17] px-3.5 py-3 text-sm text-white focus:border-[#67e8f9] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1.5">
                      Seu WhatsApp (com DDD) *
                    </label>
                    <input
                      type="tel"
                      value={bizWhatsapp}
                      onChange={(e) => setBizWhatsapp(e.target.value)}
                      placeholder="Ex: 67 98151-3750"
                      className="w-full rounded-xl border border-white/15 bg-[#0a0e17] px-3.5 py-3 text-sm text-white focus:border-[#67e8f9] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1.5">
                      O que você faz? (Sua especialidade) *
                    </label>
                    <input
                      type="text"
                      value={bizCategory}
                      onChange={(e) => setBizCategory(e.target.value)}
                      placeholder="Ex: Conserto e Limpeza de Ar-Condicionado"
                      className="w-full rounded-xl border border-white/15 bg-[#0a0e17] px-3.5 py-3 text-sm text-white focus:border-[#67e8f9] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1.5">
                      Qual cidade você atende? *
                    </label>
                    <input
                      type="text"
                      value={bizCity}
                      onChange={(e) => setBizCity(e.target.value)}
                      placeholder="Ex: Campo Grande - MS"
                      className="w-full rounded-xl border border-white/15 bg-[#0a0e17] px-3.5 py-3 text-sm text-white focus:border-[#67e8f9] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    Endereço ou Bairro onde você fica (Opcional)
                  </label>
                  <input
                    type="text"
                    value={bizAddress}
                    onChange={(e) => setBizAddress(e.target.value)}
                    placeholder="Ex: Av. Afonso Pena, 1500 - Centro (ou Atendimento em Domicílio)"
                    className="w-full rounded-xl border border-white/15 bg-[#0a0e17] px-3.5 py-3 text-sm text-white focus:border-[#67e8f9] focus:outline-none"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#06b6d4] to-[#6366f1] px-7 py-3.5 text-xs sm:text-sm font-extrabold text-white shadow-lg cursor-pointer"
                  >
                    <span>Continuar para o Passo 2</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    Frase principal que aparece no topo do seu site
                  </label>
                  <input
                    type="text"
                    value={bizHeadline}
                    onChange={(e) => setBizHeadline(e.target.value)}
                    placeholder="Ex: Atendimento Rápido com Garantia e Orçamento pelo WhatsApp"
                    className="w-full rounded-xl border border-white/15 bg-[#0a0e17] px-3.5 py-3 text-sm text-white focus:border-[#67e8f9] focus:outline-none"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-[#67e8f9]">
                      Lista dos serviços que você faz (o cliente pode clicar para pedir orçamento):
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setServices((prev) => [
                          ...prev,
                          {
                            title: "",
                            description: "",
                            price_optional: "Orçamento no WhatsApp",
                          },
                        ])
                      }
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-xs font-bold text-emerald-300 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Mais um serviço</span>
                    </button>
                  </div>

                  {services.map((srv, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl bg-[#0a0e17] border border-white/10 p-3.5 space-y-2.5"
                    >
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={srv.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setServices((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, title: val } : item
                              )
                            );
                          }}
                          placeholder="Nome do serviço (Ex: Limpeza Completa)"
                          className="flex-1 rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2 text-xs sm:text-sm text-white font-bold"
                        />
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={srv.price_optional || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setServices((prev) =>
                                prev.map((item, i) =>
                                  i === idx
                                    ? { ...item, price_optional: val }
                                    : item
                                )
                              );
                            }}
                            placeholder="Valor (ou Sob Consulta)"
                            className="w-full sm:w-44 rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2 text-xs text-emerald-300 font-bold"
                          />
                          {services.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setServices((prev) =>
                                  prev.filter((_, i) => i !== idx)
                                )
                              }
                              className="text-rose-400 hover:bg-rose-500/10 rounded-lg px-2 cursor-pointer"
                              title="Remover este serviço"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      <input
                        type="text"
                        value={srv.description}
                        onChange={(e) => {
                          const val = e.target.value;
                          setServices((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, description: val } : item
                            )
                          );
                        }}
                        placeholder="Explicação rápida (Ex: Serviço com garantia e atendimento no mesmo dia)"
                        className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2 text-xs text-slate-300"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#06b6d4] to-[#6366f1] px-7 py-3.5 text-xs sm:text-sm font-extrabold text-white shadow-lg cursor-pointer"
                  >
                    <span>Ir para o Último Passo</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                {/* Escolha de Cor Visual */}
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-2 flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-[#67e8f9]" />
                    <span>Escolha a cor de destaque do seu site:</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setBizColor(c.hex)}
                        className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold border cursor-pointer transition-all ${
                          bizColor === c.hex
                            ? "border-white bg-white/15 text-white"
                            : "border-white/10 bg-[#0a0e17] text-slate-300"
                        }`}
                      >
                        <span
                          className="h-3.5 w-3.5 rounded-full"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span>{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    Como vai ficar o link (endereço) do seu site:
                  </label>
                  <div className="flex items-center rounded-xl border border-white/15 bg-[#0a0e17] px-3.5 py-3">
                    <span className="text-xs text-slate-400 font-mono">
                      paginasolo.com.br/
                    </span>
                    <input
                      type="text"
                      value={bizSlug}
                      onChange={(e) => setBizSlug(slugify(e.target.value))}
                      placeholder="nome-da-sua-empresa"
                      className="flex-1 bg-transparent text-sm font-mono font-extrabold text-[#67e8f9] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="rounded-2xl bg-[#0a0e17] border border-white/10 p-4 text-xs space-y-1.5">
                  <div className="text-slate-400 uppercase font-bold text-[10px]">
                    Como sua empresa vai aparecer nas buscas do Google:
                  </div>
                  <div className="text-sky-400 font-extrabold text-sm">
                    {bizName || "Sua Empresa"} -{" "}
                    {bizCategory || "Atendimento Profissional"} em {bizCity}
                  </div>
                  <div className="text-emerald-400 font-mono text-[11px]">
                    https://paginasolo.com.br/{bizSlug || "sua-empresa"}
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar</span>
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handlePublishOrSave(false)}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-500 hover:bg-emerald-400 px-8 py-4 text-xs sm:text-sm font-extrabold text-zinc-950 shadow-xl cursor-pointer transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {saving
                        ? "Colocando no ar..."
                        : "Colocar Meu Site no Ar Agora!"}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODO 3: EDIÇÃO FÁCIL DE TEXTOS, SERVIÇOS E WHATSAPP */}
        {mode === "quick_edit" && (
          <div className="max-w-2xl mx-auto rounded-3xl bg-[#0f172a] border border-white/15 p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#67e8f9]">
                  Alteração Simples e Imediata
                </span>
                <h2 className="text-lg sm:text-xl font-extrabold text-white">
                  Editar informações de {tenant.business_name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setMode("overview")}
                className="text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Voltar ao Painel
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0a0e17] p-4 space-y-3">
              <div className="text-xs font-extrabold uppercase tracking-wider text-[#67e8f9]">
                Pixels de anúncios (opcional)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">
                    Pixel do Meta (Facebook/Instagram)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Ex: 123456789012345"
                    value={bizMetaPixel}
                    onChange={(e) => setBizMetaPixel(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-[#0f172a] px-3.5 py-2.5 text-sm font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">
                    Google Tag (GA4 ou Google Ads)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: G-ABC123XYZ ou AW-123456789"
                    value={bizGoogleTag}
                    onChange={(e) => setBizGoogleTag(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-[#0f172a] px-3.5 py-2.5 text-sm font-mono text-white"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Ativados só depois que o site é publicado. IDs inválidos são ignorados.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  Nome da sua Empresa
                </label>
                <input
                  type="text"
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-[#0a0e17] px-3.5 py-2.5 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  WhatsApp que recebe os clientes
                </label>
                <input
                  type="text"
                  value={bizWhatsapp}
                  onChange={(e) => setBizWhatsapp(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-[#0a0e17] px-3.5 py-2.5 text-sm font-mono text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">
                Frase Principal do Topo do Site
              </label>
              <input
                type="text"
                value={bizHeadline}
                onChange={(e) => setBizHeadline(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-[#0a0e17] px-3.5 py-2.5 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">
                Texto de explicação abaixo da frase principal
              </label>
              <textarea
                rows={2}
                value={bizDescription}
                onChange={(e) => setBizDescription(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-[#0a0e17] p-3 text-sm text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  Endereço ou Região de Atendimento
                </label>
                <input
                  type="text"
                  value={bizAddress}
                  onChange={(e) => setBizAddress(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-[#0a0e17] px-3.5 py-2.5 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  Horário de Funcionamento
                </label>
                <input
                  type="text"
                  value={bizHours}
                  onChange={(e) => setBizHours(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-[#0a0e17] px-3.5 py-2.5 text-sm text-white"
                />
              </div>
            </div>

            {/* Edição rápida dos serviços também */}
            <div className="space-y-2.5 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-[#67e8f9]">
                  Serviços exibidos na sua página:
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setServices((prev) => [
                      ...prev,
                      {
                        title: "",
                        description: "",
                        price_optional: "Orçamento no WhatsApp",
                      },
                    ])
                  }
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Serviço</span>
                </button>
              </div>

              {services.map((srv, idx) => (
                <div
                  key={idx}
                  className="rounded-xl bg-[#0a0e17] border border-white/10 p-3 space-y-2"
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={srv.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setServices((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, title: val } : item
                          )
                        );
                      }}
                      placeholder="Nome do serviço..."
                      className="flex-1 rounded-lg border border-white/10 bg-[#0f172a] px-3 py-1.5 text-xs text-white font-bold"
                    />
                    <input
                      type="text"
                      value={srv.price_optional || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setServices((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, price_optional: val } : item
                          )
                        );
                      }}
                      placeholder="Preço / Condição"
                      className="w-36 rounded-lg border border-white/10 bg-[#0f172a] px-3 py-1.5 text-xs text-emerald-300 font-bold"
                    />
                    {services.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setServices((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                        className="text-rose-400 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={srv.description}
                    onChange={(e) => {
                      const val = e.target.value;
                      setServices((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, description: val } : item
                        )
                      );
                    }}
                    placeholder="Breve descrição do serviço..."
                    className="w-full rounded-lg border border-white/10 bg-[#0f172a] px-3 py-1.5 text-xs text-slate-300"
                  />
                </div>
              ))}
            </div>

            <div className="pt-3 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setMode("overview")}
                className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handlePublishOrSave(true)}
                className="rounded-xl bg-gradient-to-r from-[#06b6d4] to-[#6366f1] px-7 py-3 text-xs sm:text-sm font-extrabold text-white shadow-lg cursor-pointer"
              >
                {saving ? "Salvando..." : "Salvar Alterações no Site"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
