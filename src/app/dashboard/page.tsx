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
  CheckCircle2,
  BarChart3,
  Edit3,
  Trash2,
  Plus,
  Copy,
  Check,
  Palette,
  LogOut,
} from "lucide-react";

const COLOR_OPTIONS = [
  { label: "Azul", hex: "#2563eb" },
  { label: "Verde WhatsApp", hex: "#10B981" },
  { label: "Laranja", hex: "#FF6600" },
  { label: "Vermelho Destaque", hex: "#E11D48" },
  { label: "Roxo", hex: "#7c3aed" },
  { label: "Dourado Premium", hex: "#D97706" },
];

export default function ClientDashboardPage() {
  const [summary, setSummary] = useState<TenantDashboardSummary | null>(null);
  const [mode, setMode] = useState<"overview" | "quick_edit">("overview");
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [bizName, setBizName] = useState("");
  const [bizWhatsapp, setBizWhatsapp] = useState("");
  const [bizCategory, setBizCategory] = useState("");
  const [bizCity, setBizCity] = useState("");
  const [bizAddress, setBizAddress] = useState("");
  const [bizHours, setBizHours] = useState("");
  const [bizHeadline, setBizHeadline] = useState("");
  const [bizDescription, setBizDescription] = useState("");
  const [bizColor, setBizColor] = useState("#3b82f6");
  const [bizMetaPixel, setBizMetaPixel] = useState("");
  const [bizGoogleTag, setBizGoogleTag] = useState("");
  const [services, setServices] = useState<TenantServiceItem[]>([]);

  const loadSummary = async (tenantId?: string) => {
    const query = tenantId ? `?tenantId=${tenantId}` : "";
    const res = await fetch(`/api/tenants${query}`, { cache: "no-store" });
    if (res.status === 401) {
      window.location.href = "/entrar";
      return;
    }
    const data = await res.json();
    if (data.tenant) setSummary(data);
  };

  useEffect(() => {
    loadSummary();
  }, []);

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
    setBizMetaPixel(t.meta_pixel_id || "");
    setBizGoogleTag(t.google_tag_id || "");
    setServices(
      t.services && t.services.length > 0
        ? t.services
        : [{ title: "Serviço Principal", description: "Atendimento com garantia.", price_optional: "Orçamento no WhatsApp" }]
    );
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

  const handleSave = async () => {
    if (!summary) return;
    if (!bizName.trim()) {
      alert("Por favor, digite o Nome da sua Empresa ou o seu Nome Profissional.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: summary.tenant.id,
          business_name: bizName.trim(),
          whatsapp_number: bizWhatsapp.trim(),
          category: bizCategory.trim(),
          city: bizCity.trim(),
          address: bizAddress.trim(),
          opening_hours: bizHours.trim(),
          headline: bizHeadline.trim(),
          description: bizDescription.trim(),
          primary_color: bizColor,
          meta_pixel_id: bizMetaPixel.trim(),
          google_tag_id: bizGoogleTag.trim(),
          slug: summary.tenant.slug,
          services: services.filter((s) => s.title.trim()),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok && data.tenant) {
        setSummary(data);
        setMode("overview");
        setToast("Pronto! Suas alterações já foram salvas e seu site já está atualizado.");
        setTimeout(() => setToast(""), 5000);
      } else {
        setToast(data.error || "Não foi possível salvar. Confira os campos.");
        setTimeout(() => setToast(""), 5000);
      }
    } finally {
      setSaving(false);
    }
  };

  const maxDailyViews = useMemo(() => {
    if (!summary) return 10;
    return Math.max(10, ...summary.metrics.dailySeries.map((d) => d.pageviews));
  }, [summary]);

  if (!summary) {
    return (
      <div className="min-h-screen bg-[#0a0e17] text-white flex items-center justify-center p-6 font-bold">
        Abrindo o painel da sua página...
      </div>
    );
  }

  const { tenant, allTenants, metrics } = summary;
  const paid = tenant.is_active && tenant.subscription_status === "active";

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
            <button
              type="button"
              onClick={async () => {
                await fetch("/api/sair", { method: "POST" }).catch(() => {});
                window.location.href = "/";
              }}
              aria-label="Sair"
              title="Sair"
              className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
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

        {/* VISÃO GERAL */}
        {mode === "overview" && (
          <div className="space-y-6">
            {/* Ferramentas do hub + quem chamar hoje */}
            <OwnerTools key={tenant.id} tenant={tenant} />

            {/* Cartão Principal da Empresa */}
            <div className="rounded-3xl bg-[#0f172a] border border-white/15 p-5 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-xl">
              <div className="space-y-1.5">
                {paid ? (
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-300">
                      Plano ativo: ferramentas liberadas
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#3b82f6]/15 border border-[#3b82f6]/40 px-3 py-1">
                      <span className="h-2 w-2 rounded-full bg-[#67e8f9]" />
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#67e8f9]">
                        {tenant.subscription_status === "draft" ? "Site no ar" : "Plano inativo: ferramentas bloqueadas"}
                      </span>
                    </div>
                    <PublishButton
                      label={tenant.subscription_status === "draft" ? "Liberar ferramentas por R$ 37/mês" : "Reativar por R$ 37/mês"}
                    />
                  </div>
                )}

                <h1 className="text-xl sm:text-2xl font-extrabold text-white pt-1">{tenant.business_name}</h1>

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
              <div className="rounded-2xl bg-[#0f172a] border border-white/10 p-6">
                <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-slate-300">
                  <span>Visitas no seu site (30 dias)</span>
                  <Users className="w-5 h-5 text-sky-400" />
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-white mt-2">{metrics.monthlyPageviews}</div>
                <p className="text-xs text-slate-400 mt-2">Quantas pessoas abriram sua página neste mês</p>
              </div>

              <div className="rounded-2xl bg-[#0f172a] border border-emerald-500/30 p-6">
                <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                  <span>Chamaram no WhatsApp</span>
                  <MessageSquare className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 mt-2">{metrics.monthlyWhatsappClicks}</div>
                <p className="text-xs text-slate-300 mt-2">Clientes interessados que clicaram para falar com você</p>
              </div>

              <div className="rounded-2xl bg-[#0f172a] border border-[#38bdf8]/30 p-6">
                <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-[#67e8f9]">
                  <span>Aproveitamento do Site</span>
                  <TrendingUp className="w-5 h-5 text-[#67e8f9]" />
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-[#67e8f9] mt-2">{metrics.conversionRate}%</div>
                <p className="text-xs text-slate-300 mt-2">
                  De cada 100 pessoas que entram, cerca de{" "}
                  <strong className="text-white">{Math.round(metrics.conversionRate)}</strong> chamam no WhatsApp
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
                  const viewHeightPct = Math.max(6, Math.round((point.pageviews / maxDailyViews) * 100));
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
                      <span className="text-[9px] text-slate-400 mt-1.5 hidden md:block">{point.label.slice(0, 2)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <SiteExtras key={tenant.id} tenant={tenant} series={metrics.dailySeries} />
          </div>
        )}

        {/* EDIÇÃO RÁPIDA */}
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
                Pixels de anúncios (ferramentas, opcional)
              </div>
              {paid ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-200 mb-1">Pixel do Meta (Facebook/Instagram)</label>
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
                      <label className="block text-xs font-bold text-slate-200 mb-1">Google Tag (GA4 ou Google Ads)</label>
                      <input
                        type="text"
                        placeholder="Ex: G-ABC123XYZ ou AW-123456789"
                        value={bizGoogleTag}
                        onChange={(e) => setBizGoogleTag(e.target.value)}
                        className="w-full rounded-xl border border-white/15 bg-[#0f172a] px-3.5 py-2.5 text-sm font-mono text-white"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">IDs inválidos são ignorados.</p>
                </>
              ) : (
                <p className="text-xs text-slate-400">Disponível com as ferramentas (R$ 37/mês).</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">Nome da sua Empresa</label>
                <input
                  type="text"
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-[#0a0e17] px-3.5 py-2.5 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">WhatsApp que recebe os clientes</label>
                <input
                  type="text"
                  value={bizWhatsapp}
                  onChange={(e) => setBizWhatsapp(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-[#0a0e17] px-3.5 py-2.5 text-sm font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">O que você faz</label>
                <input
                  type="text"
                  value={bizCategory}
                  onChange={(e) => setBizCategory(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-[#0a0e17] px-3.5 py-2.5 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">Cidade e estado</label>
                <input
                  type="text"
                  value={bizCity}
                  onChange={(e) => setBizCity(e.target.value)}
                  placeholder="Campo Grande - MS"
                  className="w-full rounded-xl border border-white/15 bg-[#0a0e17] px-3.5 py-2.5 text-sm text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">Frase Principal do Topo do Site</label>
              <input
                type="text"
                value={bizHeadline}
                onChange={(e) => setBizHeadline(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-[#0a0e17] px-3.5 py-2.5 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">Texto de explicação abaixo da frase principal</label>
              <textarea
                rows={2}
                value={bizDescription}
                onChange={(e) => setBizDescription(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-[#0a0e17] p-3 text-sm text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">Endereço ou Região de Atendimento</label>
                <input
                  type="text"
                  value={bizAddress}
                  onChange={(e) => setBizAddress(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-[#0a0e17] px-3.5 py-2.5 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">Horário de Funcionamento</label>
                <input
                  type="text"
                  value={bizHours}
                  onChange={(e) => setBizHours(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-[#0a0e17] px-3.5 py-2.5 text-sm text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-2 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-[#67e8f9]" />
                <span>Cor de destaque do seu site:</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setBizColor(c.hex)}
                    className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold border cursor-pointer transition-all ${
                      bizColor === c.hex ? "border-white bg-white/15 text-white" : "border-white/10 bg-[#0a0e17] text-slate-300"
                    }`}
                  >
                    <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: c.hex }} />
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Edição rápida dos serviços */}
            <div className="space-y-2.5 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-[#67e8f9]">Serviços exibidos na sua página:</label>
                <button
                  type="button"
                  onClick={() =>
                    setServices((prev) => [...prev, { title: "", description: "", price_optional: "Orçamento no WhatsApp" }])
                  }
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Serviço</span>
                </button>
              </div>

              {services.map((srv, idx) => (
                <div key={idx} className="rounded-xl bg-[#0a0e17] border border-white/10 p-3 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={srv.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setServices((prev) => prev.map((item, i) => (i === idx ? { ...item, title: val } : item)));
                      }}
                      placeholder="Nome do serviço..."
                      className="flex-1 rounded-lg border border-white/10 bg-[#0f172a] px-3 py-1.5 text-xs text-white font-bold"
                    />
                    <input
                      type="text"
                      value={srv.price_optional || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setServices((prev) => prev.map((item, i) => (i === idx ? { ...item, price_optional: val } : item)));
                      }}
                      placeholder="Preço / Condição"
                      className="w-36 rounded-lg border border-white/10 bg-[#0f172a] px-3 py-1.5 text-xs text-emerald-300 font-bold"
                    />
                    {services.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setServices((prev) => prev.filter((_, i) => i !== idx))}
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
                      setServices((prev) => prev.map((item, i) => (i === idx ? { ...item, description: val } : item)));
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
                onClick={handleSave}
                className="rounded-xl bg-gradient-to-r from-[#06b6d4] to-[#6366f1] px-7 py-3 text-xs sm:text-sm font-extrabold text-white shadow-lg cursor-pointer disabled:opacity-60"
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
