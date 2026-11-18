"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Lightbulb, Loader2, MessageCircle, PartyPopper, TriangleAlert } from "lucide-react";
import type { QuoteRow, TenantRow } from "@/types/database.types";
import type { ContractWithPayments } from "@/types/finance";
import { buildInsights, type Insight } from "@/lib/insights";
import { formatBRL, todayISO } from "@/lib/quoteUi";

const TONE: Record<Insight["tone"], { cls: string; icon: typeof Lightbulb }> = {
  warn: { cls: "border-amber-400/40 bg-amber-400/10", icon: TriangleAlert },
  tip: { cls: "border-[#3b82f6]/40 bg-[#3b82f6]/10", icon: Lightbulb },
  good: { cls: "border-emerald-400/40 bg-emerald-400/10", icon: PartyPopper },
};

/** Insights: números simples do negócio e o que fazer hoje para ganhar mais. */
export function InsightsView({ tenant }: { tenant: TenantRow }) {
  const [data, setData] = useState<{ quotes: QuoteRow[]; contracts: ContractWithPayments[]; hasPix: boolean; catalog: number } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [f, q, c] = await Promise.all([
        fetch("/api/financeiro", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
        fetch("/api/orcamentos", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
        fetch("/api/catalogo", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
      ]);
      if (!alive) return;
      setData({ quotes: q.quotes || [], contracts: f.contracts || [], hasPix: Boolean(f.pix?.pix_key), catalog: (c.items || []).length });
    })();
    return () => {
      alive = false;
    };
  }, []);

  const out = useMemo(
    () => (data ? buildInsights({ quotes: data.quotes, contracts: data.contracts, business: tenant.business_name, hasPix: data.hasPix, catalogCount: data.catalog, today: todayISO() }) : null),
    [data, tenant.business_name]
  );

  if (!out)
    return (
      <p className="flex items-center gap-2 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Calculando...
      </p>
    );

  const { stats: s, insights } = out;
  const max = Math.max(1, ...s.months.map((m) => m.cents));
  const diff = s.receivedPrev > 0 ? Math.round(((s.receivedMonth - s.receivedPrev) / s.receivedPrev) * 100) : null;

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-white/15 bg-[#0f172a] p-5">
        <p className="text-sm font-bold text-slate-400">Recebido este mês</p>
        <p className="mt-1 text-4xl font-extrabold text-emerald-300">{formatBRL(s.receivedMonth)}</p>
        {diff !== null && (
          <p className={`mt-1 inline-flex items-center gap-1 text-sm font-bold ${diff >= 0 ? "text-emerald-300" : "text-red-300"}`}>
            {diff >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
            {Math.abs(diff)}% {diff >= 0 ? "a mais" : "a menos"} que no mês passado
          </p>
        )}
        <div className="mt-5 flex h-28 items-end gap-2" aria-label="Recebido nos últimos 6 meses">
          {s.months.map((m, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-20 w-full items-end">
                <div className={`w-full rounded-t-lg ${i === 5 ? "bg-emerald-400" : "bg-white/25"}`} style={{ height: `${Math.max(4, (m.cents / max) * 100)}%` }} title={formatBRL(m.cents)} />
              </div>
              <span className="text-[11px] font-bold uppercase text-slate-400">{m.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {[
          { l: "A receber", v: formatBRL(s.open), c: "text-white" },
          { l: "Atrasado", v: formatBRL(s.overdue), c: s.overdue ? "text-red-300" : "text-slate-400" },
          { l: "Orçamentos fechados", v: s.closeRate === null ? "-" : `${s.closeRate}%`, c: "text-white", sub: s.closeRate === null ? "Envie 3 ou mais para ver" : `${s.won90} de ${s.sent90} (90 dias)` },
          { l: "Ticket médio", v: s.avgTicket ? formatBRL(s.avgTicket) : "-", c: "text-white", sub: "por serviço aprovado" },
        ].map((x) => (
          <div key={x.l} className="rounded-2xl border border-white/10 bg-[#0a0e17] p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{x.l}</p>
            <p className={`mt-1 text-2xl font-extrabold ${x.c}`}>{x.v}</p>
            {x.sub && <p className="text-xs text-slate-400">{x.sub}</p>}
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">O que fazer para ganhar mais</h2>
        {insights.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 p-5 text-sm text-slate-300">
            Quando você tiver orçamentos e contratos, as dicas aparecem aqui. Comece fazendo seu primeiro orçamento.
          </p>
        ) : (
          insights.map((i) => {
            const T = TONE[i.tone];
            return (
              <article key={i.key} className={`space-y-3 rounded-2xl border p-4 ${T.cls}`}>
                <div className="flex gap-3">
                  <T.icon className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-extrabold">{i.title}</p>
                    <p className="mt-0.5 text-sm text-slate-200">{i.text}</p>
                  </div>
                </div>
                {i.wa && (
                  <div className="flex flex-wrap gap-2">
                    {i.wa.map((w) => (
                      <a key={w.url} href={w.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-extrabold text-zinc-950">
                        <MessageCircle className="h-4 w-4" /> {w.label}
                      </a>
                    ))}
                  </div>
                )}
                {i.href && (
                  <Link href={i.href} className="inline-flex min-h-11 items-center rounded-xl bg-white/10 px-4 text-sm font-extrabold hover:bg-white/20">
                    {i.cta || "Abrir"}
                  </Link>
                )}
              </article>
            );
          })
        )}
      </section>

      {s.topServices.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-[#0f172a] p-5">
          <h2 className="font-extrabold">Seus serviços que mais rendem</h2>
          <ol className="mt-3 space-y-2">
            {s.topServices.map((t, i) => (
              <li key={t.name} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate"><b className="mr-2 text-slate-400">{i + 1}</b>{t.name}</span>
                <b className="shrink-0">{formatBRL(t.cents)}</b>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
