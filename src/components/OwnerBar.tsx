"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { PublishButton } from "@/components/PublishButton";

/**
 * Faixa que SÓ o dono do site vê, em cima do próprio site (visitantes não veem nada).
 * Roda no navegador para a página pública continuar estática e rápida.
 */
export function OwnerBar({ slug, paid }: { slug: string; paid: boolean }) {
  const [mine, setMine] = useState(false);

  useEffect(() => {
    // Só pergunta ao servidor se este aparelho tem sessão (evita requisição à toa para visitantes).
    if (!/(?:^|; )ps_in=[aob](?:;|$)/.test(document.cookie)) return;
    let alive = true;
    fetch("/api/tenants", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.tenant?.slug === slug) setMine(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [slug]);

  if (!mine) return null;
  return (
    <div className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-md">
      <span>Este é o seu site.</span>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3.5 py-1 text-xs font-bold hover:bg-slate-100"
      >
        <LayoutDashboard className="h-3.5 w-3.5" /> Gerenciar meu site
      </Link>
      {!paid && (
        <PublishButton
          label="Liberar ferramentas por R$ 37/mês"
          className="rounded-full bg-slate-900 px-4 py-1 text-xs font-bold text-white disabled:opacity-60"
        />
      )}
    </div>
  );
}
