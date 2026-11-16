"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, BadgeCheck, Banknote, CalendarClock, Check, ExternalLink, FilePlus2, Link2,
  Loader2, MessageCircle, Send, Trash2, Undo2, Wallet,
} from "lucide-react";
import type { QuoteRow, TenantRow } from "@/types/database.types";
import type { ContractWithPayments, PaymentRow } from "@/types/finance";
import { ContractForm } from "@/components/ContractForm";
import {
  METHODS, VIEW_CLASS, VIEW_LABEL, chargeMessage, contractMessage, contractProgress, contractUrl,
  paymentView, summarize, dueText, buildPlan,
} from "@/lib/contractUi";
import { PIX_TYPES, buildPixPayload, detectPixKeyType, prettyPixKey, type PixKeyType } from "@/lib/pix";
import { addDaysISO, formatBRL, formatDateBR, todayISO, whatsappLink } from "@/lib/quoteUi";

type Pix = { pix_key: string | null; pix_key_type: PixKeyType | null; owner_doc: string | null };

const card = "rounded-2xl border border-white/10 bg-[#0f172a] p-4 sm:p-5";
const input =
  "w-full rounded-xl border border-white/10 bg-[#0a0e17] px-3.5 py-3 text-base text-white placeholder:text-slate-500 focus:border-[#67e8f9] focus:outline-none";
const ghost =
  "inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/10 disabled:opacity-60";

const CONTRACT_LABEL: Record<string, string> = {
  draft: "Rascunho", sent: "Enviado", signed: "Aceito pelo cliente", completed: "Concluído", cancelled: "Cancelado",
};

export function FinanceManager({ tenant }: { tenant: TenantRow }) {
  const [pix, setPix] = useState<Pix>({ pix_key: null, pix_key_type: null, owner_doc: null });
  const [contracts, setContracts] = useState<ContractWithPayments[]>([]);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [initialQuote, setInitialQuote] = useState("");
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [toast, setToast] = useState("");
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const flash = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(""), 3500);
  };

  const load = useCallback(async () => {
    const res = await fetch("/api/financeiro", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      setPix(data.pix);
      setContracts(data.contracts);
      setQuotes(data.acceptedQuotes);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    // Vindo do painel ("Gerar contrato" de um orçamento aceito): já abre o formulário preenchido.
    const q = new URLSearchParams(window.location.search);
    if (q.get("novo")) setCreating(true);
    if (q.get("orcamento")) setInitialQuote(q.get("orcamento")!);
  }, [load]);

  const today = todayISO();
  const sum = useMemo(() => summarize(contracts, today), [contracts, today]);
  const shown = contracts.filter((c) =>
    filter === "all" ? true : c.status !== "cancelled" && !contractProgress(c.payments).settled
  );

  const pixCodeFor = (p: PaymentRow) =>
    pix.pix_key
      ? buildPixPayload({ key: pix.pix_key, name: tenant.business_name, city: tenant.city, amountCents: p.amount_cents })
      : undefined;

  async function paymentAction(c: ContractWithPayments, p: PaymentRow, body: Record<string, unknown>) {
    const res = await fetch(`/api/contratos/${c.id}/parcelas/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) return flash(data.error || "Não foi possível salvar.");
    setContracts((cur) =>
      cur.map((x) => (x.id === c.id ? { ...x, payments: x.payments.map((y) => (y.id === p.id ? data.payment : y)) } : x))
    );
  }

  /** Troca a forma de pagamento de um contrato que ainda não recebeu nada (ex.: o gerado do orçamento). */
  async function changePlan(c: ContractWithPayments, upfrontPct: number, balance: "completion" | "installments", installments = 1) {
    const payments = buildPlan(c.total_cents, { upfrontPct, balance, installments, today: todayISO(), firstDue: addDaysISO(30) });
    const res = await fetch(`/api/contratos/${c.id}/plano`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payments }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) return flash(data.error || "Não foi possível trocar a forma de pagamento.");
    setContracts((cur) => cur.map((x) => (x.id === c.id ? data.contract : x)));
    flash("Forma de pagamento atualizada.");
  }

  async function contractStatus(c: ContractWithPayments, status: string) {
    const res = await fetch(`/api/contratos/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) return flash(data.error || "Não foi possível salvar.");
    setContracts((cur) => cur.map((x) => (x.id === c.id ? data.contract : x)));
    if (status === "completed") flash("Serviço concluído. O saldo da entrega passou a vencer hoje.");
  }

  async function remove(c: ContractWithPayments) {
    if (!confirm(`Excluir o contrato de ${c.customer_name}? O histórico de pagamentos dele também será apagado.`)) return;
    const res = await fetch(`/api/contratos/${c.id}`, { method: "DELETE" });
    if (res.ok) setContracts((cur) => cur.filter((x) => x.id !== c.id));
    else flash("Não foi possível excluir.");
  }

  function sendContract(c: ContractWithPayments) {
    const url = contractUrl(origin, c.code);
    window.open(
      whatsappLink(c.customer_phone, contractMessage({ customer: c.customer_name, business: tenant.business_name, url, total_cents: c.total_cents })),
      "_blank",
      "noopener"
    );
    if (c.status === "draft") void contractStatus(c, "sent");
  }

  async function copyLink(c: ContractWithPayments) {
    try {
      await navigator.clipboard.writeText(contractUrl(origin, c.code));
      flash("Link do contrato copiado.");
    } catch {
      flash("Não consegui copiar o link.");
    }
  }

  function charge(c: ContractWithPayments, p: PaymentRow) {
    const overdue = paymentView(p, today) === "overdue";
    window.open(
      whatsappLink(
        c.customer_phone,
        chargeMessage({
          customer: c.customer_name,
          business: tenant.business_name,
          payment: p,
          url: contractUrl(origin, c.code),
          pixCode: pixCodeFor(p),
          overdue,
        })
      ),
      "_blank",
      "noopener"
    );
    void paymentAction(c, p, { type: "reminded" });
  }

  if (loading)
    return (
      <p className="flex items-center gap-2 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
      </p>
    );

  const tiles = [
    { label: "Já recebido", value: formatBRL(sum.received), icon: BadgeCheck, cls: "text-emerald-300" },
    { label: "Falta receber", value: formatBRL(sum.open), icon: Wallet, cls: "text-white" },
    { label: "Atrasado", value: formatBRL(sum.overdue), icon: AlertTriangle, cls: sum.overdue ? "text-red-300" : "text-slate-400", sub: sum.overdueCount ? `${sum.overdueCount} parcela(s)` : "" },
    { label: "Vence em 7 dias", value: formatBRL(sum.dueSoon), icon: CalendarClock, cls: "text-amber-300" },
    { label: "Na entrega", value: formatBRL(sum.onCompletion), icon: Banknote, cls: "text-violet-300" },
  ];

  return (
    <div className="space-y-5">
      {toast && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-bold text-emerald-200">{toast}</div>}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl border border-white/10 bg-[#0a0e17] p-3.5">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {t.label} <t.icon className="h-4 w-4" />
            </div>
            <div className={`mt-1.5 text-xl font-extrabold ${t.cls}`}>{t.value}</div>
            {t.sub && <div className="text-xs text-slate-400">{t.sub}</div>}
          </div>
        ))}
      </section>
      {sum.informed > 0 && (
        <p className="rounded-xl border border-sky-500/30 bg-sky-500/15 px-4 py-3 text-sm text-sky-200">
          Clientes avisaram que pagaram {formatBRL(sum.informed)}. Confira no seu banco e confirme abaixo.
        </p>
      )}

      <ol className="grid gap-2 text-sm sm:grid-cols-3">
        {[
          ["1", "Envie o contrato", "pelo WhatsApp do cliente"],
          ["2", "Cliente aceita", "pelo celular dele, com um toque"],
          ["3", "Mande o Pix", "o app já monta a cobrança pra você"],
        ].map(([n, t, d]) => (
          <li key={n} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0a0e17] p-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#3b82f6]/25 font-extrabold text-[#a5f3fc]">{n}</span>
            <span><b className="block">{t}</b><span className="text-xs text-slate-400">{d}</span></span>
          </li>
        ))}
      </ol>

      <PixCard pix={pix} onSaved={(p) => { setPix(p); flash("Pix salvo."); }} />

      {creating ? (
        <ContractForm
          quotes={quotes}
          initialQuoteId={initialQuote}
          onCancel={() => setCreating(false)}
          onCreated={(c) => {
            setContracts((cur) => [c, ...cur]);
            setQuotes((cur) => cur.filter((q) => q.id !== c.quote_id));
            setCreating(false);
            flash("Contrato criado. Envie para o cliente pelo WhatsApp.");
          }}
        />
      ) : (
        <button onClick={() => setCreating(true)} className="btn-shine text-white hover:brightness-110 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-extrabold">
          <FilePlus2 className="h-5 w-5" /> Novo contrato
        </button>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold">Contratos e pagamentos</h2>
        <div className="flex gap-1.5">
          {([["open", "Em aberto"], ["all", "Todos"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${filter === k ? "bg-[#3b82f6]" : "border border-white/10 text-slate-300 hover:bg-white/10"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 && (
        <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-400">
          {contracts.length === 0 ? "Nenhum contrato ainda. Crie o primeiro e acompanhe o que já foi pago e o que falta." : "Nada em aberto. Tudo certo por aqui."}
        </p>
      )}

      {shown.map((c) => {
        const prog = contractProgress(c.payments);
        const cancelled = c.status === "cancelled";
        return (
          <article key={c.id} className={`${card} space-y-4 ${cancelled ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-extrabold">{c.customer_name}</p>
                <p className="truncate text-sm text-slate-400">{c.title}</p>
                {c.quote_id && c.status === "draft" && (
                  <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#3b82f6]/15 px-2.5 py-0.5 text-xs font-bold text-[#a5f3fc]">
                    Gerado do orçamento aceito. Confira e envie.
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="font-extrabold">{formatBRL(c.total_cents)}</p>
                <p className="text-xs text-slate-400">{CONTRACT_LABEL[c.status]}{c.viewed_at && c.status === "sent" ? " · visto" : ""}</p>
              </div>
            </div>

            <div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${prog.pct}%` }} />
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {formatBRL(prog.paid)} de {formatBRL(prog.total)} recebidos ({prog.pct}%)
              </p>
            </div>

            <NextStep
              c={c}
              today={today}
              hasPix={Boolean(pix.pix_key)}
              onSend={() => sendContract(c)}
              onCharge={charge}
              onConfirm={(p) => paymentAction(c, p, { type: "paid", method: "Pix", paid_on: today })}
              onFinish={() => contractStatus(c, "completed")}
            />

            {!cancelled && c.status !== "completed" && !c.payments.some((p) => p.status === "paid" || p.status === "informed") && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-slate-400">Forma de pagamento:</span>
                {([
                  ["Tudo no início", 100, "completion", 1],
                  ["Tudo no final", 0, "completion", 1],
                  ["50% + 50%", 50, "completion", 1],
                  ["Entrada + 3x", 30, "installments", 3],
                ] as const).map(([label, pct, bal, n]) => (
                  <button key={label} onClick={() => changePlan(c, pct, bal, n)} className={ghost}>
                    {label}
                  </button>
                ))}
              </div>
            )}

            <ul className="space-y-2">
              {c.payments.map((p) => (
                <PaymentLine
                  key={p.id}
                  p={p}
                  today={today}
                  locked={cancelled}
                  onCharge={() => charge(c, p)}
                  onAction={(b) => paymentAction(c, p, b)}
                />
              ))}
            </ul>

            <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
              {!cancelled && (
                <button onClick={() => sendContract(c)} className={ghost}>
                  <Send className="h-3.5 w-3.5 text-emerald-400" /> {c.status === "draft" ? "Enviar contrato" : "Reenviar contrato"}
                </button>
              )}
              <button onClick={() => copyLink(c)} className={ghost}><Link2 className="h-3.5 w-3.5" /> Copiar link</button>
              <a href={`/c/${c.code}`} target="_blank" rel="noopener noreferrer" className={ghost}>
                <ExternalLink className="h-3.5 w-3.5" /> Ver
              </a>
              {!cancelled && c.status !== "completed" && (
                <a href={`/dashboard/agenda?novo=1&contrato=${c.id}`} className={ghost}>
                  <CalendarClock className="h-3.5 w-3.5" /> Agendar serviço
                </a>
              )}
              {!cancelled && c.status !== "completed" && (
                <button onClick={() => contractStatus(c, "completed")} className={ghost}><Check className="h-3.5 w-3.5" /> Serviço concluído</button>
              )}
              {!cancelled && c.status !== "completed" && (
                <button onClick={() => confirm("Cancelar este contrato? As parcelas em aberto serão canceladas.") && contractStatus(c, "cancelled")} className={`${ghost} !text-red-300`}>
                  Cancelar
                </button>
              )}
              <button onClick={() => remove(c)} aria-label="Excluir contrato" className={`${ghost} ml-auto !text-slate-400`}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

/** Diz em uma frase o que fazer agora neste contrato, com um botão só. */
function NextStep({
  c, today, hasPix, onSend, onCharge, onConfirm, onFinish,
}: {
  c: ContractWithPayments;
  today: string;
  hasPix: boolean;
  onSend: () => void;
  onCharge: (c: ContractWithPayments, p: PaymentRow) => void;
  onConfirm: (p: PaymentRow) => void;
  onFinish: () => void;
}) {
  if (c.status === "cancelled") return null;
  const open = c.payments.filter((p) => p.status !== "paid" && p.status !== "cancelled");
  const informed = open.find((p) => p.status === "informed");
  const due = open.find((p) => p.status !== "informed" && paymentView(p, today) !== "on_completion");
  const onDelivery = open.find((p) => paymentView(p, today) === "on_completion");

  let tone = "border-[#3b82f6]/40 bg-[#3b82f6]/10";
  let title = "";
  let text = "";
  let action: React.ReactNode = null;
  const btn = "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-extrabold disabled:opacity-60";
  const green = `${btn} bg-emerald-500 text-zinc-950 hover:bg-emerald-400`;

  if (!open.length) {
    tone = "border-emerald-500/40 bg-emerald-500/10";
    title = "Tudo pago. Parabéns!";
    text = "Esse contrato está quitado.";
  } else if (c.status === "draft") {
    title = "Passo 1: envie o contrato para o cliente";
    text = "Vai abrir o WhatsApp dele com o link. É só apertar enviar. Ele lê e aceita pelo celular.";
    action = (
      <button onClick={onSend} className={green}>
        <Send className="h-4 w-4" /> Enviar contrato no WhatsApp
      </button>
    );
  } else if (c.status === "sent") {
    title = c.viewed_at ? "O cliente já abriu o contrato" : "Esperando o cliente aceitar o contrato";
    text = "Quando ele aceitar, você recebe um aviso aqui e no celular. Se demorar, mande um lembrete.";
    action = (
      <button onClick={onSend} className={`${btn} border border-white/20 text-white hover:bg-white/10`}>
        <Send className="h-4 w-4" /> Lembrar no WhatsApp
      </button>
    );
  } else if (informed) {
    tone = "border-sky-500/40 bg-sky-500/10";
    title = `O cliente disse que pagou ${formatBRL(informed.amount_cents)}`;
    text = "Abra o aplicativo do seu banco e veja se o dinheiro entrou. Se entrou, confirme aqui.";
    action = (
      <button onClick={() => onConfirm(informed)} className={green}>
        <Check className="h-4 w-4" /> Sim, o dinheiro entrou
      </button>
    );
  } else if (!hasPix && due) {
    tone = "border-amber-400/50 bg-amber-400/10";
    title = "Falta só cadastrar sua chave Pix";
    text = "Sem ela o cliente não tem para onde pagar. Leva 1 minuto.";
    action = (
      <button
        onClick={() => document.getElementById("pix-card")?.scrollIntoView({ behavior: "smooth", block: "center" })}
        className={`${btn} bg-amber-400 text-zinc-950 hover:bg-amber-300`}
      >
        Cadastrar chave Pix
      </button>
    );
  } else if (due) {
    tone = "border-emerald-500/40 bg-emerald-500/10";
    title = `O cliente aceitou! Agora cobre ${formatBRL(due.amount_cents)}`;
    text = "Vai abrir o WhatsApp dele já com o Pix pronto (copia e cola e QR Code). É só apertar enviar. Quando ele pagar, volte aqui.";
    action = (
      <button onClick={() => onCharge(c, due)} className={green}>
        <MessageCircle className="h-4 w-4" /> Mandar Pix no WhatsApp
      </button>
    );
  } else if (onDelivery) {
    title = "O resto é pago quando o serviço terminar";
    text = "Terminou o trabalho? Toque no botão e a cobrança do que falta fica liberada.";
    action = (
      <button onClick={onFinish} className={green}>
        <Check className="h-4 w-4" /> Terminei o serviço
      </button>
    );
  } else return null;

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${tone}`}>
      <div className="min-w-0 flex-1 basis-60">
        <p className="font-extrabold">{title}</p>
        <p className="mt-0.5 text-sm text-slate-300">{text}</p>
      </div>
      {action}
    </div>
  );
}

function PaymentLine({
  p, today, locked, onCharge, onAction,
}: {
  p: PaymentRow;
  today: string;
  locked: boolean;
  onCharge: () => void;
  onAction: (body: Record<string, unknown>) => Promise<void>;
}) {
  const view = paymentView(p, today);
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState("Pix");
  const [paidOn, setPaidOn] = useState(today);
  const [busy, setBusy] = useState(false);
  const run = async (b: Record<string, unknown>) => {
    setBusy(true);
    await onAction(b);
    setBusy(false);
    setOpen(false);
  };

  return (
    <li className="rounded-xl border border-white/10 bg-[#0a0e17] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold">{p.label}</p>
          <p className="text-xs text-slate-400">
            {p.status === "paid"
              ? `Recebido em ${formatDateBR((p.paid_at || "").slice(0, 10))}${p.paid_method ? ` · ${p.paid_method}` : ""}`
              : dueText(p) || "a combinar"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${VIEW_CLASS[view]}`}>{VIEW_LABEL[view]}</span>
          <span className="text-sm font-extrabold">{formatBRL(p.amount_cents)}</span>
        </div>
      </div>

      {!locked && p.status !== "cancelled" && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {p.status !== "paid" ? (
            <>
              <button onClick={onCharge} className={ghost}>
                <MessageCircle className="h-3.5 w-3.5 text-emerald-400" /> {view === "overdue" ? "Cobrar no WhatsApp" : "Mandar Pix no WhatsApp"}
              </button>
              <button onClick={() => setOpen((v) => !v)} className={`${ghost} !border-emerald-500/30 !text-emerald-300`}>
                <Check className="h-3.5 w-3.5" /> Já recebi
              </button>
            </>
          ) : (
            <button onClick={() => run({ type: "undo" })} disabled={busy} className={ghost}>
              <Undo2 className="h-3.5 w-3.5" /> Desfazer
            </button>
          )}
          {p.last_reminder_at && p.status !== "paid" && (
            <span className="self-center text-[11px] text-slate-400">cobrado em {formatDateBR(p.last_reminder_at.slice(0, 10))}</span>
          )}
        </div>
      )}

      {open && (
        <div className="mt-2 flex flex-col gap-2 border-t border-white/10 pt-2 sm:flex-row sm:items-end">
          <label className="block flex-1 text-[11px] font-bold text-slate-400">
            Forma
            <select value={method} onChange={(e) => setMethod(e.target.value)} className={`${input} !py-2 text-sm`}>
              {METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <label className="block flex-1 text-[11px] font-bold text-slate-400">
            Recebido em
            <input type="date" value={paidOn} max={today} onChange={(e) => setPaidOn(e.target.value)} className={`${input} !py-2 text-sm`} />
          </label>
          <button onClick={() => run({ type: "paid", method, paid_on: paidOn })} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-extrabold text-zinc-950 disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar recebimento
          </button>
        </div>
      )}
    </li>
  );
}

function PixCard({ pix, onSaved }: { pix: Pix; onSaved: (p: Pix) => void }) {
  const [editing, setEditing] = useState(!pix.pix_key);
  const [type, setType] = useState<PixKeyType>(pix.pix_key_type || "cpf");
  const [key, setKey] = useState(pix.pix_key ? prettyPixKey(pix.pix_key_type, pix.pix_key) : "");
  const [doc, setDoc] = useState(pix.owner_doc || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(clear = false) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/financeiro/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pix_key: clear ? "" : key, pix_key_type: type, owner_doc: doc }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) return setError(data.error || "Não foi possível salvar.");
      onSaved(data.pix);
      setEditing(!data.pix.pix_key);
      if (clear) setKey("");
    } catch {
      setError("Sem conexão. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="pix-card" className={`${card} space-y-3 ${!pix.pix_key ? "!border-amber-400/50" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-extrabold">{pix.pix_key ? "Sua chave Pix (onde o dinheiro cai)" : "Antes de cobrar: cadastre sua chave Pix"}</h2>
        {pix.pix_key && !editing && (
          <button onClick={() => setEditing(true)} className={ghost}>Alterar</button>
        )}
      </div>
      {!editing && pix.pix_key ? (
        <p className="text-sm text-slate-300">
          <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-xs font-bold uppercase">{PIX_TYPES.find((t) => t.id === pix.pix_key_type)?.label}</span>{" "}
          <strong className="text-white">{prettyPixKey(pix.pix_key_type, pix.pix_key)}</strong>
          {pix.owner_doc && <span className="block text-xs text-slate-400">Documento no contrato: {pix.owner_doc}</span>}
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-300">
            É a chave que você já usa no seu banco (CPF, celular, e-mail...). Com ela, o app monta o Pix com o valor certo para o cliente pagar, e o dinheiro cai direto na sua conta.
          </p>
          <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
            <select value={type} onChange={(e) => setType(e.target.value as PixKeyType)} className={input}>
              {PIX_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <input value={key} onChange={(e) => { setKey(e.target.value); const t = detectPixKeyType(e.target.value); if (t) setType(t); }} placeholder={PIX_TYPES.find((t) => t.id === type)?.placeholder} className={input} />
          </div>
          <label className="block space-y-1 text-sm font-bold text-slate-300">
            Número do CNPJ ou CPF que aparece no contrato (opcional)
            <input
              value={doc}
              onChange={(e) => setDoc(e.target.value)}
              inputMode="numeric"
              placeholder="00.000.000/0000-00"
              className={input}
              maxLength={30}
            />
            <span className="block text-xs font-normal text-slate-400">
              Só os números. O nome que vai no contrato é o nome do seu site (para mudar: Editar textos e serviços).
            </span>
            {!doc && (type === "cnpj" || type === "cpf") && key && (
              <button type="button" onClick={() => setDoc(key)} className="text-xs font-bold text-[#67e8f9] underline">
                Usar o mesmo número da chave Pix
              </button>
            )}
          </label>
          {error && <p className="text-sm font-bold text-red-300">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => save()} disabled={busy} className="btn-shine text-white hover:brightness-110 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-extrabold disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Salvar Pix
            </button>
            {pix.pix_key && (
              <>
                <button onClick={() => setEditing(false)} className={ghost}>Cancelar</button>
                <button onClick={() => save(true)} disabled={busy} className={`${ghost} !text-red-300`}>Remover</button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
