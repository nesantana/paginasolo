"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, Clock, FileText, Loader2,
  Lock, MapPin, MessageCircle, Phone, Plus, Wallet,
} from "lucide-react";
import type { TenantRow } from "@/types/database.types";
import type { AppointmentRow, ContractWithPayments } from "@/types/finance";
import type { QuoteRow } from "@/types/database.types";
import { PublishButton } from "@/components/PublishButton";
import { conflictIds, endTime, hhmm } from "@/lib/agendaConflicts";
import { summarize } from "@/lib/contractUi";
import { formatBRL, formatDateBR, todayISO, whatsappLink } from "@/lib/quoteUi";

const first = (n: string) => n.trim().split(/\s+/)[0] || n;
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const addDays = (isoDate: string, n: number) => {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + n);
  return iso(d.getFullYear(), d.getMonth(), d.getDate());
};
const weekday = (isoDate: string) => new Date(`${isoDate}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long" });
const monthTitle = (y: number, m: number) => {
  const t = new Date(y, m, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

const shell = "rounded-3xl border border-white/15 bg-[#0f172a] p-5 sm:p-7 shadow-xl";

/** Exemplo mostrado (desfocado) para quem ainda não liberou as ferramentas. */
function demoItems(today: string): AppointmentRow[] {
  const mk = (day: number, time: string, name: string, title: string, id: string): AppointmentRow => ({
    id, tenant_id: "demo", contract_id: null, customer_name: name, customer_phone: null, title,
    address: "Rua das Flores, 100", notes: null, starts_on: addDays(today, day), start_time: time, duration_min: 60,
    status: "scheduled", done_at: null, created_at: "", updated_at: "",
  });
  return [
    mk(0, "08:00", "Maria Souza", "Troca de chuveiro", "d1"),
    mk(0, "14:00", "João Pereira", "Pintura da sala", "d2"),
    mk(1, "09:00", "Ana Lima", "Instalar ar-condicionado", "d3"),
    mk(3, "10:00", "Carlos Dias", "Limpeza completa", "d4"),
    mk(5, "08:00", "Paula Reis", "Gesso no teto", "d5"),
    mk(5, "09:00", "Rita Alves", "Revisão elétrica", "d6"),
    mk(9, "13:00", "Bruno Costa", "Pintura externa", "d7"),
  ];
}

type Step = { key: string; icon: typeof FileText; text: string; cta: string; href: string };

/** Calendário do mês + serviços do dia escolhido + próximos passos. A primeira coisa do painel. */
export function TodayAgenda({ tenant }: { tenant: TenantRow }) {
  const paid = tenant.is_active && tenant.subscription_status === "active";
  const [today, setToday] = useState(() => todayISO());
  const [items, setItems] = useState<AppointmentRow[]>([]);
  const [contracts, setContracts] = useState<ContractWithPayments[]>([]);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(paid);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState(() => todayISO());
  const [cursor, setCursor] = useState(() => {
    const t = todayISO();
    return { y: Number(t.slice(0, 4)), m: Number(t.slice(5, 7)) - 1 };
  });

  const load = useCallback(async () => {
    const t = todayISO();
    const from = iso(Number(t.slice(0, 4)), Number(t.slice(5, 7)) - 2, 1);
    const [a, f] = await Promise.all([
      fetch(`/api/agenda?from=${from}`, { cache: "no-store" }).then((r) => r.json()).catch(() => null),
      fetch("/api/financeiro", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
    ]);
    if (a?.ok) {
      setToday(a.today);
      setSelected(a.today);
      setCursor({ y: Number(a.today.slice(0, 4)), m: Number(a.today.slice(5, 7)) - 1 });
      setItems(a.appointments);
    }
    if (f?.ok) {
      setContracts(f.contracts);
      setQuotes(f.acceptedQuotes);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (paid) void load();
  }, [paid, load]);

  const data = useMemo(() => (paid ? items : demoItems(today)), [paid, items, today]);
  const conflicts = useMemo(() => conflictIds(data), [data]);

  const byDay = useMemo(() => {
    const map = new Map<string, AppointmentRow[]>();
    for (const a of data) if (a.status !== "cancelled") map.set(a.starts_on, [...(map.get(a.starts_on) || []), a]);
    return map;
  }, [data]);

  const money = useMemo(() => summarize(contracts, today), [contracts, today]);
  const late = useMemo(() => data.filter((a) => a.status === "scheduled" && a.starts_on < today), [data, today]);

  const steps = useMemo<Step[]>(() => {
    if (!paid) return [];
    const out: Step[] = [];
    for (const q of quotes)
      out.push({ key: `q${q.id}`, icon: FileText, text: `${q.customer_name} aceitou o orçamento`, cta: "Gerar contrato", href: `/dashboard/financeiro?novo=1&orcamento=${q.id}` });
    for (const c of contracts) {
      if (c.status === "draft")
        out.push({ key: `d${c.id}`, icon: FileText, text: `Contrato de ${c.customer_name} pronto${c.quote_id ? " (veio do orçamento aceito)" : ""}`, cta: "Revisar e enviar", href: "/dashboard/financeiro" });
      else if (c.status === "signed" && !items.some((a) => a.contract_id === c.id && a.status !== "cancelled"))
        out.push({ key: `s${c.id}`, icon: CalendarDays, text: `${c.customer_name} aceitou o contrato`, cta: "Marcar o dia", href: `/dashboard/agenda?novo=1&contrato=${c.id}` });
      else if (c.status === "completed" && c.payments.some((p) => p.status === "pending" || p.status === "informed"))
        out.push({ key: `p${c.id}`, icon: Wallet, text: `Serviço de ${c.customer_name} concluído: falta receber`, cta: "Cobrar", href: "/dashboard/financeiro" });
    }
    return out.slice(0, 4);
  }, [paid, quotes, contracts, items]);

  async function done(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/agenda/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok) {
        setItems((cur) => cur.map((a) => (a.id === id ? d.appointment : a)));
        if (d.contractCompleted) void load(); // o saldo do contrato passou a vencer
      }
    } finally {
      setBusyId(null);
    }
  }

  // ---------- calendário ----------
  const firstWeekday = new Date(cursor.y, cursor.m, 1).getDay();
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => iso(cursor.y, cursor.m, i + 1)),
  ];
  const go = (delta: number) =>
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const dayList = (byDay.get(selected) || []).slice().sort((a, b) => (a.start_time || "99").localeCompare(b.start_time || "99"));
  const openCount = dayList.filter((a) => a.status === "scheduled").length;

  const row = (a: AppointmentRow, showDate = false) => (
    <li key={a.id} className={`rounded-2xl border bg-[#0a0e17] p-4 ${conflicts.has(a.id) ? "border-red-400/50" : "border-white/10"} ${a.status === "done" ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-extrabold">
            {a.customer_name} <span className="font-normal text-slate-400">· {a.title}</span>
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-500" />
              {showDate ? `${formatDateBR(a.starts_on)} · ` : ""}
              {a.start_time ? `${hhmm(a.start_time)}–${endTime(a.start_time, a.duration_min)}` : "horário a combinar"}
            </span>
            {a.address && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[#67e8f9] hover:underline"
              >
                <MapPin className="h-4 w-4" /> {a.address}
              </a>
            )}
          </p>
          {conflicts.has(a.id) && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-bold text-red-300">
              <AlertTriangle className="h-3.5 w-3.5" /> Conflito de horário
            </p>
          )}
        </div>
        {a.status === "scheduled" ? (
          <button
            onClick={() => done(a.id)}
            disabled={busyId === a.id || !paid}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-extrabold text-zinc-950 hover:bg-emerald-400 disabled:opacity-60"
          >
            {busyId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Concluído
          </button>
        ) : (
          <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-300">Feito</span>
        )}
      </div>
      {a.customer_phone && a.status === "scheduled" && (
        <div className="mt-3 flex gap-2">
          <a
            href={whatsappLink(
              a.customer_phone,
              `Olá, ${first(a.customer_name)}! Aqui é da ${tenant.business_name}. Confirmando nosso serviço (${a.title}) para ${a.starts_on === today ? "hoje" : formatDateBR(a.starts_on)}${a.start_time ? ` às ${hhmm(a.start_time)}` : ""}.`
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/10"
          >
            <MessageCircle className="h-3.5 w-3.5 text-emerald-400" /> Avisar cliente
          </a>
          <a href={`tel:+${a.customer_phone}`} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/10">
            <Phone className="h-3.5 w-3.5" /> Ligar
          </a>
        </div>
      )}
    </li>
  );

  if (loading) {
    return (
      <section className={`${shell} flex items-center gap-2 text-slate-300`}>
        <Loader2 className="h-5 w-5 animate-spin" /> Carregando sua agenda...
      </section>
    );
  }

  const calendar = (
    <section className={`${shell} space-y-5`} aria-hidden={!paid}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => go(-1)} aria-label="Mês anterior" className="rounded-lg p-2 text-slate-300 hover:bg-white/10">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="min-w-[10rem] text-center text-xl font-extrabold">{monthTitle(cursor.y, cursor.m)}</h2>
          <button type="button" onClick={() => go(1)} aria-label="Próximo mês" className="rounded-lg p-2 text-slate-300 hover:bg-white/10">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <Link
          href={`/dashboard/agenda?novo=1&dia=${selected}`}
          className="inline-flex items-center gap-2 rounded-xl btn-shine px-5 py-3 text-sm font-extrabold text-white hover:brightness-110"
        >
          <Plus className="h-4 w-4" /> Marcar um serviço
        </Link>
      </div>

      <div>
        <div className="grid grid-cols-7 gap-1 pb-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <span key={`b${i}`} />;
            const list = byDay.get(day) || [];
            const hasConflict = list.some((a) => conflicts.has(a.id));
            const isToday = day === today;
            const isSel = day === selected;
            const open = list.filter((a) => a.status === "scheduled").length;
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelected(day)}
                className={`flex h-14 flex-col items-center justify-start gap-1 rounded-xl border p-1.5 text-sm font-bold transition sm:h-16 ${
                  isSel ? "border-[#67e8f9] bg-[#3b82f6]/25 text-white" : isToday ? "border-[#3b82f6]/60 bg-[#3b82f6]/10 text-white" : "border-white/5 bg-white/[0.03] text-slate-300 hover:bg-white/10"
                }`}
              >
                <span>{Number(day.slice(8, 10))}</span>
                {list.length > 0 && (
                  <span className="flex flex-wrap items-center justify-center gap-0.5">
                    {list.slice(0, 3).map((a) => (
                      <span
                        key={a.id}
                        className={`h-1.5 w-1.5 rounded-full ${conflicts.has(a.id) ? "bg-red-400" : a.status === "done" ? "bg-emerald-400" : "bg-[#67e8f9]"}`}
                      />
                    ))}
                  </span>
                )}
                {open > 3 && <span className="text-[9px] text-slate-400">+{open - 3}</span>}
                {hasConflict && <span className="sr-only">conflito</span>}
              </button>
            );
          })}
        </div>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#67e8f9]" /> marcado</span>
          <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> feito</span>
          <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-400" /> conflito</span>
        </p>
      </div>

      <div className="space-y-3 border-t border-white/10 pt-4">
        <h3 className="text-lg font-extrabold capitalize">
          {selected === today ? "Hoje" : selected === addDays(today, 1) ? "Amanhã" : `${weekday(selected)}, ${formatDateBR(selected).slice(0, 5)}`}
          <span className="ml-2 text-sm font-semibold text-slate-400">
            {openCount > 0 ? `${openCount} serviço${openCount > 1 ? "s" : ""}` : "nada marcado"}
          </span>
        </h3>
        {dayList.length > 0 ? (
          <ul className="space-y-2">{dayList.map((a) => row(a))}</ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-slate-400">
            Nenhum serviço nesse dia. Combinou algo com um cliente? Marque aqui e você recebe o aviso por e-mail no dia.
          </p>
        )}
      </div>

      {late.length > 0 && selected === today && (
        <div className="space-y-2">
          <p className="text-xs font-extrabold uppercase tracking-wider text-amber-300">Ficaram para trás ({late.length})</p>
          <ul className="space-y-2">{late.slice(0, 3).map((a) => row(a, true))}</ul>
        </div>
      )}
    </section>
  );

  // Quem não liberou as ferramentas vê o calendário de exemplo, desfocado e com cadeado.
  if (!paid) {
    return (
      <div className="relative">
        <div className="pointer-events-none select-none blur-[5px] opacity-70" aria-hidden>
          {calendar}
        </div>
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="max-w-sm space-y-3 rounded-3xl border border-white/20 bg-[#0a0e17]/90 p-6 text-center shadow-2xl backdrop-blur">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#3b82f6]/20">
              <Lock className="h-6 w-6 text-[#67e8f9]" />
            </span>
            <h2 className="text-xl font-extrabold">Sua agenda</h2>
            <p className="text-sm text-slate-300">
              Marque o dia combinado com o cliente, veja os conflitos de horário e receba um e-mail de manhã com o que
              tem para fazer.
            </p>
            <PublishButton
              label={tenant.subscription_status === "draft" ? "Liberar por R$ 37/mês" : "Reativar por R$ 37/mês"}
              className="inline-flex items-center justify-center gap-2 rounded-xl btn-shine px-6 py-3 text-sm font-extrabold text-white hover:brightness-110 disabled:opacity-60"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {calendar}

      {steps.length > 0 && (
        <section className="space-y-2 rounded-3xl border border-[#3b82f6]/40 bg-[#3b82f6]/10 p-5">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#a5f3fc]">Próximos passos</h2>
          <ul className="space-y-2">
            {steps.map((s) => (
              <li key={s.key} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#0a0e17] px-4 py-3">
                <span className="flex items-center gap-3 text-sm">
                  <s.icon className="h-5 w-5 shrink-0 text-[#67e8f9]" />
                  <span className="text-slate-200">{s.text}</span>
                </span>
                <Link href={s.href} className="inline-flex items-center gap-1.5 rounded-lg btn-shine px-3.5 py-2 text-xs font-extrabold text-white hover:brightness-110">
                  {s.cta} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {money.open > 0 && (
        <Link href="/dashboard/financeiro" className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0f172a] px-5 py-4 hover:border-[#3b82f6]/50">
          <span className="flex items-center gap-3 text-sm">
            <Wallet className="h-5 w-5 text-emerald-400" />
            <span>
              {money.overdue > 0 && (
                <>
                  <strong className="text-red-300">{formatBRL(money.overdue)} atrasado</strong>
                  <span className="text-slate-400"> · </span>
                </>
              )}
              <span className="text-slate-300">Falta receber </span>
              <strong className="text-white">{formatBRL(money.open)}</strong>
              {money.received > 0 && <span className="text-slate-400"> · já recebeu {formatBRL(money.received)}</span>}
            </span>
          </span>
          <ArrowRight className="h-4 w-4 text-slate-400" />
        </Link>
      )}
    </div>
  );
}
