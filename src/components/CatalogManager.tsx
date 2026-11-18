"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Package, Pencil, Plus, Trash2, Wrench, X } from "lucide-react";
import type { CatalogItem } from "@/types/catalog";
import { centsToInput, formatBRL, inputToCents } from "@/lib/quoteUi";

const field =
  "w-full rounded-xl border border-white/10 bg-[#0a0e17] px-4 py-3 text-base text-white placeholder:text-slate-500 focus:border-[#67e8f9] focus:outline-none";

const UNITS = ["", "por unidade", "por ponto", "por hora", "por dia", "por m²", "por metro"];
const IDEAS = [
  { name: "Visita técnica", price: "80", unit: "", kind: "service" as const },
  { name: "Mão de obra", price: "120", unit: "por hora", kind: "service" as const },
  { name: "Ponto de tomada", price: "90", unit: "por ponto", kind: "service" as const },
];

type Draft = { id?: string; kind: "service" | "product"; name: string; price: string; unit: string };
const blank: Draft = { kind: "service", name: "", price: "", unit: "" };

/** Catálogo: o que o autônomo vende, com preço. Entra pronto no orçamento e o assistente usa. */
export function CatalogManager() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
        body: JSON.stringify({ kind: draft.kind, name: draft.name, price_cents: inputToCents(draft.price), unit: draft.unit }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) return setError(d.error || "Não foi possível salvar.");
      setItems((cur) => {
        const rest = cur.filter((x) => x.id !== d.item.id);
        return [...rest, d.item as CatalogItem].sort((a, b) => a.name.localeCompare(b.name));
      });
      setDraft(null);
    } catch {
      setError("Sem conexão. Tente de novo.");
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
              <button key={i.name} onClick={() => setDraft({ ...i })} className="min-h-11 rounded-full border border-white/15 px-4 text-sm font-bold hover:bg-white/10">
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
              </span>
              <button onClick={() => setDraft({ id: it.id, kind: it.kind, name: it.name, price: centsToInput(it.price_cents), unit: it.unit || "" })} aria-label="Editar" className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-300 hover:bg-white/10">
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
