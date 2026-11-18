"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarPlus, Check, ChevronLeft, ChevronRight, Clock, Loader2, MapPin, Mail, MessageCircle, Phone, RotateCcw, Trash2, X } from "lucide-react";
import { Sheet } from "@/components/Sheet";
import type { TenantRow } from "@/types/database.types";
import type { AppointmentRow } from "@/types/finance";
import { formatDateBR, whatsappLink } from "@/lib/quoteUi";
import { DURATIONS, conflictIds, endTime, warningsFor, type Warning } from "@/lib/agendaConflicts";

type ContractLite = { id: string; customer_name: string; customer_phone: string; title: string; delivery_date: string | null };

const field =
  "w-full rounded-xl border border-white/15 bg-[#0f172a] px-3.5 py-3 text-base text-white placeholder:text-slate-500 focus:border-[#67e8f9] focus:outline-none";
const lbl = "block space-y-1 text-sm font-semibold text-slate-200";
const smallBtn =
  "inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0f172a] px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/10 disabled:opacity-60";

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const weekday = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long" });
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : "");
const first = (n: string) => n.trim().split(/\s+/)[0] || n;

type View = "dia" | "semana" | "mes";
const WEEK_SHORT = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
// 0 = segunda ... 6 = domingo
const dow = (iso: string) => (new Date(`${iso}T12:00:00`).getDay() + 6) % 7;
const weekStart = (iso: string) => addDays(iso, -dow(iso));
const monthStart = (iso: string) => iso.slice(0, 8) + "01";
const addMonths = (iso: string, n: number) => {
  const d = new Date(`${monthStart(iso)}T12:00:00`);
  d.setMonth(d.getMonth() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};
const shortDay = (iso: string) => formatDateBR(iso).slice(0, 5);

function dayTitle(iso: string, today: string) {
  if (iso === today) return "Hoje";
  if (iso === addDays(today, 1)) return "Amanhã";
  return `${weekday(iso)}, ${formatDateBR(iso).slice(0, 5)}`;
}

export function AgendaManager({ tenant }: { tenant: TenantRow }) {
  const [today, setToday] = useState("");
  const [items, setItems] = useState<AppointmentRow[]>([]);
  const [contracts, setContracts] = useState<ContractLite[]>([]);
  const [email, setEmail] = useState<string | null>(null);
  const [emailReady, setEmailReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [prefill, setPrefill] = useState<string>("");
  const [initialDay, setInitialDay] = useState<string>("");
  const [msg, setMsg] = useState("");
  const [view, setView] = useState<View>("dia");
  const [cursor, setCursor] = useState("");

  const flash = (t: string) => {
    setMsg(t);
    setTimeout(() => setMsg(""), 4500);
  };

  const load = useCallback(async () => {
    const res = await fetch("/api/agenda", { cache: "no-store" });
    const d = await res.json().catch(() => ({}));
    if (res.ok && d.ok) {
      setToday(d.today);
      setCursor((c) => c || d.today);
      setItems(d.appointments);
      setContracts(d.contracts);
      setEmail(d.email);
      setEmailReady(d.emailReady);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const q = new URLSearchParams(window.location.search);
    if (q.get("novo")) setAdding(true);
    if (q.get("contrato")) setPrefill(q.get("contrato")!);
    if (/^\d{4}-\d{2}-\d{2}$/.test(q.get("dia") || "")) {
      setInitialDay(q.get("dia")!);
      setCursor(q.get("dia")!);
    }
    // Em tela grande, começa pela semana; no celular, pelo dia.
    else if (window.innerWidth >= 1024) setView("semana");
  }, [load]);

  const groups = useMemo(() => {
    const late = items.filter((a) => a.status === "scheduled" && a.starts_on < today);
    const upcoming = items.filter((a) => a.status === "scheduled" && a.starts_on >= today);
    const byDay = new Map<string, AppointmentRow[]>();
    for (const a of upcoming) byDay.set(a.starts_on, [...(byDay.get(a.starts_on) || []), a]);
    const done = items.filter((a) => a.status === "done").reverse().slice(0, 10);
    return { late, byDay: [...byDay.entries()], done };
  }, [items, today]);

  const conflicts = useMemo(() => conflictIds(items), [items]);

  async function update(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/agenda/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await res.json().catch(() => ({}));
    if (res.status === 409 && d.needsConfirm) {
      // Remarcar para um horário com aviso: a pessoa decide.
      const text = (d.warnings as Warning[]).map((w) => "• " + w.text).join("\n");
      if (confirm(text + "\n\nRemarcar mesmo assim?")) return update(id, { ...body, force: true });
      return;
    }
    if (!res.ok || !d.ok) return flash(d.error || "Não foi possível salvar.");
    setItems((cur) => cur.map((a) => (a.id === id ? d.appointment : a)));
  }

  async function remove(a: AppointmentRow) {
    if (!confirm(`Excluir o serviço de ${a.customer_name}?`)) return;
    const res = await fetch(`/api/agenda/${a.id}`, { method: "DELETE" });
    if (res.ok) setItems((cur) => cur.filter((x) => x.id !== a.id));
    else flash("Não foi possível excluir.");
  }

  async function testEmail() {
    const res = await fetch("/api/agenda/teste", { method: "POST" });
    const d = await res.json().catch(() => ({}));
    flash(d.message || d.error || "Não foi possível enviar.");
  }

  if (loading)
    return (
      <p className="flex items-center gap-2 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
      </p>
    );


  return (
    <div className="space-y-5">
      {msg && <div className="rounded-xl border border-[#3b82f6]/40 bg-[#3b82f6]/15 px-4 py-3 text-sm font-semibold text-slate-200">{msg}</div>}

      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0f172a] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-[#67e8f9]" />
          <p className="text-sm text-slate-300">
            {email ? (
              <>
                De manhã, nos dias em que você tem serviço ou cobrança, mandamos um resumo para <strong className="text-white">{email}</strong>.
              </>
            ) : (
              "Seu site não tem e-mail cadastrado, então o aviso do dia não pode ser enviado."
            )}
            {!emailReady && <span className="mt-1 block text-xs text-amber-300">O envio de e-mail ainda não foi ativado neste ambiente.</span>}
          </p>
        </div>
        {email && emailReady && (
          <button onClick={testEmail} className={smallBtn}>
            Enviar o de hoje agora
          </button>
        )}
      </div>

      {adding ? (
        <Sheet onClose={() => setAdding(false)}>
        <AppointmentForm
          today={today}
          contracts={contracts}
          prefillContract={prefill}
          initialDay={initialDay}
          others={items}
          onCancel={() => setAdding(false)}
          onCreated={(a) => {
            setItems((cur) => [...cur, a].sort((x, y) => (x.starts_on + (x.start_time || "99")).localeCompare(y.starts_on + (y.start_time || "99"))));
            setAdding(false);
            flash("Serviço marcado na agenda.");
          }}
        />
        </Sheet>
      ) : (
        <button onClick={() => setAdding(true)} className="flex w-full items-center justify-center gap-2 rounded-xl btn-shine px-6 py-4 text-base font-bold text-white hover:brightness-110">
          <CalendarPlus className="h-5 w-5" /> Marcar um serviço
        </button>
      )}

      {groups.late.length > 0 && (
        <Section title="Ficaram para trás" tone="warn">
          {groups.late.map((a) => (
            <Card key={a.id} a={a} tenant={tenant} today={today} conflict={conflicts.has(a.id)} onUpdate={update} onRemove={remove} />
          ))}
        </Section>
      )}

      <ViewBar
        view={view}
        cursor={cursor || today}
        today={today}
        onView={setView}
        onCursor={setCursor}
      />

      {view === "dia" && (
        <DayView
          day={cursor || today}
          today={today}
          list={items.filter((a) => a.status === "scheduled" && a.starts_on === (cursor || today))}
          empty={groups.byDay.length === 0 && groups.late.length === 0}
          render={(a) => <Card key={a.id} a={a} tenant={tenant} today={today} conflict={conflicts.has(a.id)} onUpdate={update} onRemove={remove} />}
          onNext={() => {
            const n = groups.byDay.find(([d]) => d > (cursor || today));
            if (n) setCursor(n[0]);
          }}
          hasNext={groups.byDay.some(([d]) => d > (cursor || today))}
        />
      )}

      {view === "semana" && (
        <WeekView
          start={weekStart(cursor || today)}
          today={today}
          items={items.filter((a) => a.status === "scheduled")}
          onPick={(d) => {
            setCursor(d);
            setView("dia");
          }}
        />
      )}

      {view === "mes" && (
        <MonthView
          month={monthStart(cursor || today)}
          today={today}
          items={items.filter((a) => a.status === "scheduled")}
          onPick={(d) => {
            setCursor(d);
            setView("dia");
          }}
        />
      )}

      {groups.done.length > 0 && (
        <details className="rounded-2xl border border-white/10 bg-[#0f172a] p-4">
          <summary className="cursor-pointer text-sm font-bold text-slate-300">Concluídos recentemente ({groups.done.length})</summary>
          <div className="mt-3 space-y-2">
            {groups.done.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 text-sm text-slate-300">
                <span className="truncate">
                  {formatDateBR(a.starts_on)} · {a.customer_name} · {a.title}
                </span>
                <button onClick={() => update(a.id, { status: "scheduled" })} className={smallBtn}>
                  <RotateCcw className="h-3.5 w-3.5" /> Reabrir
                </button>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function ViewBar({
  view, cursor, today, onView, onCursor,
}: {
  view: View;
  cursor: string;
  today: string;
  onView: (v: View) => void;
  onCursor: (d: string) => void;
}) {
  const step = (dir: 1 | -1) => {
    if (view === "dia") onCursor(addDays(cursor, dir));
    else if (view === "semana") onCursor(addDays(cursor, 7 * dir));
    else onCursor(addMonths(cursor, dir));
  };
  let label: string;
  if (view === "dia") label = dayTitle(cursor, today);
  else if (view === "semana") {
    const a = weekStart(cursor);
    label = `${shortDay(a)} a ${shortDay(addDays(a, 6))}`;
  } else label = `${MONTHS[Number(cursor.slice(5, 7)) - 1]} de ${cursor.slice(0, 4)}`;
  const isNow = view === "dia" ? cursor === today : view === "semana" ? weekStart(cursor) === weekStart(today) : monthStart(cursor) === monthStart(today);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-[#0f172a] p-1">
        {(["dia", "semana", "mes"] as const).map((v) => (
          <button
            key={v}
            onClick={() => onView(v)}
            className={`min-h-11 rounded-lg text-sm font-bold capitalize ${view === v ? "btn-shine text-white" : "text-slate-300 hover:bg-white/10"}`}
          >
            {v === "mes" ? "Mês" : v === "dia" ? "Dia" : "Semana"}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => step(-1)} aria-label="Anterior" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/15 bg-[#0f172a] text-slate-200 hover:bg-white/10">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-base font-bold capitalize text-white">{label}</p>
        <button onClick={() => step(1)} aria-label="Próximo" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/15 bg-[#0f172a] text-slate-200 hover:bg-white/10">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      {!isNow && (
        <button onClick={() => onCursor(today)} className="w-full rounded-xl border border-white/15 bg-[#0f172a] py-2.5 text-sm font-bold text-[#67e8f9] hover:bg-white/10">
          Voltar para hoje
        </button>
      )}
    </div>
  );
}

function DayView({
  day, today, list, empty, render, onNext, hasNext,
}: {
  day: string;
  today: string;
  list: AppointmentRow[];
  empty: boolean;
  render: (a: AppointmentRow) => React.ReactNode;
  onNext: () => void;
  hasNext: boolean;
}) {
  if (list.length === 0)
    return (
      <div className="space-y-3 rounded-2xl border border-dashed border-white/15 bg-[#0f172a] p-6 text-center">
        <p className="text-sm text-slate-300">
          {empty
            ? "Nenhum serviço marcado. Quando combinar um dia com o cliente, marque aqui e você recebe o aviso no dia."
            : day === today
              ? "Nada marcado para hoje. Dia livre!"
              : "Nada marcado para este dia."}
        </p>
        {hasNext && (
          <button onClick={onNext} className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold text-[#67e8f9] hover:bg-white/10">
            Ir para o próximo dia com serviço
          </button>
        )}
      </div>
    );
  return <div className="space-y-2">{list.map(render)}</div>;
}

function WeekView({ start, today, items, onPick }: { start: string; today: string; items: AppointmentRow[]; onPick: (d: string) => void }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="space-y-2">
      {days.map((d, i) => {
        const list = items.filter((a) => a.starts_on === d);
        return (
          <button
            key={d}
            onClick={() => onPick(d)}
            className={`flex w-full items-start gap-3 rounded-2xl border bg-[#0f172a] p-3 text-left hover:bg-white/5 ${d === today ? "border-[#67e8f9]/60" : "border-white/10"}`}
          >
            <div className="w-12 shrink-0 text-center">
              <p className="text-xs font-bold uppercase text-slate-400">{WEEK_SHORT[i]}</p>
              <p className={`text-lg font-bold ${d === today ? "text-[#67e8f9]" : "text-white"}`}>{d.slice(8, 10)}</p>
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              {list.length === 0 ? (
                <p className="pt-2 text-sm text-slate-500">Livre</p>
              ) : (
                list.map((a) => (
                  <p key={a.id} className="truncate text-sm text-slate-200">
                    <span className="font-bold text-white">{a.start_time ? hhmm(a.start_time) : "—"}</span> {a.customer_name}
                    <span className="text-slate-400"> · {a.title}</span>
                  </p>
                ))
              )}
            </div>
            {list.length > 0 && <span className="rounded-full btn-shine px-2 py-0.5 text-xs font-bold text-white">{list.length}</span>}
          </button>
        );
      })}
    </div>
  );
}

function MonthView({ month, today, items, onPick }: { month: string; today: string; items: AppointmentRow[]; onPick: (d: string) => void }) {
  const lead = dow(month);
  const total = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: total }, (_, i) => month.slice(0, 8) + String(i + 1).padStart(2, "0"))];
  const count = new Map<string, number>();
  for (const a of items) count.set(a.starts_on, (count.get(a.starts_on) || 0) + 1);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f172a] p-2">
      <div className="grid grid-cols-7 pb-1 text-center text-[11px] font-bold uppercase text-slate-400">
        {WEEK_SHORT.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) =>
          d ? (
            <button
              key={d}
              onClick={() => onPick(d)}
              className={`flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-bold hover:bg-white/10 ${d === today ? "border border-[#67e8f9] text-[#67e8f9]" : "text-white"}`}
            >
              {Number(d.slice(8, 10))}
              {count.get(d) ? <span className="mt-0.5 rounded-full btn-shine px-1.5 text-[10px] leading-4 text-white">{count.get(d)}</span> : <span className="h-4" />}
            </button>
          ) : (
            <span key={`e${i}`} />
          )
        )}
      </div>
    </div>
  );
}

function Section({ title, badge, tone, children }: { title: string; badge?: number; tone?: "warn"; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wide ${tone === "warn" ? "text-amber-700" : "text-slate-500"}`}>
        {title}
        {!!badge && <span className="rounded-full btn-shine px-2 py-0.5 text-xs text-white">{badge}</span>}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Card({
  a, tenant, today, conflict, onUpdate, onRemove,
}: {
  a: AppointmentRow;
  conflict: boolean;
  tenant: TenantRow;
  today: string;
  onUpdate: (id: string, body: Record<string, unknown>) => Promise<void>;
  onRemove: (a: AppointmentRow) => void;
}) {
  const [moving, setMoving] = useState(false);
  const [day, setDay] = useState(a.starts_on);
  const [time, setTime] = useState(hhmm(a.start_time));
  const cancelled = a.status === "cancelled";

  const confirmText =
    `Olá, ${first(a.customer_name)}! Aqui é da ${tenant.business_name}. ` +
    `Confirmando nosso serviço (${a.title}) para ${weekday(a.starts_on)}, ${formatDateBR(a.starts_on)}${a.start_time ? ` às ${hhmm(a.start_time)}` : ""}.` +
    `${a.address ? `\nLocal: ${a.address}` : ""}\nAté lá!`;

  return (
    <article className={`rounded-2xl border bg-[#0f172a] p-4 ${a.starts_on < today && a.status === "scheduled" ? "border-amber-400/40" : "border-white/10"} ${cancelled ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-bold text-white">
            {a.customer_name}
            <span className="font-normal text-slate-400"> · {a.title}</span>
          </p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-400" /> {a.start_time ? `${hhmm(a.start_time)}–${endTime(a.start_time, a.duration_min)}` : "Horário a combinar"}
              {a.starts_on < today && ` · era ${formatDateBR(a.starts_on)}`}
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
          {conflict && (
            <p className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-bold text-red-300">
              <AlertTriangle className="h-3.5 w-3.5" /> Conflito de horário
            </p>
          )}
          {a.notes && <p className="text-sm text-slate-400">Obs.: {a.notes}</p>}
        </div>
        <button onClick={() => onRemove(a)} aria-label="Excluir" className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-red-300">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {!cancelled && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => onUpdate(a.id, { status: "done" })} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">
            <Check className="h-3.5 w-3.5" /> Concluído
          </button>
          {a.customer_phone && (
            <>
              <a href={whatsappLink(a.customer_phone, confirmText)} target="_blank" rel="noopener noreferrer" className={smallBtn}>
                <MessageCircle className="h-3.5 w-3.5 text-emerald-400" /> Confirmar com o cliente
              </a>
              <a href={`tel:+${a.customer_phone}`} className={smallBtn}>
                <Phone className="h-3.5 w-3.5" /> Ligar
              </a>
            </>
          )}
          <button onClick={() => setMoving((v) => !v)} className={smallBtn}>Remarcar</button>
          <button onClick={() => confirm("Cancelar este serviço?") && onUpdate(a.id, { status: "cancelled" })} className={`${smallBtn} !text-red-700`}>
            <X className="h-3.5 w-3.5" /> Cancelar
          </button>
        </div>
      )}

      {moving && (
        <Sheet title="Remarcar" onClose={() => setMoving(false)}>
        <p className="text-sm text-slate-300">{a.customer_name} · {a.title}</p>
        <div className="flex flex-col gap-3">
          <label className={`${lbl} flex-1`}>
            Novo dia
            <input type="date" value={day} min={today} onChange={(e) => setDay(e.target.value)} className={field} />
          </label>
          <label className={`${lbl} flex-1`}>
            Horário
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={field} />
          </label>
          <button
            onClick={async () => {
              await onUpdate(a.id, { starts_on: day, start_time: time || null });
              setMoving(false);
            }}
            className="rounded-xl btn-shine px-5 py-3 text-sm font-bold text-white hover:brightness-110"
          >
            Salvar
          </button>
        </div>
        </Sheet>
      )}
    </article>
  );
}

function AppointmentForm({
  today, contracts, prefillContract, initialDay, others, onCreated, onCancel,
}: {
  today: string;
  contracts: ContractLite[];
  prefillContract: string;
  initialDay: string;
  others: AppointmentRow[];
  onCreated: (a: AppointmentRow) => void;
  onCancel: () => void;
}) {
  const [contractId, setContractId] = useState("");
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [day, setDay] = useState(initialDay || today);
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [serverWarn, setServerWarn] = useState<Warning[]>([]);
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pick = useCallback(
    (id: string) => {
      setContractId(id);
      const c = contracts.find((x) => x.id === id);
      if (!c) return;
      setCustomer(c.customer_name);
      setPhone(c.customer_phone.replace(/^55/, ""));
      setTitle(c.title);
      if (c.delivery_date) setDay(c.delivery_date);
    },
    [contracts]
  );

  useEffect(() => {
    if (prefillContract) pick(prefillContract);
  }, [prefillContract, pick]);

  // Quando o serviço é marcado, "hoje" já pode ter chegado depois do carregamento.
  useEffect(() => {
    setDay((d) => d || today);
  }, [today]);

  const chips = [
    { l: "Hoje", v: today },
    { l: "Amanhã", v: addDays(today, 1) },
    { l: "Em 2 dias", v: addDays(today, 2) },
    { l: "Semana que vem", v: addDays(today, 7) },
  ];

  // Avisos ao vivo: conflito de horário, dia cheio, data passada, domingo, mesmo cliente.
  const warnings = useMemo(
    () =>
      day
        ? warningsFor({ customer_name: customer.trim() || "Cliente", starts_on: day, start_time: time || null, duration_min: duration }, others, today)
        : [],
    [day, time, duration, customer, others, today]
  );
  const shownWarnings = serverWarn.length ? serverWarn : warnings;

  async function save() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contract_id: contractId || null,
          customer_name: customer,
          customer_phone: phone,
          title,
          starts_on: day,
          start_time: time || null,
          duration_min: duration,
          address,
          notes,
          // Se há aviso na tela, a pessoa já viu: salvar vale como "mesmo assim".
          force: shownWarnings.length > 0,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.status === 409 && d.needsConfirm) {
        setServerWarn(d.warnings as Warning[]);
        return;
      }
      if (!res.ok || !d.ok) return setError(d.error || "Não foi possível salvar.");
      onCreated(d.appointment);
    } catch {
      setError("Sem conexão. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-[#0f172a] p-5">
      <h2 className="text-lg font-bold text-white">Marcar um serviço</h2>

      {contracts.length > 0 && (
        <label className={lbl}>
          Já tem contrato com esse cliente? (opcional)
          <select value={contractId} onChange={(e) => pick(e.target.value)} className={field}>
            <option value="">Não, preencher à mão</option>
            {contracts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.customer_name} · {c.title}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className={lbl}>
          Nome do cliente
          <input value={customer} onChange={(e) => setCustomer(e.target.value)} className={field} maxLength={80} />
        </label>
        <label className={lbl}>
          WhatsApp (opcional)
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={field} inputMode="tel" placeholder="(67) 99999-0000" />
        </label>
      </div>

      <label className={lbl}>
        O que vai fazer
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={field} maxLength={140} placeholder="Ex.: Instalar ar-condicionado" />
      </label>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-200">Que dia?</p>
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={c.l}
              type="button"
              onClick={() => setDay(c.v)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${day === c.v ? "border-[#67e8f9] btn-shine text-white" : "border-white/15 bg-[#0f172a] text-slate-200 hover:bg-white/10"}`}
            >
              {c.l}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input type="date" value={day} min={today} onChange={(e) => setDay(e.target.value)} className={field} aria-label="Dia" />
          <input type="time" value={time} onChange={(e) => { setTime(e.target.value); setServerWarn([]); }} className={field} aria-label="Horário (opcional)" />
        </div>
        <label className={lbl}>
          Quanto tempo leva
          <select value={duration} onChange={(e) => { setDuration(Number(e.target.value)); setServerWarn([]); }} className={field}>
            {DURATIONS.map((o) => (
              <option key={o.min} value={o.min}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>

      <label className={lbl}>
        Endereço (opcional)
        <input value={address} onChange={(e) => setAddress(e.target.value)} className={field} maxLength={200} />
      </label>
      <label className={lbl}>
        Observação (opcional)
        <input value={notes} onChange={(e) => setNotes(e.target.value)} className={field} maxLength={500} placeholder="Ex.: levar escada grande" />
      </label>

      {shownWarnings.length > 0 && (
        <div role="alert" className="space-y-1 rounded-xl border border-amber-400/40 bg-amber-400/15 p-3 text-sm text-amber-100">
          {shownWarnings.map((w, i) => (
            <p key={i} className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /> {w.text}
            </p>
          ))}
          <p className="text-xs text-amber-200/80">Você pode salvar mesmo assim ou mudar o dia e o horário.</p>
        </div>
      )}

      {error && <p className="text-sm font-semibold text-red-300">{error}</p>}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button onClick={onCancel} className="rounded-xl border border-white/15 px-5 py-3 text-sm font-bold text-slate-200 hover:bg-white/10">
          Cancelar
        </button>
        <button onClick={save} disabled={busy || !customer.trim() || !day} className="inline-flex items-center justify-center gap-2 rounded-xl btn-shine px-6 py-3 text-sm font-bold text-white hover:brightness-110 disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {shownWarnings.length > 0 ? "Salvar mesmo assim" : "Salvar na agenda"}
        </button>
      </div>
    </div>
  );
}
