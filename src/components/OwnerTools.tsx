"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, FileText, Link2, Lock, MessageCircle, Wallet } from "lucide-react";
import type { TenantRow } from "@/types/database.types";
import { PublishButton } from "@/components/PublishButton";
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
      className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0f172a] p-4 transition hover:border-[#3b82f6]/50"
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

const SAMPLE = [
  { name: "Carlos Dias", what: "Orçamento de R$ 480 · pintura", when: "retorno hoje" },
  { name: "Paula Reis", what: "Orçamento de R$ 1.200 · gesso", when: "retorno amanhã" },
];

/** Follow-up: quem chamar de volta. Quem não contratou vê um exemplo desfocado com cadeado. */
function FollowupSection({ tenant, paid }: { tenant: TenantRow; paid: boolean }) {
  const { quotes, loading, locked, patch } = useQuotes();

  const head = (
    <h2 className="flex items-center gap-2 text-lg font-extrabold">
      <CalendarClock className="h-5 w-5 text-[#67e8f9]" /> Quem chamar de volta
    </h2>
  );

  if (!paid || locked) {
    return (
      <section className="relative overflow-hidden rounded-3xl border border-white/15 bg-[#0f172a] p-5 sm:p-6">
        <div className="pointer-events-none select-none space-y-3 blur-[5px] opacity-70" aria-hidden>
          {head}
          {SAMPLE.map((s) => (
            <div key={s.name} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0a0e17] p-4">
              <div>
                <p className="font-extrabold">{s.name}</p>
                <p className="text-sm text-slate-400">
                  {s.what} · {s.when}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-extrabold text-zinc-950">
                <MessageCircle className="h-3.5 w-3.5" /> Chamar
              </span>
            </div>
          ))}
        </div>
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="max-w-xs space-y-2.5 rounded-2xl border border-white/20 bg-[#0a0e17]/90 p-5 text-center shadow-2xl backdrop-blur">
            <Lock className="mx-auto h-5 w-5 text-[#67e8f9]" />
            <p className="font-extrabold">Lembrete para chamar o cliente de volta</p>
            <p className="text-xs text-slate-300">No dia, o painel mostra quem chamar, com a mensagem pronta.</p>
            <PublishButton
              label="Liberar por R$ 37/mês"
              className="inline-flex items-center justify-center gap-2 rounded-xl btn-shine px-5 py-2.5 text-xs font-extrabold text-white hover:brightness-110 disabled:opacity-60"
            />
          </div>
        </div>
      </section>
    );
  }

  if (loading) return null;

  const today = todayISO();
  const due = quotes
    .filter((q) => {
      const s = followupState(q, today);
      return s === "late" || s === "today";
    })
    .sort((a, b) => (a.followup_at || "").localeCompare(b.followup_at || ""));

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return (
    <section className="space-y-3 rounded-3xl border border-white/15 bg-[#0f172a] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-extrabold">
          <CalendarClock className="h-5 w-5 text-[#67e8f9]" /> Quem chamar de volta
          {due.length > 0 && <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs text-zinc-950">{due.length}</span>}
        </h2>
        <Link href="/dashboard/orcamentos" className="text-sm font-bold text-[#67e8f9] hover:underline">
          Orçamentos
        </Link>
      </div>
      {due.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-slate-400">
          Ninguém para chamar hoje. Ao mandar um orçamento, marque o dia do retorno e ele aparece aqui.
        </p>
      ) : (
        <div className="space-y-3">
          {due.slice(0, 4).map((q) => (
            <QuoteCard key={q.id} quote={q} business={tenant.business_name} origin={origin} compact onPatch={patch} />
          ))}
          {due.length > 4 && (
            <Link href="/dashboard/orcamentos" className="block text-center text-sm font-bold text-[#67e8f9] underline underline-offset-4">
              Ver os outros {due.length - 4}
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

/** Follow-up + atalhos das ferramentas (a agenda fica no calendário, logo acima). */
export function OwnerTools({ tenant }: { tenant: TenantRow }) {
  const paid = tenant.is_active && tenant.subscription_status === "active";
  return (
    <div className="space-y-5">
      <FollowupSection tenant={tenant} paid={paid} />
      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">Atalhos</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Tile href="/dashboard/financeiro" icon={Wallet} title="Contratos e Pix" text="Contrato e o que falta receber" locked={!paid} />
          <Tile href="/dashboard/orcamentos" icon={FileText} title="Orçamentos" text="Envie por link" locked={!paid} />
          <Tile href="/dashboard/links" icon={Link2} title="Página de links" text="Um link para o Instagram" locked={!paid} />
        </div>
      </section>
    </div>
  );
}
