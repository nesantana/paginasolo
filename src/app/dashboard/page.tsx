"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, Loader2, LogOut, MessageSquare, Plus, Trash2, Users } from "lucide-react";
import { PublishButton } from "@/components/PublishButton";
import { SiteExtras } from "@/components/SiteExtras";
import { OwnerTools } from "@/components/OwnerTools";
import { BrandLogo } from "@/components/BrandLogo";
import type { TenantRow, TenantServiceItem } from "@/types/database.types";
import type { TenantDashboardSummary } from "@/lib/tenantStore";

const COLORS = [
  { label: "Azul", hex: "#2563eb" },
  { label: "Verde", hex: "#059669" },
  { label: "Laranja", hex: "#ea580c" },
  { label: "Vermelho", hex: "#e11d48" },
  { label: "Roxo", hex: "#7c3aed" },
  { label: "Dourado", hex: "#d97706" },
];

const field =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none";
const lbl = "block space-y-1 text-sm font-semibold text-slate-700";
const card = "rounded-2xl border border-slate-200 bg-white p-5 sm:p-6";

export default function ClientDashboardPage() {
  const [summary, setSummary] = useState<TenantDashboardSummary | null>(null);
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [hours, setHours] = useState("");
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#2563eb");
  const [metaPixel, setMetaPixel] = useState("");
  const [googleTag, setGoogleTag] = useState("");
  const [services, setServices] = useState<TenantServiceItem[]>([]);

  const fill = (t: TenantRow) => {
    setName(t.business_name);
    setWhatsapp(t.whatsapp_number);
    setCategory(t.category);
    setCity(t.city);
    setAddress(t.address || "");
    setHours(t.opening_hours || "");
    setHeadline(t.headline || "");
    setDescription(t.description || "");
    setColor(t.primary_color || "#2563eb");
    setMetaPixel(t.meta_pixel_id || "");
    setGoogleTag(t.google_tag_id || "");
    setServices(t.services && t.services.length ? t.services : [{ title: "", description: "", price_optional: "" }]);
  };

  const load = async (tenantId?: string) => {
    const res = await fetch(`/api/tenants${tenantId ? `?tenantId=${tenantId}` : ""}`, { cache: "no-store" });
    if (res.status === 401) {
      window.location.href = "/entrar";
      return;
    }
    const data = await res.json();
    if (data.tenant) {
      setSummary(data);
      fill(data.tenant);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const flash = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(""), 5000);
  };

  async function save() {
    if (!summary) return;
    if (!name.trim()) return flash("Digite o nome do seu negócio.");
    setSaving(true);
    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: summary.tenant.id,
          business_name: name.trim(),
          whatsapp_number: whatsapp.trim(),
          category: category.trim(),
          city: city.trim(),
          address: address.trim(),
          opening_hours: hours.trim(),
          headline: headline.trim(),
          description: description.trim(),
          primary_color: color,
          meta_pixel_id: metaPixel.trim(),
          google_tag_id: googleTag.trim(),
          slug: summary.tenant.slug,
          services: services.filter((s) => s.title.trim()),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok && data.tenant) {
        setSummary(data);
        flash("Pronto! Seu site já foi atualizado.");
      } else {
        flash(data.error || "Não foi possível salvar. Confira os campos.");
      }
    } catch {
      flash("Sem conexão. Tente de novo.");
    } finally {
      setSaving(false);
    }
  }

  if (!summary) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 text-slate-600">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Abrindo seu painel...
      </div>
    );
  }

  const { tenant, allTenants, metrics } = summary;
  const paid = tenant.is_active && tenant.subscription_status === "active";
  const siteUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/${tenant.slug}`;
  const shortUrl = siteUrl.replace(/^https?:\/\//, "");

  const setService = (i: number, patch: Partial<TenantServiceItem>) =>
    setServices((cur) => cur.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  return (
    <div className="min-h-dvh bg-slate-50 pb-16 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4">
          <Link href="/" aria-label="Meu Site Novo">
            <BrandLogo size={30} className="text-lg" />
          </Link>
          <div className="flex items-center gap-2">
            {allTenants.length > 1 && (
              <select
                value={tenant.id}
                onChange={(e) => load(e.target.value)}
                aria-label="Escolher site"
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm font-semibold"
              >
                {allTenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.business_name}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={async () => {
                await fetch("/api/sair", { method: "POST" }).catch(() => {});
                window.location.href = "/";
              }}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 pt-6">
        {toast && <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{toast}</div>}

        {/* 1. O SITE */}
        <section className={`${card} space-y-4`}>
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Seu site está no ar
            </span>
            <h1 className="mt-2 text-2xl font-bold">{tenant.business_name}</h1>
            <p className="text-sm text-slate-500">{shortUrl}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/${tenant.slug}`}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
            >
              Ver meu site <ExternalLink className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(siteUrl).catch(() => {});
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {copied ? "Link copiado" : "Copiar link"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
            <div>
              <p className="flex items-center gap-1.5 text-sm text-slate-500">
                <Users className="h-4 w-4" /> Visitas em 30 dias
              </p>
              <p className="text-3xl font-bold">{metrics.monthlyPageviews}</p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-sm text-slate-500">
                <MessageSquare className="h-4 w-4" /> Chamaram no WhatsApp
              </p>
              <p className="text-3xl font-bold text-emerald-600">{metrics.monthlyWhatsappClicks}</p>
            </div>
          </div>
        </section>

        {/* 2. FERRAMENTAS */}
        {!paid && (
          <section className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
            <h2 className="text-lg font-bold text-blue-950">
              {tenant.subscription_status === "draft" ? "Libere as ferramentas por R$ 37/mês" : "Suas ferramentas estão pausadas"}
            </h2>
            <ul className="space-y-1 text-sm text-blue-900">
              <li>• Agenda com aviso por e-mail no dia do serviço</li>
              <li>• Contrato simples e cobrança por Pix (antes e depois)</li>
              <li>• Orçamento por link e lembrete para chamar o cliente</li>
              <li>• Página de links para o Instagram e anúncios (Meta e Google)</li>
            </ul>
            <p className="text-sm text-blue-800">Seu site continua no ar de graça. Sem fidelidade.</p>
            <PublishButton
              label={tenant.subscription_status === "draft" ? "Liberar por R$ 37/mês" : "Reativar por R$ 37/mês"}
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            />
          </section>
        )}
        <OwnerTools key={tenant.id} tenant={tenant} />

        {/* 3. EDITAR */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Editar meu site</h2>

          <details className={card}>
            <summary className="cursor-pointer text-base font-bold">Informações e textos</summary>
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={lbl}>
                  Nome do negócio
                  <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
                </label>
                <label className={lbl}>
                  WhatsApp que recebe os clientes
                  <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className={field} inputMode="tel" />
                </label>
                <label className={lbl}>
                  O que você faz
                  <input value={category} onChange={(e) => setCategory(e.target.value)} className={field} placeholder="Ex.: Eletricista" />
                </label>
                <label className={lbl}>
                  Cidade e estado
                  <input value={city} onChange={(e) => setCity(e.target.value)} className={field} placeholder="Campo Grande - MS" />
                </label>
                <label className={lbl}>
                  Endereço ou região que atende
                  <input value={address} onChange={(e) => setAddress(e.target.value)} className={field} />
                </label>
                <label className={lbl}>
                  Horário de atendimento
                  <input value={hours} onChange={(e) => setHours(e.target.value)} className={field} />
                </label>
              </div>
              <label className={lbl}>
                Frase principal do topo do site
                <input value={headline} onChange={(e) => setHeadline(e.target.value)} className={field} />
              </label>
              <label className={lbl}>
                Texto de apoio
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={field} />
              </label>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700">Cor de destaque</p>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setColor(c.hex)}
                      aria-pressed={color === c.hex}
                      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold ${color === c.hex ? "border-slate-900 bg-slate-100" : "border-slate-300 bg-white hover:bg-slate-50"}`}
                    >
                      <span className="h-4 w-4 rounded-full" style={{ backgroundColor: c.hex }} /> {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </details>

          <details className={card}>
            <summary className="cursor-pointer text-base font-bold">Serviços e preços</summary>
            <div className="mt-4 space-y-3">
              {services.map((s, i) => (
                <div key={i} className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex gap-2">
                    <input value={s.title} onChange={(e) => setService(i, { title: e.target.value })} placeholder="Nome do serviço" className={field} />
                    {services.length > 1 && (
                      <button type="button" aria-label="Remover serviço" onClick={() => setServices((cur) => cur.filter((_, idx) => idx !== i))} className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-red-600">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
                    <input value={s.description} onChange={(e) => setService(i, { description: e.target.value })} placeholder="Explique em uma frase" className={field} />
                    <input value={s.price_optional || ""} onChange={(e) => setService(i, { price_optional: e.target.value })} placeholder="Preço (opcional)" className={field} />
                  </div>
                </div>
              ))}
              {services.length < 8 && (
                <button type="button" onClick={() => setServices((cur) => [...cur, { title: "", description: "", price_optional: "" }])} className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-700">
                  <Plus className="h-4 w-4" /> Adicionar serviço
                </button>
              )}
            </div>
          </details>

          <details className={card}>
            <summary className="cursor-pointer text-base font-bold">Anúncios (Meta e Google)</summary>
            <div className="mt-4 space-y-3">
              {paid ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className={lbl}>
                      Pixel do Meta (Facebook/Instagram)
                      <input value={metaPixel} onChange={(e) => setMetaPixel(e.target.value)} className={field} inputMode="numeric" placeholder="123456789012345" />
                    </label>
                    <label className={lbl}>
                      Google Tag (GA4 ou Google Ads)
                      <input value={googleTag} onChange={(e) => setGoogleTag(e.target.value)} className={field} placeholder="G-ABC123XYZ" />
                    </label>
                  </div>
                  <p className="text-xs text-slate-500">IDs inválidos são ignorados.</p>
                </>
              ) : (
                <p className="text-sm text-slate-600">Disponível com as ferramentas (R$ 37/mês).</p>
              )}
            </div>
          </details>

          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4 text-base font-bold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-5 w-5 animate-spin" />} Salvar alterações no site
          </button>

          <SiteExtras key={tenant.id} tenant={tenant} series={metrics.dailySeries} />
        </section>
      </main>
    </div>
  );
}
