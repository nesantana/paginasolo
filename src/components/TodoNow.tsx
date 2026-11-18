"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarClock, CheckCircle2, FilePlus2, FileSignature, Loader2, MessageCircle, Send, Wallet } from "lucide-react";
import type { QuoteRow } from "@/types/database.types";
import type { ContractWithPayments } from "@/types/finance";
import { openAssistant } from "@/components/AssistantChat";
import { afterSaleFor } from "@/lib/aftersale";
import type { CatalogItem } from "@/types/catalog";
import { diffDays, followupState, formatBRL, todayISO } from "@/lib/quoteUi";

type Task = { key: string; rank: number; icon: typeof Send; tone: string; title: string; sub: string; cta: string; href: string };

const first = (n: string) => n.trim().split(/\s+/)[0] || n;

/** "O que fazer agora": junta, de todos os clientes, o que está esperando uma ação sua. */
export function TodoNow({ business = "" }: { business?: string }) {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [fr, qr, cr] = await Promise.all([
          fetch("/api/financeiro", { cache: "no-store" }),
          fetch("/api/orcamentos", { cache: "no-store" }),
          fetch("/api/catalogo", { cache: "no-store" }),
        ]);
        const cat: CatalogItem[] = (await cr.json().catch(() => ({}))).items || [];
        const f = await fr.json().catch(() => ({}));
        const q = await qr.json().catch(() => ({}));
        if (!alive || !fr.ok || !qr.ok) return;
        const contracts: ContractWithPayments[] = f.contracts || [];
        const quotes: QuoteRow[] = q.quotes || [];
        const today = todayISO();
        const out: Task[] = [];
        const hasContract = new Set(contracts.map((c) => c.quote_id).filter(Boolean));

        for (const c of contracts) {
          if (c.status === "cancelled") continue;
          const href = `/dashboard/clientes/${c.id}`;
          const name = first(c.customer_name);
          for (const p of c.payments) {
            if (p.status === "informed")
              out.push({ key: "i" + p.id, rank: 1, icon: BadgeCheck, tone: "text-sky-300", title: `${name} disse que pagou ${formatBRL(p.amount_cents)}`, sub: "Confira no banco e confirme", cta: "Confirmar", href });
          }
          if (c.status === "signed" || c.status === "completed") {
            const due = c.payments.find((p) => p.status === "pending" && p.due_kind !== "on_completion" && (!p.due_date || p.due_date <= today));
            if (due) {
              const late = due.due_date && due.due_date < today ? diffDays(due.due_date, today) : 0;
              out.push({ key: "p" + due.id, rank: late ? 2 : 3, icon: Wallet, tone: late ? "text-red-300" : "text-amber-300", title: `Cobrar ${formatBRL(due.amount_cents)} de ${name}`, sub: late ? `Atrasado há ${late} dia${late > 1 ? "s" : ""}` : "Vence hoje", cta: "Cobrar", href });
            } else if (c.status === "signed" && c.payments.some((p) => p.status === "pending" && p.due_kind === "on_completion")) {
              out.push({ key: "e" + c.id, rank: 8, icon: CheckCircle2, tone: "text-violet-300", title: `Serviço de ${name} em andamento`, sub: "Terminou? Marque como concluído para cobrar o resto", cta: "Abrir", href });
            }
          }
          if (!c.payments.some((p) => p.status === "pending" || p.status === "informed")) {
            const as = afterSaleFor(c, cat, business, today);
            if (as) out.push({ key: "as" + c.id, rank: 7, icon: MessageCircle, tone: "text-violet-300", title: as.title, sub: as.kind === "post" ? "Serviço concluído há " + as.days + " dias" : "Revisão do serviço", cta: "Chamar", href });
          }
          if (c.status === "draft")
            out.push({ key: "d" + c.id, rank: 4, icon: FileSignature, tone: "text-emerald-300", title: c.quote_id ? `${name} aprovou: envie o contrato` : `Envie o contrato de ${name}`, sub: "Já está pronto, só conferir e mandar", cta: "Enviar contrato", href });
          if (c.status === "sent" && c.sent_at && diffDays(c.sent_at.slice(0, 10), today) >= 2)
            out.push({ key: "s" + c.id, rank: 6, icon: MessageCircle, tone: "text-sky-300", title: `${name} ainda não assinou`, sub: `Contrato enviado há ${diffDays(c.sent_at.slice(0, 10), today)} dias`, cta: "Lembrar", href });
        }

        for (const qq of quotes) {
          const href = `/dashboard/clientes/${qq.id}`;
          const name = first(qq.customer_name);
          if (qq.status === "accepted" && !hasContract.has(qq.id))
            out.push({ key: "a" + qq.id, rank: 4, icon: FilePlus2, tone: "text-emerald-300", title: `${name} aprovou o orçamento`, sub: "Falta fazer o contrato", cta: "Fazer contrato", href });
          else if (qq.status === "draft" || (qq.status !== "accepted" && qq.status !== "declined" && !qq.sent_at))
            out.push({ key: "r" + qq.id, rank: 5, icon: Send, tone: "text-slate-300", title: `Orçamento de ${name} ainda não foi enviado`, sub: qq.total_cents > 0 ? formatBRL(qq.total_cents) : "", cta: "Enviar", href });
          else {
            const fu = followupState(qq, today);
            if (fu === "late" || fu === "today")
              out.push({ key: "f" + qq.id, rank: 5, icon: CalendarClock, tone: "text-amber-300", title: `Chamar ${name} de volta`, sub: `Orçamento ${qq.total_cents > 0 ? formatBRL(qq.total_cents) + " " : ""}${qq.viewed_at ? "visto" : "enviado"}`, cta: "Chamar", href });
          }
        }
        out.sort((a, b) => a.rank - b.rank);
        setTasks(out);
        setEmpty(contracts.length + quotes.length === 0);
      } catch {
        // sem conexão: não mostra nada
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (tasks === null)
    return (
      <section className="flex items-center gap-2 rounded-3xl border border-white/15 bg-[#0f172a] p-5 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Vendo o que precisa de você...
      </section>
    );

  if (tasks.length === 0)
    return (
      <section className="rounded-3xl border border-white/15 bg-[#0f172a] p-5 sm:p-6">
        {empty ? (
          <>
            <h2 className="text-lg font-extrabold">Faça seu primeiro orçamento</h2>
            <p className="mt-1 text-sm text-slate-300">
              Escreva acima, como no WhatsApp: "orçamento para a Ana, pintura de sala, R$ 800". Em um minuto ele está pronto para enviar.
            </p>
            <button
              type="button"
              onClick={() => openAssistant({ fill: "Orçamento para " })}
              className="btn-shine mt-3 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-extrabold"
            >
              <FilePlus2 className="h-4 w-4" /> Começar
            </button>
          </>
        ) : (
          <p className="flex items-center gap-2 font-bold text-emerald-300">
            <CheckCircle2 className="h-5 w-5" /> Tudo em dia. Nenhum cliente esperando você.
          </p>
        )}
      </section>
    );

  return (
    <section className="space-y-3 rounded-3xl border border-white/15 bg-[#0f172a] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold">
          Para fazer agora <span className="ml-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs text-zinc-950">{tasks.length}</span>
        </h2>
        <Link href="/dashboard/clientes" className="text-sm font-bold text-[#67e8f9] hover:underline">
          Todos os clientes
        </Link>
      </div>
      <ul className="space-y-2">
        {tasks.slice(0, 5).map((t) => (
          <li key={t.key}>
            <Link href={t.href} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0a0e17] p-3.5 transition hover:border-[#3b82f6]/50">
              <t.icon className={`h-5 w-5 shrink-0 ${t.tone}`} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{t.title}</span>
                {t.sub && <span className="block truncate text-xs text-slate-400">{t.sub}</span>}
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-extrabold">
                {t.cta} <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {tasks.length > 5 && (
        <Link href="/dashboard/clientes" className="block text-center text-sm font-bold text-[#67e8f9] underline underline-offset-4">
          Ver os outros {tasks.length - 5}
        </Link>
      )}
    </section>
  );
}
