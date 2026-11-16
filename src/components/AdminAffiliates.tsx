"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Percent, Plus, Save, UserPlus } from "lucide-react";
import { brl } from "@/lib/plans";
import { PIX_TYPE_LABEL, ruleText, type PixKeyType } from "@/lib/affiliateRules";
import type { AdminAffiliate, AdminPayout } from "@/lib/affiliateStore";

type Payload = { defaultRate: number; minPayout: number; affiliates: AdminAffiliate[]; payouts: AdminPayout[] };

const date = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");
const field =
  "w-full rounded-lg border border-white/10 bg-[#0a0e17] px-2.5 py-1.5 text-sm text-white placeholder:text-slate-500 focus:border-[#67e8f9] focus:outline-none";

async function call(body: object): Promise<string | null> {
  const r = await fetch("/api/admin/afiliados", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  return d.ok ? null : d.error || "Erro.";
}

/** Linha editável: o admin define a % e quantos pagamentos geram comissão para cada afiliado. */
function AffiliateRow({ a, onSaved }: { a: AdminAffiliate; onSaved: (msg: string) => void }) {
  const [rate, setRate] = useState(String(a.rate));
  const [max, setMax] = useState(a.max_payments === null ? "" : String(a.max_payments));
  const [code, setCode] = useState(a.code);
  const [active, setActive] = useState(a.active);
  const [kind, setKind] = useState(a.kind);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const dirty =
    Number(rate) !== a.rate ||
    (max === "" ? null : Number(max)) !== a.max_payments ||
    code !== a.code ||
    active !== a.active ||
    kind !== a.kind;

  async function save() {
    setBusy(true);
    setErr("");
    const e = await call({
      action: "update",
      id: a.id,
      kind,
      code,
      rate: Number(rate.replace(",", ".")),
      max_payments: max === "" ? null : Number(max),
      active,
    });
    setBusy(false);
    if (e) setErr(e);
    else onSaved(`Salvo: ${a.business_name} — ${ruleText(Number(rate.replace(",", ".")), max === "" ? null : Number(max))}.`);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0a0e17] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-extrabold">{a.business_name}</span>
            {a.kind === "influencer" && (
              <span className="rounded-full border border-violet-400/30 bg-violet-400/15 px-2 py-0.5 text-[11px] font-bold text-violet-300">
                Parceiro
              </span>
            )}
            {!a.active && (
              <span className="rounded-full border border-red-500/30 bg-red-500/15 px-2 py-0.5 text-[11px] font-bold text-red-300">
                Desativado
              </span>
            )}
          </div>
          <p className="truncate text-xs text-slate-400">{a.email || "sem e-mail"}</p>
        </div>
        <div className="flex gap-4 text-right text-xs text-slate-300">
          <span>
            <strong className="block text-base text-white">{a.referrals}</strong>indicados
          </span>
          <span>
            <strong className="block text-base text-white">{a.paying}</strong>pagantes
          </span>
          <span>
            <strong className="block text-base text-emerald-300">{brl(a.earned)}</strong>comissões
          </span>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[6rem_8rem_1fr_9rem_auto]">
        <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
          Comissão %
          <input value={rate} onChange={(e) => setRate(e.target.value)} inputMode="decimal" className={`${field} mt-1`} />
        </label>
        <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
          Pagamentos
          <input
            value={max}
            onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))}
            placeholder="todos"
            inputMode="numeric"
            className={`${field} mt-1`}
          />
        </label>
        <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
          Código do link
          <input value={code} onChange={(e) => setCode(e.target.value.toLowerCase())} className={`${field} mt-1 font-mono`} />
        </label>
        <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
          Tipo
          <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className={`${field} mt-1`}>
            <option value="client">Cliente</option>
            <option value="influencer">Parceiro</option>
          </select>
        </label>
        <div className="flex items-end gap-2">
          <label className="flex items-center gap-1.5 pb-2 text-xs font-bold text-slate-300">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Ativo
          </label>
          <button
            onClick={save}
            disabled={!dirty || busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#3b82f6] px-3 py-1.5 text-sm font-extrabold disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Regra atual: {ruleText(a.rate, a.max_payments)}. Vazio em "Pagamentos" = comissão em todos os pagamentos.
      </p>
      {err && <p className="mt-1 text-xs font-bold text-red-300">{err}</p>}
    </div>
  );
}

export function AdminAffiliates({ onToast }: { onToast: (msg: string) => void }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [busyPayout, setBusyPayout] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", code: "", rate: "40", max: "1" });
  const [adding, setAdding] = useState(false);
  const [formErr, setFormErr] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/afiliados", { cache: "no-store" });
    const d = await r.json().catch(() => ({}));
    if (d.ok) setData(d);
    else setError(d.error || "Não foi possível carregar.");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function resolvePayout(id: string, status: "pago" | "recusado") {
    const note = status === "recusado" ? window.prompt("Motivo da recusa (opcional):") ?? "" : "";
    setBusyPayout(id);
    const e = await call({ action: "payout", id, status, note });
    setBusyPayout(null);
    onToast(e || (status === "pago" ? "Saque marcado como pago." : "Saque recusado; o saldo voltou ao afiliado."));
    await load();
  }

  async function addInfluencer() {
    setAdding(true);
    setFormErr("");
    const e = await call({
      action: "influencer",
      email: form.email,
      code: form.code,
      rate: Number(form.rate.replace(",", ".")),
      max_payments: form.max === "" ? null : Number(form.max),
    });
    setAdding(false);
    if (e) return setFormErr(e);
    setForm({ email: "", code: "", rate: "40", max: "1" });
    onToast("Parceiro criado.");
    await load();
  }

  if (error) return <p className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>;
  if (!data)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#67e8f9]" />
      </div>
    );

  const open = data.payouts.filter((p) => p.status === "solicitado");
  const closed = data.payouts.filter((p) => p.status !== "solicitado");

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#3b82f6]/30 bg-[#3b82f6]/10 p-4 text-sm text-slate-200">
        <p className="flex items-center gap-2 font-extrabold text-white">
          <Percent className="h-4 w-4 text-[#67e8f9]" /> Como funciona
        </p>
        <p className="mt-1">
          Padrão de todo mundo: <strong>{data.defaultRate}% do primeiro pagamento</strong> de cada indicado. Para dar mais a alguém,
          mude a % (e, se quiser, quantos pagamentos rendem comissão) na linha da pessoa. A comissão libera 30 dias após o
          pagamento; saque mínimo de {brl(data.minPayout)}. Quem ainda não aparece na lista só entra depois de abrir
          “Indique e ganhe” no painel, ou crie abaixo pelo e-mail.
        </p>
      </section>

      {/* SAQUES */}
      <section className="space-y-2">
        <h2 className="text-lg font-extrabold">
          Saques pedidos {open.length > 0 && <span className="ml-1 rounded-full bg-amber-400 px-2 py-0.5 text-xs text-black">{open.length}</span>}
        </h2>
        {open.length === 0 && <p className="text-sm text-slate-400">Nenhum saque pendente.</p>}
        {open.map((p) => (
          <div key={p.id} className="flex flex-col gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-extrabold">
                {brl(p.amount)} <span className="font-semibold text-slate-300">— {p.business_name}</span>
              </p>
              <p className="break-all text-xs text-slate-300">
                Pix {PIX_TYPE_LABEL[p.pix_key_type as PixKeyType] ?? p.pix_key_type}: <span className="font-mono text-white">{p.pix_key}</span>
              </p>
              <p className="text-xs text-slate-400">Pedido em {date(p.requested_at)}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => resolvePayout(p.id, "pago")}
                disabled={busyPayout === p.id}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-extrabold text-zinc-950 disabled:opacity-60"
              >
                {busyPayout === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Marcar pago
              </button>
              <button
                onClick={() => resolvePayout(p.id, "recusado")}
                disabled={busyPayout === p.id}
                className="rounded-lg border border-red-500/30 px-3 py-2 text-sm font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-60"
              >
                Recusar
              </button>
            </div>
          </div>
        ))}
        {closed.length > 0 && (
          <details className="rounded-2xl border border-white/10 p-3 text-sm">
            <summary className="cursor-pointer font-bold text-slate-300">Histórico ({closed.length})</summary>
            <ul className="mt-2 divide-y divide-white/10">
              {closed.map((p) => (
                <li key={p.id} className="flex justify-between gap-3 py-2 text-xs text-slate-300">
                  <span>
                    {p.business_name} · {date(p.requested_at)}
                    {p.note ? ` · ${p.note}` : ""}
                  </span>
                  <span className={p.status === "pago" ? "text-emerald-300" : "text-red-300"}>
                    {brl(p.amount)} · {p.status}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {/* NOVO PARCEIRO */}
      <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="flex items-center gap-2 text-lg font-extrabold">
          <UserPlus className="h-5 w-5 text-[#67e8f9]" /> Criar parceiro com comissão própria
        </h2>
        <div className="grid gap-2 sm:grid-cols-[1.5fr_1fr_6rem_6rem_auto]">
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="E-mail do site dele" className={field} />
          <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase() })} placeholder="código-do-link" className={`${field} font-mono`} />
          <input value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} placeholder="%" inputMode="decimal" aria-label="Comissão %" className={field} />
          <input value={form.max} onChange={(e) => setForm({ ...form, max: e.target.value.replace(/\D/g, "") })} placeholder="todos" inputMode="numeric" aria-label="Quantidade de pagamentos" className={field} />
          <button
            onClick={addInfluencer}
            disabled={adding}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#3b82f6] px-3 py-1.5 text-sm font-extrabold disabled:opacity-60"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Criar
          </button>
        </div>
        <p className="text-xs text-slate-400">E-mail do cadastro do site · código do link · comissão % · nº de pagamentos (vazio = todos).</p>
        {formErr && <p className="text-xs font-bold text-red-300">{formErr}</p>}
      </section>

      {/* AFILIADOS */}
      <section className="space-y-2">
        <h2 className="text-lg font-extrabold">Afiliados ({data.affiliates.length})</h2>
        {data.affiliates.length === 0 && <p className="text-sm text-slate-400">Ninguém abriu o programa de indicação ainda.</p>}
        {data.affiliates.map((a) => (
          <AffiliateRow key={a.id + a.rate + a.code + a.kind} a={a} onSaved={(m) => { onToast(m); void load(); }} />
        ))}
      </section>
    </div>
  );
}
