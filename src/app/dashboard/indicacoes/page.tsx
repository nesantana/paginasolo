"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Banknote,
  Check,
  Clock,
  Copy,
  Gift,
  Hourglass,
  Loader2,
  MessageCircle,
  Users,
  Wallet,
} from "lucide-react";
import { OwnerShell, useOwnerTenant } from "@/components/OwnerShell";
import { brl } from "@/lib/plans";
import { HOLD_DAYS, PIX_TYPES, PIX_TYPE_LABEL, ruleText, type PixKeyType } from "@/lib/affiliateRules";
import type { MyAffiliate } from "@/lib/affiliateStore";

const PAYOUT_BADGE = {
  solicitado: { label: "Em análise", cls: "bg-amber-400/15 text-amber-300 border-amber-400/30" },
  pago: { label: "Pago", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  recusado: { label: "Recusado", cls: "bg-red-500/15 text-red-300 border-red-500/30" },
} as const;

const date = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  sub?: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f172a] p-4">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-4.5 w-4.5" />
      </span>
      <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-0.5 text-2xl font-extrabold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

export default function IndicacoesPage() {
  const tenant = useOwnerTenant();
  const [data, setData] = useState<MyAffiliate | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState<"pix" | "payout" | null>(null);
  const [copied, setCopied] = useState(false);
  const [pixKey, setPixKey] = useState("");
  const [pixType, setPixType] = useState<PixKeyType>("cpf");

  const apply = useCallback((a: MyAffiliate) => {
    setData(a);
    setPixKey(a.pix_key || "");
    if (a.pix_key_type) setPixType(a.pix_key_type);
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/afiliado", { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 401) {
          window.location.href = "/entrar";
          return;
        }
        const d = await r.json().catch(() => ({}));
        if (!alive) return;
        if (d.ok) apply(d.affiliate);
        else setError(d.error || "Não foi possível carregar.");
      })
      .catch(() => alive && setError("Sem conexão. Tente de novo."));
    return () => {
      alive = false;
    };
  }, [apply]);

  async function post(body: object, kind: "pix" | "payout", okMsg: string) {
    setBusy(kind);
    setError("");
    setMsg("");
    try {
      const r = await fetch("/api/afiliado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json().catch(() => ({}));
      if (d.ok) {
        apply(d.affiliate);
        setMsg(okMsg);
        setTimeout(() => setMsg(""), 4000);
      } else setError(d.error || "Algo deu errado.");
    } finally {
      setBusy(null);
    }
  }

  const link = data && typeof window !== "undefined" ? `${window.location.origin}/?ref=${data.code}` : "";
  const share = `https://wa.me/?text=${encodeURIComponent(
    `Uso a autonomIA para fazer orçamento, contrato, agenda e cobrar por Pix direto do celular, e o site é grátis. Conheça pelo meu link: ${link}`
  )}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Não foi possível copiar. Selecione o link e copie à mão.");
    }
  }

  const canWithdraw = !!data && data.available >= data.min_payout && !!data.pix_key;

  return (
    <OwnerShell title="Indique e ganhe" subtitle={tenant ? `Programa de indicação de ${tenant.business_name}` : undefined}>
      {!data && !error && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-[#67e8f9]" />
        </div>
      )}
      {!data && error && (
        <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </p>
      )}

      {data && (
        <>
          {/* LINK */}
          <section className="relative isolate overflow-hidden rounded-3xl border border-emerald-400/25 bg-gradient-to-br from-emerald-500/20 via-[#0f172a] to-[#3b82f6]/15 p-5 sm:p-7">
            <div className="absolute -right-12 -top-12 -z-10 h-48 w-48 rounded-full bg-emerald-400/20 blur-[70px]" />
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300">
              <Gift className="h-3.5 w-3.5" />
              {data.kind === "influencer" ? "Perfil parceiro" : "Seu link de indicação"}
            </span>
            <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">
              Ganhe <span className="text-emerald-300">{data.rate}%</span> por cada colega que assinar
            </h2>
            <p className="mt-1 text-sm text-slate-300">Você ganha {ruleText(data.rate, data.max_payments)}.</p>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <input
                readOnly
                value={link}
                onFocus={(e) => e.currentTarget.select()}
                aria-label="Link de indicação"
                className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/30 px-3.5 py-3 font-mono text-xs text-white"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copy}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold hover:bg-white/15 sm:flex-none"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copiado" : "Copiar"}
                </button>
                <a
                  href={share}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-extrabold text-zinc-950 hover:bg-emerald-400 sm:flex-none"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              </div>
            </div>
            {!data.active && (
              <p className="mt-3 text-xs font-bold text-red-300">Seu link está desativado no momento. Fale com o suporte.</p>
            )}
          </section>

          {(msg || error) && (
            <p
              role={error ? "alert" : "status"}
              className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
                error
                  ? "border-red-500/30 bg-red-500/10 text-red-200"
                  : "border-emerald-500/30 bg-emerald-500/15 text-emerald-200"
              }`}
            >
              {error || msg}
            </p>
          )}

          {/* SALDOS */}
          <section className="grid grid-cols-2 gap-3">
            <Stat icon={Wallet} label="Disponível" value={brl(data.available)} sub={`Saque a partir de ${brl(data.min_payout)}`} tone="bg-emerald-500/15 text-emerald-300" />
            <Stat icon={Hourglass} label="A liberar" value={brl(data.pending)} sub={`Libera ${HOLD_DAYS} dias após o pagamento`} tone="bg-amber-400/15 text-amber-300" />
            <Stat icon={Clock} label="Saque em análise" value={brl(data.requested)} tone="bg-sky-400/15 text-sky-300" />
            <Stat icon={Banknote} label="Já recebido" value={brl(data.paid)} tone="bg-violet-400/15 text-violet-300" />
          </section>

          {/* PIX */}
          <section className="space-y-3 rounded-3xl border border-white/15 bg-[#0f172a] p-5 sm:p-6">
            <h2 className="text-lg font-extrabold">Receber por Pix</h2>
            <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
              <label className="block text-xs font-bold text-slate-200">
                Tipo da chave
                <select
                  value={pixType}
                  onChange={(e) => setPixType(e.target.value as PixKeyType)}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-[#0a0e17] px-3 py-2.5 text-sm font-normal text-white"
                >
                  {PIX_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {PIX_TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-bold text-slate-200">
                Chave Pix
                <input
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="Sua chave Pix"
                  maxLength={120}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-[#0a0e17] px-3 py-2.5 text-sm font-normal text-white placeholder:text-slate-500"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy !== null || pixKey.trim().length < 5}
                onClick={() => post({ action: "pix", key: pixKey, type: pixType }, "pix", "Chave salva.")}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-bold hover:bg-white/10 disabled:opacity-50"
              >
                {busy === "pix" && <Loader2 className="h-4 w-4 animate-spin" />} Salvar chave
              </button>
              <button
                type="button"
                disabled={!canWithdraw || busy !== null}
                onClick={() => post({ action: "payout" }, "payout", "Saque pedido. Avisaremos quando o Pix for enviado.")}
                className="btn-shine inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-extrabold disabled:opacity-50"
              >
                {busy === "payout" && <Loader2 className="h-4 w-4 animate-spin" />} Sacar {brl(data.available)}
              </button>
            </div>
            {!data.pix_key && <p className="text-xs text-slate-400">Salve sua chave Pix para poder sacar.</p>}
            {data.pix_key && data.available < data.min_payout && (
              <p className="text-xs text-slate-400">O saque libera quando o saldo disponível chegar a {brl(data.min_payout)}.</p>
            )}
          </section>

          {/* INDICADOS */}
          <section className="space-y-3 rounded-3xl border border-white/15 bg-[#0f172a] p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-extrabold">
              <Users className="h-5 w-5 text-[#67e8f9]" /> Quem você indicou ({data.referrals.length})
            </h2>
            {data.referrals.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-slate-400">
                Ninguém se cadastrou pelo seu link ainda. Mande para colegas de profissão e grupos de WhatsApp.
              </p>
            ) : (
              <ul className="divide-y divide-white/10">
                {data.referrals.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-bold">{r.name}</p>
                      <p className="text-xs text-slate-400">Cadastro em {date(r.created_at)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-extrabold tabular-nums">{brl(r.earned)}</p>
                      <p className={`text-xs ${r.paying ? "text-emerald-300" : "text-slate-400"}`}>
                        {r.paying ? "Assinante" : "Ainda não assinou"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* SAQUES */}
          <section className="space-y-3 rounded-3xl border border-white/15 bg-[#0f172a] p-5 sm:p-6">
            <h2 className="text-lg font-extrabold">Seus saques</h2>
            {data.payouts.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhum saque pedido ainda.</p>
            ) : (
              <ul className="divide-y divide-white/10">
                {data.payouts.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-extrabold tabular-nums">{brl(p.amount)}</p>
                      <p className="text-xs text-slate-400">
                        {date(p.requested_at)}
                        {p.note ? ` · ${p.note}` : ""}
                      </p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${PAYOUT_BADGE[p.status].cls}`}>
                      {PAYOUT_BADGE[p.status].label}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="text-xs leading-relaxed text-slate-400">
            A comissão nasce quando o pagamento do site indicado é confirmado e libera {HOLD_DAYS} dias depois, prazo para
            estornos. Pagamento estornado cancela a comissão. Indicar a si mesmo, ou um site que já existia, não gera comissão.
          </p>
        </>
      )}
    </OwnerShell>
  );
}
