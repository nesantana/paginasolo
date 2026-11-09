"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import type { TenantRow } from "@/types/database.types";
import { BrandLogo } from "@/components/BrandLogo";

/** Carrega o site do dono logado (cookie). Sem acesso → manda para o login. */
export function useOwnerTenant() {
  const [tenant, setTenant] = useState<TenantRow | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/tenants", { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = "/entrar";
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (alive && data.tenant) setTenant(data.tenant as TenantRow);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return tenant;
}

export function OwnerShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[#0a0e17] pb-16 text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0f172a]">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Meu painel
          </Link>
          <BrandLogo size={30} className="text-lg" />
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-5 px-4 pt-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-slate-400">{subtitle}</p>}
        </div>
        {children}
      </main>
    </div>
  );
}

/** Tela mostrada a quem ainda não tem o plano ativo. */
export function PaidOnly({ feature }: { feature: string }) {
  return (
    <div className="rounded-3xl border border-[#3b82f6]/40 bg-[#0f172a] p-6 text-center sm:p-8">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3b82f6]/20">
        <Lock className="h-6 w-6 text-[#67e8f9]" />
      </span>
      <h2 className="mt-4 text-xl font-extrabold">{feature} é do plano ativo</h2>
      <p className="mx-auto mt-2 max-w-sm text-slate-300">
        Publique seu site por R$ 37/mês e libere orçamentos, follow-up e página de links.
      </p>
      <Link
        href="/dashboard"
        className="btn-shine mt-5 inline-flex rounded-2xl px-6 py-3 font-extrabold"
      >
        Publicar meu site
      </Link>
    </div>
  );
}
