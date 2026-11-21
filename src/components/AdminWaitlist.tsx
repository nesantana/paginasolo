"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Loader2, MessageCircle, Search, Trash2 } from "lucide-react";
import { whatsappLink } from "@/lib/quoteUi";

type Item = { id: string; name: string; phone: string; profession: string | null; created_at: string };

const prettyPhone = (p: string) => {
  const d = p.replace(/^55/, "");
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
};

export function AdminWaitlist({ onToast }: { onToast: (m: string) => void }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/admin/lista-espera", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => (d.ok ? setItems(d.items) : setError(d.error || "Falha ao carregar.")))
      .catch(() => setError("Sem conexão."));
  }, []);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return items || [];
    return (items || []).filter((i) => `${i.name} ${i.phone} ${i.profession || ""}`.toLowerCase().includes(t));
  }, [items, q]);

  if (error) return <p className="text-sm font-bold text-red-300">{error}</p>;
  if (!items)
    return (
      <p className="flex items-center gap-2 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
      </p>
    );

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const msg = (name: string) =>
    `Olá, ${name.trim().split(/\s+/)[0]}! Aqui é da autonomIA. A gente abriu hoje! Você estava na lista de espera. Entre por aqui para criar seu acesso: ${origin}/criar`;

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(shown.map((i) => `${i.name} - ${prettyPhone(i.phone)}`).join("\n"));
      onToast("Lista copiada.");
    } catch {
      onToast("Não consegui copiar.");
    }
  }

  async function remove(i: Item) {
    if (!confirm(`Tirar ${i.name} da lista?`)) return;
    const res = await fetch(`/api/admin/lista-espera?id=${i.id}`, { method: "DELETE" });
    if (res.ok) setItems((c) => (c || []).filter((x) => x.id !== i.id));
    else onToast("Não foi possível apagar.");
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold">Lista de espera ({items.length})</h2>
        {shown.length > 0 && (
          <button onClick={copyAll} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-bold hover:bg-white/10">
            <Copy className="h-4 w-4" /> Copiar lista
          </button>
        )}
      </div>

      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nome, telefone ou profissão" className="w-full rounded-xl border border-white/15 bg-[#0f172a] py-3 pl-9 pr-3 text-base text-white placeholder:text-slate-500" />
      </label>

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-400">
          {items.length === 0 ? "Ninguém na lista ainda." : "Nada encontrado."}
        </p>
      ) : (
        <ul className="space-y-2">
          {shown.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0f172a] p-4">
              <div className="min-w-0">
                <p className="font-extrabold">{i.name}</p>
                <p className="text-sm text-slate-300">
                  {prettyPhone(i.phone)}
                  {i.profession ? ` · ${i.profession}` : ""}
                </p>
                <p className="text-xs text-slate-500">{new Date(i.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p>
              </div>
              <div className="flex items-center gap-2">
                <a href={whatsappLink(i.phone, msg(i.name))} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-extrabold text-zinc-950 hover:brightness-110">
                  <MessageCircle className="h-4 w-4" /> Avisar
                </a>
                <button onClick={() => remove(i)} aria-label="Tirar da lista" className="grid h-11 w-11 place-items-center rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-300">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
