"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SiteExtras } from "@/components/SiteExtras";
import { OwnerTools } from "@/components/OwnerTools";
import { TodayAgenda } from "@/components/TodayAgenda";
import { AssistantCard, AssistantChat } from "@/components/AssistantChat";
import type { TenantRow, TenantServiceItem } from "@/types/database.types";
import type { TenantDashboardSummary } from "@/lib/tenantStore";
import { BrandLogo } from "@/components/BrandLogo";
import {
  ExternalLink,
  CheckCircle2,
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
            <Link href="/" aria-label="autonomIA">
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
            {/* 0. Assistente: o destaque, com exemplos para quem não sabe o que pedir */}
            <AssistantCard paid={paid} />

            {/* 1. AGENDA: a primeira coisa do dia */}
            <TodayAgenda key={`agenda-${tenant.id}`} tenant={tenant} />

            {/* 2. Atalhos: contratos, orçamentos, links (+ quem chamar hoje) */}
            <OwnerTools key={tenant.id} tenant={tenant} />

            {/* 3. Meu site, em um cartão curto */}
            <div className="rounded-3xl bg-[#0f172a] border border-white/15 p-5 sm:p-6 space-y-4 shadow-xl">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-300">
                      Seu site está no ar
                    </span>
                  </div>
                  <h2 className="mt-2 truncate text-xl font-extrabold text-white">{tenant.business_name}</h2>
                  <p className="text-sm text-slate-400">
                    {metrics.monthlyPageviews} visitas · {metrics.monthlyWhatsappClicks} chamaram no WhatsApp (30 dias)
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/${tenant.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#0a0e17] hover:bg-white/10 px-4 py-2.5 text-sm font-extrabold text-white transition-all"
                  >
                    Ver meu site <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    type="button"
                    onClick={copySiteLink}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-[#0a0e17] hover:bg-white/10 px-4 py-2.5 text-sm font-extrabold text-white cursor-pointer transition-all"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-300">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-[#67e8f9]" />
                        <span>Copiar link</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={startQuickEdit}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#06b6d4] to-[#6366f1] hover:from-[#0891b2] hover:to-[#4f46e5] px-4 py-2.5 text-sm font-extrabold text-white cursor-pointer transition-all"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Editar textos e serviços</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Opções do site (visual, fotos, perguntas...) fechadas por padrão */}
            <details className="group rounded-3xl bg-[#0f172a] border border-white/15 p-5 sm:p-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-base font-extrabold [&::-webkit-details-marker]:hidden">
                <span>Mais opções do meu site</span>
                <span className="text-xs font-bold text-slate-400 group-open:hidden">visual, fotos, perguntas, cartaz</span>
                <span className="hidden text-xs font-bold text-slate-400 group-open:inline">fechar</span>
              </summary>
              <div className="mt-5">
              <SiteExtras key={tenant.id} tenant={tenant} series={metrics.dailySeries} />
              </div>
            </details>

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
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={srv.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setServices((prev) => prev.map((item, i) => (i === idx ? { ...item, title: val } : item)));
                      }}
                      placeholder="Nome do serviço..."
                      className="flex-1 rounded-lg border border-white/10 bg-[#0f172a] px-3 py-2 text-sm text-white font-bold"
                    />
                    <input
                      type="text"
                      value={srv.price_optional || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setServices((prev) => prev.map((item, i) => (i === idx ? { ...item, price_optional: val } : item)));
                      }}
                      placeholder="Preço / Condição"
                      className="w-full sm:w-36 rounded-lg border border-white/10 bg-[#0f172a] px-3 py-1.5 text-xs text-emerald-300 font-bold"
                    />
                    {services.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setServices((prev) => prev.filter((_, i) => i !== idx))}
                        className="self-end sm:self-auto text-rose-400 p-2 cursor-pointer"
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

            <div className="sticky bottom-0 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 mt-2 flex justify-end gap-3 rounded-b-3xl border-t border-white/10 bg-[#0f172a]/95 px-6 sm:px-8 py-4 backdrop-blur">
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
                className="flex-1 sm:flex-none rounded-xl bg-gradient-to-r from-[#06b6d4] to-[#6366f1] px-7 py-3.5 text-sm font-extrabold text-white shadow-lg cursor-pointer disabled:opacity-60"
              >
                {saving ? "Salvando..." : "Salvar Alterações no Site"}
              </button>
            </div>
          </div>
        )}
      </main>
      {mode === "overview" && <AssistantChat key={tenant.id} paid={paid} />}
    </div>
  );
}
