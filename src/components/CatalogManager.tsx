"use client";

import { useCallback, useEffect, useState } from "react";
import { Globe, Loader2, Package, Pencil, Plus, Repeat, Trash2, Wrench, X } from "lucide-react";
import type { CatalogItem } from "@/types/catalog";
import type { TenantServiceItem } from "@/types/database.types";
import { centsToInput, formatBRL, inputToCents } from "@/lib/quoteUi";

const field =
  "w-full rounded-xl border border-white/10 bg-[#0a0e17] px-4 py-3 text-base text-white placeholder:text-slate-500 focus:border-[#67e8f9] focus:outline-none";

const UNITS = ["", "por unidade", "por ponto", "por hora", "por dia", "por m²", "por metro"];
const IDEAS = [
  { name: "Visita técnica", price: "80", unit: "", kind: "service" as const },
  { name: "Mão de obra", price: "120", unit: "por hora", kind: "service" as const },
  { name: "Ponto de tomada", price: "90", unit: "por ponto", kind: "service" as const },
];

const REVISIT = [
  { v: 0, l: "Não precisa" },
  { v: 30, l: "Daqui a 1 mês" },
  { v: 90, l: "Daqui a 3 meses" },
  { v: 180, l: "Daqui a 6 meses" },
  { v: 365, l: "Daqui a 1 ano" },
];

type Draft = { id?: string; kind: "service" | "product"; name: string; price: string; unit: string; site: boolean; revisit: number };
const blank: Draft = { kind: "service", name: "", price: "", unit: "", site: false, revisit: 0 };
const normName = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** Catálogo: o que o autônomo vende, com preço. Entra pronto no orçamento e o assistente usa. */
export function CatalogManager({ siteServices = [] }: { siteServices?: TenantServiceItem[] }) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/catalogo", { cache: "no-store" });
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.ok) setItems(d.items);
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch(draft.id ? `/api/catalogo/${draft.id}` : "/api/catalogo", {
        method: draft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: draft.kind,
          name: draft.name,
          price_cents: inputToCents(draft.price),
          unit: draft.unit,
          show_on_site: draft.site,
          revisit_days: draft.revisit || null,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) return setError(d.error || "Não foi possível salvar.");
      setItems((cur) => {
        const rest = cur.filter((x) => x.id !== d.item.id);
        return [...rest, d.item as CatalogItem].sort((a, b) => a.name.localeCompare(b.name));
      });
      setNote(d.warning || "");
      setDraft(null);
    } catch {
      setError("Sem conexão. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  const missing = siteServices.filter((s) => s.title && !items.some((i) => normName(i.name) === normName(s.title)));

  async function importSite() {
    setBusy(true);
    try {
      const r = await fetch("/api/catalogo/importar", { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) setItems(d.items);
    } finally {
      setBusy(false);
    }
  }

  async function remove(it: CatalogItem) {
    if (!confirm(`Apagar "${it.name}" do catálogo?`)) return;
    const r = await fetch(`/api/catalogo/${it.id}`, { method: "DELETE" });
    if (r.ok) setItems((cur) => cur.filter((x) => x.id !== it.id));
  }

  if (loading)
    return (
      <p className="flex items-center gap-2 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
      </p>
    );

  return (
    <div className="space-y-5">
      <p className="rounded-2xl border border-white/10 bg-[#0a0e17] p-4 text-sm text-slate-300">
        Cadastre uma vez o que você faz e vende, com o preço. Na hora do orçamento é só tocar no item, e o assistente também usa estes preços quando você não diz o valor.
      </p>

      {note && <p className="rounded-xl bg-amber-400/10 px-4 py-3 text-sm text-amber-200">{note}</p>}

      {!draft && missing.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-[#67e8f9]/40 bg-[#67e8f9]/10 p-4">
          <p className="font-extrabold">Seu site já tem {missing.length} serviço{missing.length > 1 ? "s" : ""}</p>
          <p className="text-sm text-slate-300">{missing.map((m) => m.title).join(", ")}. Traga para o catálogo e use nos orçamentos. Eles continuam no site.</p>
          <button onClick={importSite} disabled={busy} className="btn-shine inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-extrabold disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Trazer para o catálogo
          </button>
        </div>
      )}

      {draft ? (
        <form onSubmit={save} className="space-y-3 rounded-3xl border border-[#3b82f6]/40 bg-[#0f172a] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold">{draft.id ? "Editar item" : "Novo item"}</h2>
            <button type="button" onClick={() => setDraft(null)} aria-label="Fechar" className="rounded-full p-1.5 text-slate-400 hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {([["service", "Serviço", Wrench], ["product", "Produto", Package]] as const).map(([k, l, Icon]) => (
              <button
                key={k}
                type="button"
                onClick={() => setDraft({ ...draft, kind: k })}
                className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border font-bold ${draft.kind === k ? "border-[#67e8f9] bg-[#67e8f9]/10" : "border-white/15"}`}
              >
                <Icon className="h-4 w-4" /> {l}
              </button>
            ))}
          </div>
          <input className={field} placeholder="Nome (ex.: Instalação de chuveiro)" value={draft.name} maxLength={80} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={field} placeholder="Preço (R$)" inputMode="decimal" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
            <select className={field} value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })}>
              {UNITS.map((u) => <option key={u} value={u}>{u || "Sem unidade"}</option>)}
            </select>
          </div>
          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-[#0a0e17] px-4">
            <input type="checkbox" checked={draft.site} onChange={(e) => setDraft({ ...draft, site: e.target.checked })} className="h-5 w-5 accent-emerald-500" />
            <span className="text-sm"><b className="block">Mostrar no meu site</b><span className="text-slate-400">Aparece na lista de serviços do site público</span></span>
          </label>
          <label className="block space-y-1 text-sm font-bold text-slate-300">
            Voltar a falar com o cliente (manutenção ou revisão)
            <select className={field} value={draft.revisit} onChange={(e) => setDraft({ ...draft, revisit: Number(e.target.value) })}>
              {REVISIT.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
            </select>
            <span className="block text-xs font-normal text-slate-400">O app lembra você de chamar o cliente depois desse tempo, com a mensagem pronta.</span>
          </label>
          {error && <p className="text-sm font-bold text-red-300">{error}</p>}
          <button disabled={busy} className="btn-shine flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-6 font-extrabold disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
          </button>
        </form>
      ) : (
        <button onClick={() => setDraft(blank)} className="btn-shine flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-6 text-base font-extrabold">
          <Plus className="h-5 w-5" /> Novo item
        </button>
      )}

      {items.length === 0 ? (
        <div className="space-y-3 rounded-2xl border border-dashed border-white/15 p-5">
          <p className="text-sm text-slate-300">Nada cadastrado ainda. Comece por um destes (você ajusta o preço depois):</p>
          <div className="flex flex-wrap gap-2">
            {IDEAS.map((i) => (
              <button key={i.name} onClick={() => setDraft({ ...blank, ...i })} className="min-h-11 rounded-full border border-white/15 px-4 text-sm font-bold hover:bg-white/10">
                + {i.name}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0f172a] p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3b82f6]/15 text-[#67e8f9]">
                {it.kind === "product" ? <Package className="h-5 w-5" /> : <Wrench className="h-5 w-5" />}
              </span>
              <span className="min-w-0 flex-1">
                <b className="block truncate">{it.name}</b>
                <span className="text-sm text-slate-400">
                  {it.price_cents > 0 ? formatBRL(it.price_cents) : "Preço a combinar"}
                  {it.unit ? ` · ${it.unit}` : ""}
                </span>
                <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-400">
                  {it.show_on_site && <span className="inline-flex items-center gap-1 text-emerald-300"><Globe className="h-3 w-3" /> No site</span>}
                  {it.revisit_days && <span className="inline-flex items-center gap-1"><Repeat className="h-3 w-3" /> Rever em {it.revisit_days >= 360 ? "1 ano" : `${Math.round(it.revisit_days / 30)} meses`}</span>}
                </span>
              </span>
              <button onClick={() => setDraft({ id: it.id, kind: it.kind, name: it.name, price: centsToInput(it.price_cents), unit: it.unit || "", site: it.show_on_site, revisit: it.revisit_days || 0 })} aria-label="Editar" className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-300 hover:bg-white/10">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => remove(it)} aria-label="Apagar" className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-300">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
