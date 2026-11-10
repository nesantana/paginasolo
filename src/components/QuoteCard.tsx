"use client";

import { useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Copy,
  Eye,
  MessageCircle,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import type { QuoteRow } from "@/types/database.types";
import {
  STATUS_LABEL,
  addDaysISO,
  diffDays,
  followupMessage,
  followupState,
  formatBRL,
  formatDateBR,
  isOpen,
  quoteMessage,
  quoteUrl,
  todayISO,
  whatsappLink,
} from "@/lib/quoteUi";

export type PatchBody = Record<string, unknown>;

type Props = {
  quote: QuoteRow;
  business: string;
  origin: string;
  /** Versão enxuta (bloco "Hoje" da home). */
  compact?: boolean;
  onPatch: (id: string, body: PatchBody) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
};

const STATUS_STYLE: Record<QuoteRow["status"], string> = {
  draft: "bg-slate-500/20 text-slate-600",
  sent: "bg-sky-500/20 text-sky-700",
  viewed: "bg-amber-500/20 text-amber-700",
  accepted: "bg-emerald-500/20 text-emerald-700",
  declined: "bg-red-500/20 text-red-600",
};

const RESCHEDULE = [
  { label: "Amanhã", days: 1 },
  { label: "3 dias", days: 3 },
  { label: "7 dias", days: 7 },
  { label: "15 dias", days: 15 },
];

export function QuoteCard({ quote: q, business, origin, compact, onPatch, onDelete }: Props) {
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const url = quoteUrl(origin, q.code);
  const today = todayISO();
  const fu = followupState(q, today);
  const open = isOpen(q);

  async function run(body: PatchBody) {
    setBusy(true);
    try {
      await onPatch(q.id, body);
    } finally {
      setBusy(false);
      setMenu(false);
    }
  }

  function sendQuote() {
    window.open(
      whatsappLink(
        q.customer_phone,
        quoteMessage({ customer: q.customer_name, business, total_cents: q.total_cents, url })
      ),
      "_blank",
      "noopener"
    );
    void run({ mark_sent: true });
  }

  function chase() {
    window.open(
      whatsappLink(q.customer_phone, followupMessage({ customer: q.customer_name, business, url })),
      "_blank",
      "noopener"
    );
    setMenu(true);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copie o link:", url);
    }
  }

  const badge =
    fu === "late"
      ? { text: `Atrasado ${diffDays(q.followup_at!, today)}d`, cls: "bg-red-500/20 text-red-600" }
      : fu === "today"
        ? { text: "Chamar hoje", cls: "bg-[#3b82f6]/25 text-blue-700" }
        : fu === "upcoming"
          ? { text: `Chamar em ${formatDateBR(q.followup_at)}`, cls: "bg-slate-100 text-slate-600" }
          : null;

  const sentDays = q.sent_at ? diffDays(q.sent_at.slice(0, 10), today) : null;

  return (
    <article className="rounded-2xl border border-white/12 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-base font-extrabold">{q.customer_name}</p>
          <p className="text-xs text-slate-500">
            {q.total_cents > 0 ? formatBRL(q.total_cents) : "Valor a combinar"} ·{" "}
            {q.items.length} {q.items.length === 1 ? "item" : "itens"}
            {sentDays !== null && ` · enviado ${sentDays === 0 ? "hoje" : `há ${sentDays}d`}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {q.viewed_at && q.status !== "accepted" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
              <Eye className="h-3 w-3" /> abriu
            </span>
          )}
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${STATUS_STYLE[q.status]}`}>
            {STATUS_LABEL[q.status]}
          </span>
          {badge && (
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${badge.cls}`}>
              {badge.text}
            </span>
          )}
        </div>
      </div>

      {!compact && q.followup_note && (
        <p className="mt-2 text-xs italic text-slate-500">“{q.followup_note}”</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {open && (fu === "late" || fu === "today") ? (
          <button
            type="button"
            onClick={chase}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3.5 py-2 text-xs font-extrabold text-zinc-950 disabled:opacity-60"
          >
            <MessageCircle className="h-4 w-4" /> Chamar agora
          </button>
        ) : (
          <button
            type="button"
            onClick={sendQuote}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3.5 py-2 text-xs font-extrabold text-zinc-950 disabled:opacity-60"
          >
            <Send className="h-4 w-4" /> {q.sent_at ? "Reenviar" : "Enviar"} no WhatsApp
          </button>
        )}

        {open && (
          <button
            type="button"
            onClick={() => setMenu((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            <CalendarClock className="h-4 w-4" /> {fu === "none" ? "Agendar contato" : "Já chamei"}
          </button>
        )}

        {open && (
          <>
            <button
              type="button"
              onClick={() => run({ status: "accepted" })}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 px-3.5 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-500/10 disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" /> Fechou
            </button>
            <button
              type="button"
              onClick={() => run({ status: "declined" })}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-60"
            >
              <XCircle className="h-4 w-4" /> Perdi
            </button>
          </>
        )}

        {!compact && (
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            <Copy className="h-4 w-4" /> {copied ? "Copiado!" : "Copiar link"}
          </button>
        )}

        {!compact && onDelete && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Apagar o orçamento de ${q.customer_name}?`)) void onDelete(q.id);
            }}
            aria-label="Apagar orçamento"
            className="ml-auto inline-flex items-center rounded-xl px-2.5 py-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {menu && open && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-600">Chamar de novo em:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {RESCHEDULE.map((r) => (
              <button
                key={r.days}
                type="button"
                disabled={busy}
                onClick={() => run({ followup_at: addDaysISO(r.days) })}
                className="rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-bold hover:bg-[#3b82f6]/30 disabled:opacity-60"
              >
                {r.label}
              </button>
            ))}
            <button
              type="button"
              disabled={busy}
              onClick={() => run({ followup_done: true })}
              className="rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-60"
            >
              Não chamar mais
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
