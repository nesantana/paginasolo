"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, CalendarClock, FileText, Link2, Lock, Wallet } from "lucide-react";
import type { TenantRow } from "@/types/database.types";
import { QuoteCard } from "@/components/QuoteCard";
import { useQuotes } from "@/components/useQuotes";
import { followupState, todayISO } from "@/lib/quoteUi";

function Tile({
  href,
  icon: Icon,
  title,
  text,
  locked,
}: {
  href: string;
  icon: typeof FileText;
  title: string;
  text: string;
  locked: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0f172a] p-4 transition hover:border-[#3b82f6]/50 hover:shadow-sm"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#3b82f6]/15 text-[#67e8f9]">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 font-bold text-white">
          {title}
          {locked && <Lock className="h-3.5 w-3.5 text-slate-400" />}
        </span>
        <span className="block text-sm text-slate-400">{locked ? "Libere por R$ 37/mês" : text}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#67e8f9]" />
    </Link>
  );
}

/** Quem chamar hoje: orçamentos com retorno vencido ou marcado para hoje. */
function FollowupToday({ tenant }: { tenant: TenantRow }) {
  const { quotes, loading, locked, patch } = useQuotes();
  if (loading || locked) return null;

  const today = todayISO();
  const due = quotes
    .filter((q) => {
      const s = followupState(q, today);
      return s === "late" || s === "today";
    })
    .sort((a, b) => (a.followup_at || "").localeCompare(b.followup_at || ""));
  if (due.length === 0) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return (
    <section className="space-y-3 rounded-2xl border border-amber-400/30 bg-amber-400/15 p-4 sm:p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold text-amber-100">
        <CalendarClock className="h-5 w-5 text-amber-300" />
        Quem chamar hoje
        <span className="rounded-full bg-amber-600 px-2 py-0.5 text-xs text-white">{due.length}</span>
      </h2>
      <div className="space-y-3">
        {due.slice(0, 5).map((q) => (
          <QuoteCard key={q.id} quote={q} business={tenant.business_name} origin={origin} compact onPatch={patch} />
        ))}
      </div>
      {due.length > 5 && (
        <Link href="/dashboard/orcamentos" className="block text-center text-sm font-bold text-[#67e8f9] underline underline-offset-4">
          Ver os outros {due.length - 5}
        </Link>
      )}
    </section>
  );
}

/** Ferramentas do plano ativo + lista "quem chamar hoje". */
export function OwnerTools({ tenant }: { tenant: TenantRow }) {
  const paid = tenant.is_active && tenant.subscription_status === "active";
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold">Suas ferramentas</h2>
      {paid && <FollowupToday tenant={tenant} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Tile href="/dashboard/agenda" icon={CalendarDays} title="Agenda" text="Serviços marcados e aviso por e-mail" locked={!paid} />
        <Tile href="/dashboard/financeiro" icon={Wallet} title="Contratos e pagamentos" text="Contrato, Pix e o que falta receber" locked={!paid} />
        <Tile href="/dashboard/orcamentos" icon={FileText} title="Orçamentos" text="Envie por link e lembre de chamar" locked={!paid} />
        <Tile href="/dashboard/links" icon={Link2} title="Página de links" text="Um link só para o Instagram" locked={!paid} />
      </div>
    </section>
  );
}
