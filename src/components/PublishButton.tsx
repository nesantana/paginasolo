"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, CreditCard, Loader2, QrCode, Rocket, X } from "lucide-react";
import {
  ANNUAL_MAX_INSTALLMENTS,
  ANNUAL_PER_MONTH,
  ANNUAL_SAVINGS_PERCENT,
  PLAN_PRICES,
  brl,
  type PlanId,
} from "@/lib/plans";

const BENEFITS = [
  "autonomIA, a assistente, no seu celular",
  "Agenda, orçamentos, contratos e Pix",
  "Site profissional e página de links",
];

/**
 * Abre a escolha de plano e depois o pagamento do dono do site (identificado pelo cookie):
 * mensal por Pix, anual no cartão em até 12x.
 */
export function PublishButton({
  label = "Liberar ferramentas",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<PlanId | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !loading && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, loading]);

  async function go(plan: PlanId) {
    setLoading(plan);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      if (data.ok && data.alreadyActive) {
        window.location.reload();
        return;
      }
      setError(
        res.status === 401
          ? "Abra este site no mesmo navegador em que você o criou, ou use seu link de acesso."
          : data.error || "Erro ao abrir o pagamento."
      );
    } catch {
      setError("Sem conexão. Tente de novo.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        className={
          className ||
          "inline-flex items-center justify-center gap-2 rounded-xl btn-shine px-5 py-2.5 text-sm font-bold text-white hover:brightness-110 disabled:opacity-60"
        }
      >
        <Rocket className="h-4 w-4" />
        <span>{label}</span>
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:p-6"
            onClick={() => !loading && setOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Escolha seu plano"
          >
            <div
              className="animate-pop-in relative w-full max-w-2xl rounded-3xl border border-white/15 bg-[#0f172a] p-5 text-left text-white shadow-2xl sm:p-7"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading !== null}
                aria-label="Fechar"
                className="absolute right-3 top-3 rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
              <h2 className="pr-8 text-xl font-extrabold sm:text-2xl">Escolha como pagar</h2>
              <p className="mt-1 text-sm text-slate-300">Mesmas ferramentas nos dois planos. Sem fidelidade.</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {/* MENSAL */}
                <div className="flex flex-col rounded-2xl border border-white/15 bg-[#0a0e17] p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Mensal</p>
                  <p className="mt-2 text-4xl font-extrabold">
                    {brl(PLAN_PRICES.monthly)}
                    <span className="text-base font-semibold text-slate-400">/mês</span>
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-300">
                    <QrCode className="h-4 w-4 text-[#67e8f9]" /> Pix, todo mês
                  </p>
                  <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-300">
                    {BENEFITS.map((b) => (
                      <li key={b} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> {b}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => go("monthly")}
                    disabled={loading !== null}
                    className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-extrabold hover:bg-white/10 disabled:opacity-60"
                  >
                    {loading === "monthly" ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                    Pagar com Pix
                  </button>
                </div>

                {/* ANUAL */}
                <div className="relative flex flex-col rounded-2xl border-2 border-[#3b82f6] bg-[#3b82f6]/10 p-5 shadow-lg shadow-[#3b82f6]/20">
                  <span className="btn-shine absolute -top-3 left-5 rounded-full px-3 py-1 text-[11px] font-extrabold">
                    Economize {ANNUAL_SAVINGS_PERCENT}%
                  </span>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#67e8f9]">Anual</p>
                  <p className="mt-2 text-4xl font-extrabold">
                    {brl(PLAN_PRICES.annual)}
                    <span className="text-base font-semibold text-slate-300">/ano</span>
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-200">
                    <CreditCard className="h-4 w-4 text-[#67e8f9]" /> Em até {ANNUAL_MAX_INSTALLMENTS}x no cartão
                  </p>
                  <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-200">
                    <li className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      <span>
                        Equivale a <strong>{brl(ANNUAL_PER_MONTH)}/mês</strong>
                      </span>
                    </li>
                    {BENEFITS.map((b) => (
                      <li key={b} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> {b}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => go("annual")}
                    disabled={loading !== null}
                    className="btn-shine mt-5 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold shadow-lg shadow-[#3b82f6]/30 hover:brightness-110 disabled:opacity-60"
                  >
                    {loading === "annual" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                    Pagar no cartão
                  </button>
                </div>
              </div>

              {error && (
                <p role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">
                  {error}
                </p>
              )}
              <p className="mt-4 text-center text-xs text-slate-400">Pagamento seguro. Você volta para o painel assim que confirmar.</p>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
