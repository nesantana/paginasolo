"use client";

import { useState } from "react";
import { Check, Copy, Loader2, MessageCircle, Plus, Trash2, X } from "lucide-react";
import type { QuoteItem, QuoteRow, TenantServiceItem } from "@/types/database.types";
import {
  addDaysISO,
  centsToInput,
  formatBRL,
  inputToCents,
  priceTextToCents,
  quoteMessage,
  quoteUrl,
  whatsappLink,
} from "@/lib/quoteUi";

type Line = { title: string; qty: number; price: string };

type Props = {
  business: string;
  origin: string;
  services: TenantServiceItem[];
  onCreated: (q: QuoteRow) => void;
  onMarkSent: (id: string) => Promise<void>;
  onClose: () => void;
};

const FOLLOWUPS = [
  { label: "Sem lembrete", days: null },
  { label: "Amanhã", days: 1 },
  { label: "3 dias", days: 3 },
  { label: "7 dias", days: 7 },
  { label: "15 dias", days: 15 },
] as const;

const VALIDITY = [
  { label: "Sem prazo", days: null },
  { label: "7 dias", days: 7 },
  { label: "15 dias", days: 15 },
  { label: "30 dias", days: 30 },
] as const;

const field =
  "w-full rounded-xl border border-white/10 bg-[#0a0e17] px-4 py-3 text-base text-white placeholder:text-slate-500 focus:border-[#67e8f9] focus:outline-none";

const chip = (on: boolean) =>
  `rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
    on ? "btn-shine text-white" : "bg-white/10 text-slate-300 hover:bg-white/10"
  }`;

export function QuoteForm({ business, origin, services, onCreated, onMarkSent, onClose }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [notes, setNotes] = useState("");
  const [followDays, setFollowDays] = useState<number | null>(3);
  const [validDays, setValidDays] = useState<number | null>(15);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<QuoteRow | null>(null);
  const [copied, setCopied] = useState(false);

  const items: QuoteItem[] = lines
    .map((l) => ({ title: l.title.trim(), qty: l.qty, price_cents: inputToCents(l.price) }))
    .filter((i) => i.title);
  const total = items.reduce((n, i) => n + i.price_cents * i.qty, 0);

  const addService = (s: TenantServiceItem) =>
    setLines((l) => [
      ...l,
      { title: s.title, qty: 1, price: centsToInput(priceTextToCents(s.price_optional)) },
    ]);
  const update = (i: number, patch: Partial<Line>) =>
    setLines((l) => l.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/orcamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: name,
          customer_phone: phone,
          items,
          notes,
          valid_until: validDays ? addDaysISO(validDays) : null,
          followup_at: followDays ? addDaysISO(followDays) : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "Não foi possível criar o orçamento.");
        return;
      }
      setCreated(data.quote as QuoteRow);
      onCreated(data.quote as QuoteRow);
    } catch {
      setError("Sem conexão. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  // ---------- pronto: enviar ----------
  if (created) {
    const url = quoteUrl(origin, created.code);
    return (
      <div className="space-y-4 rounded-3xl border border-emerald-500/30 bg-[#0f172a] p-5 sm:p-6">
        <p className="flex items-center gap-2 text-lg font-extrabold text-emerald-300">
          <Check className="h-5 w-5" /> Orçamento criado
        </p>
        <p className="text-sm text-slate-300">
          Para <strong>{created.customer_name}</strong> ·{" "}
          {created.total_cents > 0 ? formatBRL(created.total_cents) : "valor a combinar"}
          {created.followup_at && " · lembrete de contato agendado"}
        </p>
        <p className="break-all rounded-xl bg-[#0a0e17] px-4 py-3 text-xs text-slate-400">{url}</p>
        <div className="flex flex-wrap gap-2">
          <a
            href={whatsappLink(
              created.customer_phone,
              quoteMessage({
                customer: created.customer_name,
                business,
                total_cents: created.total_cents,
                url,
              })
            )}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => void onMarkSent(created.id)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-sm font-extrabold text-zinc-950"
          >
            <MessageCircle className="h-5 w-5" /> Enviar pelo WhatsApp
          </a>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
              } catch {
                window.prompt("Copie o link:", url);
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-bold"
          >
            <Copy className="h-4 w-4" /> {copied ? "Copiado!" : "Copiar link"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-5 py-3 text-sm font-bold text-slate-400 hover:text-white"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  // ---------- formulário ----------
  return (
    <form
      onSubmit={submit}
      className="space-y-5 rounded-3xl border border-white/10 bg-[#0f172a] p-5 sm:p-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold">Novo orçamento</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className={field}
          placeholder="Nome do cliente"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
          required
        />
        <input
          className={field}
          placeholder="WhatsApp (DDD + número)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
          autoComplete="off"
          required
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-bold text-slate-300">O que você vai fazer</p>
        {services.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {services.map((s, i) => (
              <button
                key={`${s.title}-${i}`}
                type="button"
                onClick={() => addService(s)}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#0a0e17] px-3 py-1.5 text-left text-xs font-bold text-slate-200 hover:border-[#67e8f9] hover:bg-white/10"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                <span className="max-w-[16rem] truncate">{s.title}</span>
              </button>
            ))}
          </div>
        )}

        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto] gap-2 rounded-xl bg-[#0a0e17] p-3 sm:grid-cols-[1fr_5.5rem_8rem_auto]">
            <input
              className={`${field} col-span-2 sm:col-span-1`}
              value={l.title}
              onChange={(e) => update(i, { title: e.target.value })}
              placeholder="Descrição"
              aria-label="Descrição do item"
            />
            <input
              className={field}
              type="number"
              inputMode="numeric"
              min={1}
              max={999}
              value={l.qty}
              onChange={(e) => update(i, { qty: Math.max(1, Number(e.target.value) || 1) })}
              aria-label="Quantidade"
            />
            <input
              className={field}
              inputMode="decimal"
              value={l.price}
              onChange={(e) => update(i, { price: e.target.value })}
              placeholder="R$ valor"
              aria-label="Preço unitário"
            />
            <button
              type="button"
              onClick={() => setLines((x) => x.filter((_, k) => k !== i))}
              aria-label="Remover item"
              className="rounded-xl px-2.5 text-slate-400 hover:bg-red-500/10 hover:text-red-300"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setLines((l) => [...l, { title: "", qty: 1, price: "" }])}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-[#67e8f9] hover:text-[#67e8f9]"
        >
          <Plus className="h-4 w-4" /> Item avulso
        </button>

        {total > 0 && (
          <p className="text-right text-lg font-extrabold">
            Total <span className="text-[#67e8f9]">{formatBRL(total)}</span>
          </p>
        )}
      </div>

      <textarea
        className={field}
        rows={3}
        maxLength={600}
        placeholder="Observações (prazo de execução, forma de pagamento, garantia...)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-bold text-slate-300">Validade do orçamento</p>
          <div className="flex flex-wrap gap-2">
            {VALIDITY.map((v) => (
              <button key={v.label} type="button" onClick={() => setValidDays(v.days)} className={chip(validDays === v.days)}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-bold text-slate-300">Me lembrar de chamar em</p>
          <div className="flex flex-wrap gap-2">
            {FOLLOWUPS.map((v) => (
              <button key={v.label} type="button" onClick={() => setFollowDays(v.days)} className={chip(followDays === v.days)}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-500/15 px-4 py-3 text-sm font-semibold text-red-200">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="btn-shine text-white hover:brightness-110 flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 font-extrabold disabled:opacity-60"
      >
        {busy && <Loader2 className="h-5 w-5 animate-spin" />}
        {busy ? "Criando..." : "Criar orçamento"}
      </button>
    </form>
  );
}
