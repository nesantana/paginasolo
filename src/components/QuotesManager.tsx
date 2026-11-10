"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import type { QuoteRow, TenantRow } from "@/types/database.types";
import { QuoteCard } from "@/components/QuoteCard";
import { QuoteForm } from "@/components/QuoteForm";
import { useQuotes } from "@/components/useQuotes";
import { followupState, formatBRL, isOpen, todayISO } from "@/lib/quoteUi";
import { PaidOnly } from "@/components/OwnerShell";

type Tab = "followup" | "todos";

export function QuotesManager({ tenant }: { tenant: TenantRow }) {
  const { quotes, loading, locked, error, patch, remove, add } = useQuotes();
  const [tab, setTab] = useState<Tab>("followup");
  const [showForm, setShowForm] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const today = todayISO();

  const groups = useMemo(() => {
    const g = { late: [] as QuoteRow[], today: [] as QuoteRow[], upcoming: [] as QuoteRow[], noDate: [] as QuoteRow[] };
    for (const q of quotes) {
      const s = followupState(q, today);
      if (s === "late") g.late.push(q);
      else if (s === "today") g.today.push(q);
      else if (s === "upcoming") g.upcoming.push(q);
      else if (isOpen(q) && !q.followup_at) g.noDate.push(q);
    }
    const byDate = (a: QuoteRow, b: QuoteRow) => (a.followup_at || "").localeCompare(b.followup_at || "");
    g.late.sort(byDate);
    g.upcoming.sort(byDate);
    return g;
  }, [quotes, today]);

  const openTotal = quotes.filter(isOpen).reduce((n, q) => n + q.total_cents, 0);
  const wonTotal = quotes.filter((q) => q.status === "accepted").reduce((n, q) => n + q.total_cents, 0);

  if (locked) return <PaidOnly feature="Orçamentos e follow-up" />;

  const tabBtn = (t: Tab, label: string, count?: number) => (
    <button
      type="button"
      onClick={() => setTab(t)}
      className={`rounded-full px-4 py-2 text-sm font-extrabold transition ${
        tab === t ? "bg-white text-zinc-900" : "bg-slate-100 text-slate-600 hover:bg-slate-100"
      }`}
    >
      {label}
      {count ? ` (${count})` : ""}
    </button>
  );

  const section = (title: string, list: QuoteRow[], tone: string) =>
    list.length > 0 && (
      <section className="space-y-3">
        <h2 className={`text-sm font-extrabold uppercase tracking-wider ${tone}`}>
          {title} · {list.length}
        </h2>
        {list.map((q) => (
          <QuoteCard key={q.id} quote={q} business={tenant.business_name} origin={origin} onPatch={patch} onDelete={remove} />
        ))}
      </section>
    );

  const dueNow = groups.late.length + groups.today.length;

  return (
    <div className="space-y-5">
      {!showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white hover:bg-blue-700 flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-extrabold"
        >
          <Plus className="h-5 w-5" /> Novo orçamento
        </button>
      )}

      {showForm && (
        <QuoteForm
          business={tenant.business_name}
          origin={origin}
          services={tenant.services || []}
          onCreated={add}
          onMarkSent={(id) => patch(id, { mark_sent: true })}
          onClose={() => setShowForm(false)}
        />
      )}

      {quotes.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/12 bg-white p-4">
            <p className="text-xs font-bold text-slate-500">Em aberto</p>
            <p className="mt-1 text-xl font-extrabold">{formatBRL(openTotal)}</p>
          </div>
          <div className="rounded-2xl border border-emerald-300 bg-emerald-500/10 p-4">
            <p className="text-xs font-bold text-emerald-700">Fechado</p>
            <p className="mt-1 text-xl font-extrabold text-emerald-900">{formatBRL(wonTotal)}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {tabBtn("followup", "Follow-up", dueNow)}
        {tabBtn("todos", "Todos os orçamentos", quotes.length)}
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {error}
        </p>
      )}

      {loading ? (
        <p className="flex items-center gap-2 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </p>
      ) : tab === "followup" ? (
        <div className="space-y-6">
          {section("Atrasados", groups.late, "text-red-600")}
          {section("Chamar hoje", groups.today, "text-blue-700")}
          {section("Próximos dias", groups.upcoming, "text-slate-500")}
          {section("Sem data de retorno", groups.noDate, "text-slate-500")}
          {dueNow + groups.upcoming.length + groups.noDate.length === 0 && (
            <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-slate-500">
              {quotes.length === 0
                ? "Crie seu primeiro orçamento. Ao criar, escolha em quantos dias quer ser lembrado de chamar o cliente."
                : "Tudo em dia. Nenhum cliente esperando contato."}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {quotes.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-slate-500">
              Nenhum orçamento ainda.
            </p>
          ) : (
            quotes.map((q) => (
              <QuoteCard key={q.id} quote={q} business={tenant.business_name} origin={origin} onPatch={patch} onDelete={remove} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
