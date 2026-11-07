"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, FileText, Link2, Lock } from "lucide-react";
import type { TenantRow } from "@/types/database.types";
import { QuoteCard } from "@/components/QuoteCard";
import { useQuotes } from "@/components/useQuotes";
import { followupState, todayISO } from "@/lib/quoteUi";

function Tile({
  href,
  icon: Icon,
  title,
  text,
  badge,
  locked,
}: {
  href: string;
  icon: typeof FileText;
  title: string;
  text: string;
  badge?: number;
  locked: boolean;
}) {
  return (
    <Link
      href={href}
      className="group relative flex items-start gap-3 rounded-2xl border border-white/15 bg-[#0c1d2c] p-4 transition hover:-translate-y-0.5 hover:border-[#FF6600]/50"
    >
      <span className="btn-shine flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 font-extrabold">
          {title}
          {locked && <Lock className="h-3.5 w-3.5 text-slate-500" />}
        </span>
        <span className="block text-xs text-slate-400">{locked ? "Plano ativo" : text}</span>
      </span>
      {!!badge && (
        <span className="absolute right-3 top-3 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#FF6600] px-1.5 text-xs font-extrabold">
          {badge}
        </span>
      )}
      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-500 transition group-hover:translate-x-1 group-hover:text-white" />
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
    <section className="space-y-3 rounded-3xl border border-[#FF6600]/40 bg-[#FF6600]/[0.07] p-4 sm:p-5">
      <h2 className="flex items-center gap-2 text-lg font-extrabold">
        <CalendarClock className="h-5 w-5 text-[#FF9C40]" />
        Quem chamar hoje
        <span className="rounded-full bg-[#FF6600] px-2 py-0.5 text-xs">{due.length}</span>
      </h2>
      <div className="space-y-3">
        {due.slice(0, 5).map((q) => (
          <QuoteCard
            key={q.id}
            quote={q}
            business={tenant.business_name}
            origin={origin}
            compact
            onPatch={patch}
          />
        ))}
      </div>
      {due.length > 5 && (
        <Link href="/dashboard/orcamentos" className="block text-center text-sm font-bold text-[#FFB35C] underline underline-offset-4">
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
    <div className="space-y-4">
      {paid && <FollowupToday tenant={tenant} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Tile
          href="/dashboard/orcamentos"
          icon={FileText}
          title="Orçamentos e follow-up"
          text="Envie por link e seja lembrado de chamar"
          locked={!paid}
        />
        <Tile
          href="/dashboard/links"
          icon={Link2}
          title="Página de links"
          text="Um link só para o Instagram"
          locked={!paid}
        />
      </div>
    </div>
  );
}
