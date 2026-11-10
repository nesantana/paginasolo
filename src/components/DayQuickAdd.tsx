"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import type { AppointmentRow, ContractWithPayments } from "@/types/finance";
import type { QuoteRow } from "@/types/database.types";
import { DURATIONS, warningsFor, type Warning } from "@/lib/agendaConflicts";
import { formatDateBR } from "@/lib/quoteUi";

const field = "w-full rounded-xl border border-white/15 bg-[#0f172a] px-3.5 py-3 text-base text-white placeholder:text-slate-500";

/** Marcar um serviço direto no dia clicado do calendário, podendo vincular contrato ou orçamento aceito. */
export function DayQuickAdd({
  day, today, items, contracts, quotes, onCreated, onClose,
}: {
  day: string;
  today: string;
  items: AppointmentRow[];
  contracts: ContractWithPayments[];
  quotes: QuoteRow[];
  onCreated: (a: AppointmentRow) => void;
  onClose: () => void;
}) {
  const [link, setLink] = useState(""); // "c:<id>" | "q:<id>" | ""
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [serverWarn, setServerWarn] = useState<Warning[]>([]);

  const linkable = contracts.filter((c) => c.status !== "cancelled" && c.status !== "completed");
  const others = useMemo(() => items.filter((a) => a.status !== "cancelled"), [items]);
  const warnings = useMemo(
    () => warningsFor({ customer_name: customer.trim() || "Cliente", starts_on: day, start_time: time || null, duration_min: duration }, others, today),
    [customer, day, time, duration, others, today]
  );
  const shown = serverWarn.length ? serverWarn : warnings;

  function pick(v: string) {
    setLink(v);
    setServerWarn([]);
    if (v.startsWith("c:")) {
      const c = contracts.find((x) => x.id === v.slice(2));
      if (!c) return;
      setCustomer(c.customer_name);
      setPhone(c.customer_phone.replace(/^55/, ""));
      setTitle(c.title);
    } else if (v.startsWith("q:")) {
      const q = quotes.find((x) => x.id === v.slice(2));
      if (!q) return;
      setCustomer(q.customer_name);
      setPhone(q.customer_phone.replace(/^55/, ""));
      setTitle(q.items?.[0]?.title || "Serviço");
    }
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contract_id: link.startsWith("c:") ? link.slice(2) : null,
          customer_name: customer,
          customer_phone: phone,
          title,
          starts_on: day,
          start_time: time || null,
          duration_min: duration,
          force: shown.length > 0,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.status === 409 && d.needsConfirm) return setServerWarn(d.warnings as Warning[]);
      if (!res.ok || !d.ok) return setError(d.error || "Não foi possível salvar.");
      onCreated(d.appointment);
    } catch {
      setError("Sem conexão. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-[#3b82f6]/40 bg-[#3b82f6]/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-extrabold">Marcar serviço em {formatDateBR(day)}</p>
        <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-lg p-2 text-slate-300 hover:bg-white/10">
          <X className="h-5 w-5" />
        </button>
      </div>

      {(linkable.length > 0 || quotes.length > 0) && (
        <label className="block space-y-1">
          <span className="text-sm font-bold text-slate-200">Ligar a um contrato ou orçamento (opcional)</span>
          <select value={link} onChange={(e) => pick(e.target.value)} className={field}>
            <option value="">Nenhum, digitar os dados</option>
            {linkable.length > 0 && (
              <optgroup label="Contratos">
                {linkable.map((c) => (
                  <option key={c.id} value={`c:${c.id}`}>{c.customer_name} · {c.title}</option>
                ))}
              </optgroup>
            )}
            {quotes.length > 0 && (
              <optgroup label="Orçamentos aceitos">
                {quotes.map((q) => (
                  <option key={q.id} value={`q:${q.id}`}>{q.customer_name} · {q.items?.[0]?.title || "Serviço"}</option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
      )}

      <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Nome do cliente" className={field} />
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="O que vai fazer (ex.: trocar chuveiro)" className={field} />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="WhatsApp do cliente (opcional)" className={field} />
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-sm font-bold text-slate-200">Horário</span>
          <input type="time" value={time} onChange={(e) => { setTime(e.target.value); setServerWarn([]); }} className={field} />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-bold text-slate-200">Duração</span>
          <select value={duration} onChange={(e) => { setDuration(Number(e.target.value)); setServerWarn([]); }} className={field}>
            {DURATIONS.map((d) => (
              <option key={d.min} value={d.min}>{d.label}</option>
            ))}
          </select>
        </label>
      </div>

      {shown.length > 0 && (
        <ul className="space-y-1.5">
          {shown.map((w) => (
            <li key={w.kind + w.text} className="flex items-start gap-2 rounded-xl bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {w.text}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-sm font-bold text-red-300">{error}</p>}

      <button
        type="button"
        onClick={save}
        disabled={busy || !customer.trim() || !title.trim()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl btn-shine px-5 py-3.5 text-base font-extrabold text-white disabled:opacity-50"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {shown.length > 0 ? "Salvar mesmo assim" : "Salvar no calendário"}
      </button>
    </div>
  );
}
