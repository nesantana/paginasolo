"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, CalendarDays, Check, ChevronDown, ChevronUp, FileText, Loader2, MapPin, MessageCircle, Phone, Plus, Trash2, X,
} from "lucide-react";
import type { TenantRow } from "@/types/database.types";
import type { Followup, VisitItem, VisitRow } from "@/types/finance";
import { formatBRL, formatDateBR, whatsappLink } from "@/lib/quoteUi";
import { openAssistant } from "@/components/AssistantChat";

const field =
  "w-full rounded-xl border border-white/15 bg-[#0f172a] px-3.5 py-3 text-base text-white placeholder:text-slate-500 focus:border-[#67e8f9] focus:outline-none";
const lbl = "block space-y-1 text-sm font-semibold text-slate-200";
const smallBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-[#0f172a] px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-white/10 disabled:opacity-60";

const first = (n: string) => n.trim().split(/\s+/)[0] || n;
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : "");

/** "1.250,50" ou "1250.5" → centavos */
export function reaisToCents(v: string): number {
  const s = v.trim().replace(/[^\d.,]/g, "");
  if (!s) return 0;
  const n = s.includes(",") ? Number(s.replace(/\./g, "").replace(",", ".")) : Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
const centsToField = (c: number) => (c > 0 ? (c / 100).toFixed(2).replace(".", ",") : "");

type ItemDraft = { title: string; qty: string; price: string };
const toDraft = (i: VisitItem): ItemDraft => ({ title: i.title, qty: String(i.qty), price: centsToField(i.price_cents) });
const fromDraft = (d: ItemDraft): VisitItem => ({
  title: d.title.trim(),
  qty: Math.max(1, Math.round(Number(d.qty) || 1)),
  price_cents: reaisToCents(d.price),
});

function VisitCard({
  v, tenant, today, open, onToggle, onChange, onDelete,
}: {
  v: VisitRow;
  tenant: TenantRow;
  today: string;
  open: boolean;
  onToggle: () => void;
  onChange: (v: VisitRow) => void;
  onDelete: (id: string) => void;
}) {
  const [note, setNote] = useState("");
  const [items, setItems] = useState<ItemDraft[]>(() => v.items.map(toDraft));
  const [itemsDirty, setItemsDirty] = useState(false);
  const [follow, setFollow] = useState(v.followup_at || "");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  const converted = Boolean(v.quote_id);
  const total = useMemo(() => items.map(fromDraft).filter((i) => i.title).reduce((s, i) => s + i.qty * i.price_cents, 0), [items]);

  async function patch(body: Record<string, unknown>, tag: string): Promise<VisitRow | null> {
    setBusy(tag);
    setErr("");
    try {
      const res = await fetch(`/api/visitas/${v.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) {
        setErr(d.error || "Não foi possível salvar.");
        return null;
      }
      onChange(d.visit);
      return d.visit as VisitRow;
    } finally {
      setBusy("");
    }
  }

  async function addNote() {
    const t = note.trim();
    if (!t) return;
    if (await patch({ add_note: t }, "note")) setNote("");
  }

  async function saveItems() {
    const clean = items.map(fromDraft).filter((i) => i.title);
    const r = await patch({ items: clean }, "items");
    if (r) {
      setItems(r.items.map(toDraft));
      setItemsDirty(false);
    }
  }

  async function makeQuote() {
    setBusy("quote");
    setErr("");
    try {
      const clean = items.map(fromDraft).filter((i) => i.title);
      if (clean.length === 0) return setErr("Coloque ao menos um item (pode transformar uma anotação em item).");
      if (clean.some((i) => i.price_cents <= 0)) return setErr("Falta o preço de algum item.");
      if (itemsDirty) {
        const r = await fetch(`/api/visitas/${v.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: clean }) });
        if (!r.ok) return setErr("Não foi possível salvar os itens.");
      }
      const res = await fetch(`/api/visitas/${v.id}/orcamento`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) return setErr(d.error || "Não foi possível gerar o orçamento.");
      onChange({ ...v, items: clean.map((i) => i), quote_id: d.quote.id, status: "done" });
      setItemsDirty(false);
    } finally {
      setBusy("");
    }
  }

  const border = converted ? "border-emerald-400/30" : v.status === "done" ? "border-white/10" : "border-[#3b82f6]/40";

  return (
    <li className={`rounded-2xl border bg-[#0a0e17] ${border}`}>
      <button type="button" onClick={onToggle} className="flex w-full items-start justify-between gap-3 p-4 text-left">
        <span className="min-w-0">
          <span className="block font-extrabold">{v.customer_name}</span>
          <span className="mt-0.5 block text-sm text-slate-300">
            {v.starts_on === today ? "Hoje" : formatDateBR(v.starts_on)}
            {v.start_time ? ` às ${hhmm(v.start_time)}` : ""}
            {v.notes.length > 0 ? ` · ${v.notes.length} anotaç${v.notes.length > 1 ? "ões" : "ão"}` : ""}
          </span>
          <span className="mt-1.5 flex flex-wrap gap-1.5">
            {converted && <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-300">Orçamento gerado</span>}
            {!converted && v.status === "done" && <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold text-slate-300">Concluída</span>}
            {v.followup_at && !v.followup_done_at && !converted && (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${v.followup_at < today ? "bg-red-500/15 text-red-300" : "bg-amber-400/15 text-amber-300"}`}>
                Chamar de volta {v.followup_at === today ? "hoje" : formatDateBR(v.followup_at).slice(0, 5)}
              </span>
            )}
          </span>
        </span>
        {open ? <ChevronUp className="mt-1 h-5 w-5 shrink-0 text-slate-400" /> : <ChevronDown className="mt-1 h-5 w-5 shrink-0 text-slate-400" />}
      </button>

      {open && (
        <div className="space-y-5 border-t border-white/10 p-4">
          <div className="flex flex-wrap gap-2 text-sm">
            {v.address && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[#67e8f9] hover:underline"
              >
                <MapPin className="h-4 w-4" /> {v.address}
              </a>
            )}
            {v.customer_phone && (
              <>
                <a href={`tel:+${v.customer_phone}`} className={smallBtn}>
                  <Phone className="h-3.5 w-3.5" /> Ligar
                </a>
                <a href={whatsappLink(v.customer_phone, `Olá, ${first(v.customer_name)}! Aqui é da ${tenant.business_name}.`)} target="_blank" rel="noopener noreferrer" className={smallBtn}>
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-400" /> WhatsApp
                </a>
              </>
            )}
          </div>

          {/* anotações */}
          <section className="space-y-2">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">Anotações</h3>
            {v.notes.length === 0 && <p className="text-sm text-slate-400">Nada anotado ainda. Escreva abaixo, ou peça ao assistente: &ldquo;anota que precisa trocar o disjuntor&rdquo;.</p>}
            <ul className="space-y-2">
              {v.notes.map((n) => (
                <li key={n.id} className="flex items-start gap-2 rounded-xl bg-white/5 px-3 py-2.5 text-sm">
                  <span className="min-w-0 flex-1 text-slate-100">{n.text}</span>
                  {!converted && (
                    <button
                      type="button"
                      onClick={() => {
                        setItems((cur) => [...cur, { title: n.text.slice(0, 140), qty: "1", price: "" }]);
                        setItemsDirty(true);
                      }}
                      className="shrink-0 rounded-lg border border-[#3b82f6]/50 px-2.5 py-1.5 text-xs font-bold text-[#a5f3fc] hover:bg-[#3b82f6]/10"
                    >
                      Virar item
                    </button>
                  )}
                  <button type="button" onClick={() => patch({ remove_note: n.id }, "rm")} aria-label="Apagar anotação" className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-white/10">
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void addNote()}
                placeholder="Anotar algo da visita..."
                className={field}
                maxLength={600}
              />
              <button type="button" onClick={addNote} disabled={!note.trim() || busy === "note"} className="shrink-0 rounded-xl bg-[#3b82f6] px-4 text-sm font-extrabold text-white hover:brightness-110 disabled:opacity-50">
                {busy === "note" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Anotar"}
              </button>
            </div>
          </section>

          {/* itens do orçamento */}
          {!converted ? (
            <section className="space-y-2">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">Itens do orçamento</h3>
              {items.length === 0 && <p className="text-sm text-slate-400">Toque em &ldquo;Virar item&rdquo; numa anotação, ou adicione um item.</p>}
              <ul className="space-y-2">
                {items.map((it, i) => (
                  <li key={i} className="space-y-2 rounded-xl bg-white/5 p-3">
                    <input
                      value={it.title}
                      onChange={(e) => { setItems((c) => c.map((x, j) => (j === i ? { ...x, title: e.target.value } : x))); setItemsDirty(true); }}
                      placeholder="O que será feito"
                      className={field}
                      maxLength={140}
                    />
                    <div className="grid grid-cols-[5rem_1fr_auto] items-center gap-2">
                      <input
                        value={it.qty}
                        onChange={(e) => { setItems((c) => c.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x))); setItemsDirty(true); }}
                        inputMode="numeric"
                        aria-label="Quantidade"
                        className={field}
                      />
                      <input
                        value={it.price}
                        onChange={(e) => { setItems((c) => c.map((x, j) => (j === i ? { ...x, price: e.target.value } : x))); setItemsDirty(true); }}
                        inputMode="decimal"
                        placeholder="Preço R$"
                        aria-label="Preço de cada"
                        className={field}
                      />
                      <button type="button" onClick={() => { setItems((c) => c.filter((_, j) => j !== i)); setItemsDirty(true); }} aria-label="Tirar item" className="rounded-lg p-2.5 text-slate-400 hover:bg-white/10">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button type="button" onClick={() => { setItems((c) => [...c, { title: "", qty: "1", price: "" }]); setItemsDirty(true); }} className={smallBtn}>
                  <Plus className="h-4 w-4" /> Adicionar item
                </button>
                <p className="text-base font-extrabold">Total: {formatBRL(total)}</p>
              </div>
              {itemsDirty && (
                <button type="button" onClick={saveItems} disabled={busy === "items"} className={`${smallBtn} w-full`}>
                  {busy === "items" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Guardar itens
                </button>
              )}
              {!v.customer_phone && (
                <label className={lbl}>
                  Telefone do cliente (o orçamento precisa)
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="(67) 99999-9999" className={field} />
                </label>
              )}
              <button
                type="button"
                onClick={makeQuote}
                disabled={busy === "quote"}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3.5 text-base font-extrabold text-zinc-950 hover:bg-emerald-400 disabled:opacity-60"
              >
                {busy === "quote" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Gerar orçamento
              </button>
            </section>
          ) : (
            <Link href="/dashboard/orcamentos" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/15 px-5 py-3.5 text-base font-extrabold text-emerald-300 hover:bg-emerald-500/25">
              Ver e enviar o orçamento <ArrowRight className="h-4 w-4" />
            </Link>
          )}

          {/* retorno */}
          {!converted && (
            <section className="space-y-2">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">Chamar o cliente de volta</h3>
              <div className="flex flex-wrap gap-2">
                <input type="date" value={follow} onChange={(e) => setFollow(e.target.value)} className={`${field} !w-auto min-w-[10rem] flex-1`} />
                <button type="button" onClick={() => patch({ followup_at: follow || null }, "follow")} disabled={busy === "follow" || follow === (v.followup_at || "")} className={smallBtn}>
                  {busy === "follow" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />} {follow ? "Salvar retorno" : "Tirar retorno"}
                </button>
                {v.followup_at && !v.followup_done_at && (
                  <button type="button" onClick={() => patch({ followup_done: true }, "fdone")} className={smallBtn}>
                    <Check className="h-4 w-4 text-emerald-400" /> Já chamei
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400">O retorno aparece no calendário, no dia escolhido.</p>
            </section>
          )}

          {err && <p className="rounded-xl bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-300">{err}</p>}

          <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
            {!converted && v.status === "scheduled" && (
              <button type="button" onClick={() => patch({ status: "done" }, "done")} className={smallBtn}>
                <Check className="h-4 w-4 text-emerald-400" /> Visita feita
              </button>
            )}
            {v.status === "done" && !converted && (
              <button type="button" onClick={() => patch({ status: "scheduled" }, "reopen")} className={smallBtn}>
                Reabrir
              </button>
            )}
            <button
              type="button"
              onClick={() => { if (confirm(`Apagar a visita de ${v.customer_name}? As anotações somem junto.`)) onDelete(v.id); }}
              className={`${smallBtn} text-red-300`}
            >
              <Trash2 className="h-4 w-4" /> Apagar
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export function VisitsManager({ tenant }: { tenant: TenantRow }) {
  const [today, setToday] = useState("");
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState({ customer_name: "", customer_phone: "", address: "", starts_on: "", start_time: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const d = await fetch("/api/visitas", { cache: "no-store" }).then((r) => r.json()).catch(() => null);
    if (d?.ok) {
      setToday(d.today);
      setVisits(d.visits);
      setFollowups(d.followups);
      const qs = new URLSearchParams(window.location.search);
      const dia = qs.get("dia");
      setForm((f) => ({ ...f, starts_on: f.starts_on || (dia && /^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia : d.today) }));
      if (qs.get("novo")) setAdding(true);
      const want = qs.get("visita");
      if (want) setOpenId(want);
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    setSaving(true);
    setErr("");
    try {
      const res = await fetch("/api/visitas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) return setErr(d.error || "Não foi possível salvar.");
      setVisits((c) => [d.visit, ...c]);
      setOpenId(d.visit.id);
      setAdding(false);
      setForm({ customer_name: "", customer_phone: "", address: "", starts_on: today, start_time: "" });
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/visitas/${id}`, { method: "DELETE" });
    if (res.ok) {
      setVisits((c) => c.filter((x) => x.id !== id));
      setFollowups((c) => c.filter((f) => f.id !== id));
    }
  }

  const sorted = useMemo(() => {
    const rank = (v: VisitRow) => (v.quote_id ? 2 : v.status === "scheduled" ? 0 : 1);
    return [...visits].sort((a, b) => rank(a) - rank(b) || b.starts_on.localeCompare(a.starts_on));
  }, [visits]);

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => setAdding((a) => !a)} className="inline-flex items-center gap-2 rounded-xl btn-shine px-5 py-3.5 text-base font-extrabold text-white hover:brightness-110">
          <Plus className="h-5 w-5" /> Nova visita técnica
        </button>
        <button
          type="button"
          onClick={() => openAssistant({ fill: "Estou na casa do cliente NOME. Anota: " })}
          className="inline-flex items-center gap-2 rounded-xl border border-[#67e8f9]/50 px-5 py-3.5 text-base font-extrabold text-[#a5f3fc] hover:bg-[#3b82f6]/10"
        >
          Anotar pelo assistente
        </button>
      </div>

      {adding && (
        <section className="space-y-3 rounded-2xl border border-white/15 bg-[#0f172a] p-4">
          <label className={lbl}>
            Nome do cliente
            <input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className={field} maxLength={80} autoFocus />
          </label>
          <label className={lbl}>
            Telefone (opcional agora)
            <input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} inputMode="tel" placeholder="(67) 99999-9999" className={field} />
          </label>
          <label className={lbl}>
            Endereço (opcional)
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={field} maxLength={200} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className={lbl}>
              Dia
              <input type="date" value={form.starts_on} onChange={(e) => setForm({ ...form, starts_on: e.target.value })} className={field} />
            </label>
            <label className={lbl}>
              Hora (opcional)
              <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className={field} />
            </label>
          </div>
          {err && <p className="text-sm font-semibold text-red-300">{err}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={create} disabled={saving} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3.5 text-base font-extrabold text-zinc-950 hover:bg-emerald-400 disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Salvar visita
            </button>
            <button type="button" onClick={() => setAdding(false)} className={smallBtn}>
              Cancelar
            </button>
          </div>
        </section>
      )}

      {sorted.length === 0 && !adding ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-slate-300">
          <p className="font-bold">Nenhuma visita técnica ainda.</p>
          <p className="mt-1 text-sm text-slate-400">
            Marque a visita, anote o que precisa ser feito e transforme em orçamento com um toque.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {sorted.map((v) => (
            <VisitCard
              key={v.id}
              v={v}
              tenant={tenant}
              today={today}
              open={openId === v.id}
              onToggle={() => setOpenId((c) => (c === v.id ? null : v.id))}
              onChange={(nv) => setVisits((c) => c.map((x) => (x.id === nv.id ? nv : x)))}
              onDelete={remove}
            />
          ))}
        </ul>
      )}
      {followups.length > 0 && <p className="text-xs text-slate-500">Os retornos pendentes aparecem no calendário do painel.</p>}
    </div>
  );
}
