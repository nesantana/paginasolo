"use client";

import { useState } from "react";
import { Loader2, Rocket } from "lucide-react";

/** Abre o checkout de assinatura do Mercado Pago para o dono do site (identificado pelo cookie). */
export function PublishButton({
  label = "Liberar ferramentas",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function go() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
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
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-stretch gap-1">
      <button
        type="button"
        onClick={go}
        disabled={loading}
        className={
          className ||
          "inline-flex items-center justify-center gap-2 rounded-xl btn-shine px-5 py-2.5 text-sm font-bold text-white hover:brightness-110 disabled:opacity-60"
        }
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
        <span>{label}</span>
      </button>
      {error && <span className="text-[11px] text-red-300 max-w-xs">{error}</span>}
    </span>
  );
}
