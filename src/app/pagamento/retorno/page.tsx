"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

function Retorno() {
  const slug = useSearchParams().get("s") || "";
  const [status, setStatus] = useState("checking");
  const [tries, setTries] = useState(0);

  // O Mercado Pago avisa nosso servidor por webhook; aqui só esperamos a confirmação (até ~1 min).
  useEffect(() => {
    if (!slug || status === "active" || tries > 20) return;
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/status?s=${encodeURIComponent(slug)}`, { cache: "no-store" });
        const d = await r.json();
        setStatus(d.status);
      } catch {
        // tenta de novo
      }
      setTries((n) => n + 1);
    }, tries === 0 ? 500 : 3000);
    return () => clearTimeout(t);
  }, [slug, status, tries]);

  const active = status === "active";

  return (
    <div className="min-h-dvh bg-[#0a0e17] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-3xl border border-white/10 bg-[#0f172a] p-8 text-center space-y-4">
        {active ? (
          <>
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h1 className="text-2xl font-extrabold">Ferramentas liberadas! 🎉</h1>
            <p className="text-sm text-slate-300">
              Orçamentos, contratos, cobrança por Pix, agenda e página de links já estão no seu painel.
            </p>
            <Link
              href={`/${slug}`}
              className="inline-block rounded-full bg-emerald-500 px-6 py-3 text-sm font-extrabold text-zinc-950"
            >
              Ver meu site
            </Link>
            <div>
              <Link href="/dashboard" className="text-xs font-bold text-slate-300 underline">
                Ir para o painel
              </Link>
            </div>
          </>
        ) : (
          <>
            <Loader2 className="w-10 h-10 text-[#67e8f9] mx-auto animate-spin" />
            <h1 className="text-xl font-extrabold">Confirmando seu pagamento…</h1>
            <p className="text-sm text-slate-300">
              Isso leva alguns segundos. Se o banco demorar para confirmar, as ferramentas
              são liberadas sozinhas assim que o pagamento cair. Seu site continua no ar.
            </p>
            <Link href="/dashboard" className="text-xs font-bold text-slate-300 underline">
              Ir para o painel
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function RetornoPage() {
  return (
    <Suspense>
      <Retorno />
    </Suspense>
  );
}
