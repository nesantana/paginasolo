"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import type { VisitRow } from "@/types/finance";

const field =
  "w-full rounded-xl border border-white/15 bg-[#0f172a] px-3.5 py-3 text-base text-white placeholder:text-slate-500 focus:border-[#67e8f9] focus:outline-none";
const lbl = "block min-w-0 space-y-1 text-sm font-semibold text-slate-200";

/** Cadastro rápido de visita técnica (usado dentro de uma tela por cima). */
export function NewVisitForm({ day, onCreated, onClose }: { day: string; onCreated: (v: VisitRow) => void; onClose: () => void }) {
  const [form, setForm] = useState({ customer_name: "", customer_phone: "", address: "", starts_on: day, start_time: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setSaving(true);
    setErr("");
    try {
      const res = await fetch("/api/visitas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) return setErr(d.error || "Não foi possível salvar.");
      onCreated(d.visit);
    } catch {
      setErr("Sem conexão. Tente de novo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-extrabold">Marcar visita técnica</h2>
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
      <label className={lbl}>
        Dia
        <input type="date" value={form.starts_on} onChange={(e) => setForm({ ...form, starts_on: e.target.value })} className={field} />
      </label>
      <label className={lbl}>
        Hora (opcional)
        <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className={field} />
      </label>
      {err && <p className="text-sm font-semibold text-red-300">{err}</p>}
      <div className="flex flex-col gap-2">
        <button type="button" onClick={save} disabled={saving || !form.customer_name.trim() || !form.starts_on} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 text-base font-extrabold text-zinc-950 hover:bg-emerald-400 disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Salvar visita
        </button>
        <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-white/15 px-5 text-sm font-bold text-slate-200 hover:bg-white/10">
          Cancelar
        </button>
      </div>
    </div>
  );
}
