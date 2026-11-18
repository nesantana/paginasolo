"use client";

import { useEffect, useState } from "react";
import type { CatalogItem } from "@/types/catalog";
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
  /** Chamado quando a pessoa marca "o cliente já aprovou": o orçamento já nasce aceito. */
  onApproved?: (q: QuoteRow) => void;
  /** Edição de um orçamento que já existe (mesmo link, novo conteúdo). */
  editing?: QuoteRow;
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

export function QuoteForm({ business, origin, services, onCreated, onMarkSent, onClose, onApproved, editing }: Props) {
  const [approved, setApproved] = useState(false);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  useEffect(() => {
    fetch("/api/catalogo", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => d?.ok && setCatalog(d.items || []))
      .catch(() => {});
  }, []);
  const [name, setName] = useState(editing?.customer_name || "");
  const [phone, setPhone] = useState(editing ? editing.customer_phone.replace(/^55/, "") : "");
  const [lines, setLines] = useState<Line[]>(
    editing ? editing.items.map((i) => ({ title: i.title, qty: i.qty, price: centsToInput(i.price_cents) })) : []
  );
  const [notes, setNotes] = useState(editing?.notes || "");
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
      if (editing) {
        const r = await fetch(`/api/orcamentos/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            edit: {
              customer_name: name,
              customer_phone: phone,
              items,
              notes,
              valid_until: editing.valid_until,
            },
          }),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok || !d.ok) {
          setError(d.error || "Não foi possível salvar.");
          return;
        }
        onCreated(d.quote as QuoteRow);
        onClose();
        return;
      }
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
      let quote = data.quote as QuoteRow;
      if (approved && onApproved) {
        const r2 = await fetch(`/api/orcamentos/${quote.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "accepted" }),
        });
        const d2 = await r2.json().catch(() => ({}));
        if (r2.ok && d2.ok) quote = d2.quote as QuoteRow;
        onCreated(quote);
        onApproved(quote);
        return;
      }
      setCreated(quote);
      onCreated(quote);
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
        <h2 className="text-lg font-extrabold">{editing ? "Editar orçamento" : "Novo orçamento"}</h2>
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
        {catalog.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-slate-400">Do seu catálogo (toque para adicionar)</p>
            <div className="flex flex-wrap gap-2">
              {catalog.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setLines((l) => [...l, { title: c.name, qty: 1, price: centsToInput(c.price_cents) }])}
                  className="inline-flex min-h-11 items-center gap-1 rounded-full border border-[#67e8f9]/40 bg-[#0a0e17] px-3.5 py-1.5 text-left text-xs font-bold text-slate-100 hover:bg-white/10"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  <span className="max-w-[16rem] truncate">{c.name}</span>
                  {c.price_cents > 0 && <span className="text-[#67e8f9]">{formatBRL(c.price_cents)}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
        {catalog.length === 0 && (
          <a href="/dashboard/catalogo" className="inline-block text-xs font-bold text-[#67e8f9] underline underline-offset-4">
            Cadastre seus serviços e preços para montar orçamentos em segundos
          </a>
        )}
        {services.length > 0 && catalog.length === 0 && (
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

      {editing && (
        <p className="rounded-xl bg-[#3b82f6]/10 px-4 py-3 text-sm text-slate-200">
          O link que você já mandou continua o mesmo e passa a mostrar o orçamento corrigido. Avise o cliente pelo WhatsApp.
        </p>
      )}

      <div className={`grid gap-4 sm:grid-cols-2 ${editing ? "hidden" : ""}`}>
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

      {onApproved && (
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <input
            type="checkbox"
            checked={approved}
            onChange={(e) => setApproved(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-emerald-500"
          />
          <span>
            <b className="block">O cliente já aprovou</b>
            <span className="text-sm text-slate-300">Marque se ele já topou. Você vai direto para o contrato.</span>
          </span>
        </label>
      )}

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
        {busy ? (editing ? "Salvando..." : "Criando...") : editing ? "Salvar alterações" : approved ? "Criar e fazer o contrato" : "Criar orçamento"}
      </button>
    </form>
  );
}
