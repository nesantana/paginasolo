"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import type { QuoteRow } from "@/types/database.types";
import type { ContractWithPayments } from "@/types/finance";
import { buildPlan, type InstallmentDraft } from "@/lib/contractUi";
import { addDaysISO, centsToInput, formatBRL, inputToCents, todayISO } from "@/lib/quoteUi";

const input =
  "w-full rounded-xl border border-white/10 bg-[#0a0e17] px-3.5 py-3 text-base text-white placeholder:text-slate-500 focus:border-[#67e8f9] focus:outline-none";
const label = "block space-y-1 text-xs font-bold text-slate-300";

const PRESETS: { id: string; name: string; hint: string; pct: number; balance: "completion" | "installments"; n: number }[] = [
  { id: "inicio", name: "Tudo no início", hint: "100% antes de começar", pct: 100, balance: "completion", n: 1 },
  { id: "final", name: "Tudo no final", hint: "100% na entrega", pct: 0, balance: "completion", n: 1 },
  { id: "meio", name: "50% + 50%", hint: "Entrada e saldo na entrega", pct: 50, balance: "completion", n: 1 },
  { id: "parcelas", name: "Parcelado", hint: "Entrada + parcelas mensais", pct: 30, balance: "installments", n: 3 },
];

export function ContractForm({
  quotes,
  onCreated,
  onCancel,
}: {
  quotes: QuoteRow[];
  onCreated: (c: ContractWithPayments) => void;
  onCancel: () => void;
}) {
  const [quoteId, setQuoteId] = useState("");
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [doc, setDoc] = useState("");
  const [address, setAddress] = useState("");
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState("");
  const [total, setTotal] = useState("");
  const [delivery, setDelivery] = useState("");
  const [extra, setExtra] = useState("");

  const [preset, setPreset] = useState("meio");
  const [pct, setPct] = useState(50);
  const [balance, setBalance] = useState<"completion" | "installments">("completion");
  const [n, setN] = useState(3);
  const [rows, setRows] = useState<InstallmentDraft[] | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const totalCents = inputToCents(total);

  // O plano é recalculado a cada mudança; se a pessoa editar uma parcela à mão, passa a valer a edição.
  const generated = useMemo(
    () => buildPlan(totalCents, { upfrontPct: pct, balance, installments: n, today: todayISO(), firstDue: addDaysISO(30) }),
    [totalCents, pct, balance, n]
  );
  const plan = rows ?? generated;
  const sum = plan.reduce((acc, p) => acc + p.amount_cents, 0);
  const diff = totalCents - sum;

  function pickPreset(id: string) {
    const p = PRESETS.find((x) => x.id === id)!;
    setPreset(id);
    setPct(p.pct);
    setBalance(p.balance);
    setN(p.n);
    setRows(null);
  }

  function fromQuote(id: string) {
    setQuoteId(id);
    const q = quotes.find((x) => x.id === id);
    if (!q) return;
    setCustomer(q.customer_name);
    setPhone(q.customer_phone.replace(/^55/, ""));
    setTitle(q.items.map((i) => i.title).join(", ").slice(0, 140));
    setScope(
      q.items
        .map((i) => `• ${i.qty > 1 ? `${i.qty}× ` : ""}${i.title}${i.price_cents > 0 ? ` — ${formatBRL(i.price_cents * i.qty)}` : ""}`)
        .join("\n")
    );
    if (q.total_cents > 0) setTotal(centsToInput(q.total_cents));
    setRows(null);
  }

  function editRow(i: number, patch: Partial<InstallmentDraft>) {
    setRows((cur) => (cur ?? generated).map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function save() {
    setError("");
    if (diff !== 0) {
      setError("A soma das parcelas precisa ser igual ao valor total.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/contratos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote_id: quoteId || null,
          title,
          scope,
          customer_name: customer,
          customer_phone: phone,
          customer_doc: doc,
          customer_address: address,
          total_cents: totalCents,
          delivery_date: delivery || null,
          extra_terms: extra,
          payments: plan,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "Não foi possível salvar.");
        return;
      }
      onCreated(data.contract as ContractWithPayments);
    } catch {
      setError("Sem conexão. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 rounded-3xl border border-[#3b82f6]/40 bg-[#0f172a] p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold">Novo contrato</h2>
        <button onClick={onCancel} aria-label="Fechar" className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      {quotes.length > 0 && (
        <label className={label}>
          Começar de um orçamento aceito (opcional)
          <select value={quoteId} onChange={(e) => fromQuote(e.target.value)} className={input}>
            <option value="">Contrato novo, do zero</option>
            {quotes.map((q) => (
              <option key={q.id} value={q.id}>
                {q.customer_name} · {formatBRL(q.total_cents)}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className={label}>
          Nome do cliente
          <input value={customer} onChange={(e) => setCustomer(e.target.value)} className={input} maxLength={80} />
        </label>
        <label className={label}>
          WhatsApp do cliente
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={input} inputMode="tel" placeholder="(67) 99999-0000" />
        </label>
        <label className={label}>
          CPF/CNPJ do cliente (opcional)
          <input value={doc} onChange={(e) => setDoc(e.target.value)} className={input} maxLength={30} />
        </label>
        <label className={label}>
          Endereço do cliente (opcional)
          <input value={address} onChange={(e) => setAddress(e.target.value)} className={input} maxLength={160} />
        </label>
      </div>

      <label className={label}>
        Serviço contratado
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={input} maxLength={140} placeholder="Ex.: Instalação de 2 aparelhos de ar-condicionado" />
      </label>
      <label className={label}>
        Detalhes do que será feito (opcional)
        <textarea value={scope} onChange={(e) => setScope(e.target.value)} rows={3} maxLength={1500} className={input} />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className={label}>
          Valor total (R$)
          <input value={total} onChange={(e) => { setTotal(e.target.value); setRows(null); }} className={input} inputMode="decimal" placeholder="1.500,00" />
        </label>
        <label className={label}>
          Data de entrega (opcional)
          <input type="date" value={delivery} onChange={(e) => setDelivery(e.target.value)} className={input} />
        </label>
      </div>

      {/* FORMA DE PAGAMENTO */}
      <div className="space-y-3">
        <p className="text-sm font-extrabold">Como o cliente vai pagar?</p>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => pickPreset(p.id)}
              className={`rounded-xl border p-3 text-left transition ${preset === p.id ? "border-[#67e8f9] bg-[#67e8f9]/10" : "border-white/15 bg-[#0a0e17] hover:border-white/40"}`}
            >
              <span className="block text-sm font-extrabold">{p.name}</span>
              <span className="block text-[11px] text-slate-400">{p.hint}</span>
            </button>
          ))}
        </div>

        {(preset === "meio" || preset === "parcelas") && (
          <div className="grid gap-3 sm:grid-cols-3">
            <label className={label}>
              Entrada (%)
              <input
                type="number"
                min={0}
                max={100}
                value={pct}
                onChange={(e) => { setPct(Math.min(100, Math.max(0, Number(e.target.value) || 0))); setRows(null); }}
                className={input}
              />
            </label>
            {preset === "parcelas" && (
              <label className={label}>
                Nº de parcelas
                <input
                  type="number"
                  min={2}
                  max={24}
                  value={n}
                  onChange={(e) => { setN(Math.min(24, Math.max(2, Number(e.target.value) || 2))); setRows(null); }}
                  className={input}
                />
              </label>
            )}
          </div>
        )}

        {totalCents > 0 ? (
          <div className="space-y-2 rounded-2xl border border-white/10 bg-[#0a0e17] p-3">
            {plan.map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] items-center gap-2 sm:grid-cols-[1.2fr_1fr_1fr_auto]">
                <input value={r.label} onChange={(e) => editRow(i, { label: e.target.value })} className={`${input} !py-2 text-sm`} maxLength={60} />
                <input
                  value={centsToInput(r.amount_cents)}
                  onChange={(e) => editRow(i, { amount_cents: inputToCents(e.target.value) })}
                  inputMode="decimal"
                  className={`${input} !py-2 text-sm`}
                  aria-label="Valor da parcela"
                />
                {r.due_kind === "on_completion" ? (
                  <span className="text-xs text-violet-300">Na entrega do serviço</span>
                ) : (
                  <input
                    type="date"
                    value={r.due_date || ""}
                    onChange={(e) => editRow(i, { due_date: e.target.value || null })}
                    className={`${input} !py-2 text-sm`}
                  />
                )}
                <button
                  type="button"
                  onClick={() => setRows((cur) => (cur ?? generated).filter((_, idx) => idx !== i))}
                  aria-label="Remover parcela"
                  className="justify-self-end rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setRows((cur) => [...(cur ?? generated), { label: "Parcela", amount_cents: Math.max(diff, 0) || 100, due_kind: "date", due_date: addDaysISO(30) }])}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#67e8f9]"
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar parcela
            </button>
            <p className={`text-xs font-bold ${diff === 0 ? "text-emerald-300" : "text-amber-300"}`}>
              {diff === 0
                ? `Soma das parcelas: ${formatBRL(sum)}`
                : diff > 0
                  ? `Faltam ${formatBRL(diff)} para fechar o valor total`
                  : `Passou ${formatBRL(-diff)} do valor total`}
            </p>
          </div>
        ) : (
          <p className="text-xs text-slate-400">Informe o valor total para ver as parcelas.</p>
        )}
      </div>

      <label className={label}>
        Condições adicionais (opcional)
        <textarea value={extra} onChange={(e) => setExtra(e.target.value)} rows={2} maxLength={1000} className={input} placeholder="Ex.: garantia de 90 dias; material por conta do cliente." />
      </label>

      <p className="rounded-xl bg-[#0a0e17] p-3 text-xs leading-relaxed text-slate-400">
        O contrato usa um modelo padrão de prestação de serviço e o aceite é eletrônico simples (nome, data e horário). Para serviços de alto valor ou riscos maiores, vale conferir o texto com um advogado.
      </p>

      {error && <p className="text-sm font-bold text-red-300">{error}</p>}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button onClick={onCancel} className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold hover:bg-white/10">
          Cancelar
        </button>
        <button
          onClick={save}
          disabled={busy || totalCents <= 0 || diff !== 0}
          className="btn-shine text-white hover:brightness-110 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-extrabold disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Criar contrato
        </button>
      </div>
    </div>
  );
}
