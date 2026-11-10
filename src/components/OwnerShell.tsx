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
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Meu painel
          </Link>
          <BrandLogo size={28} className="text-lg" />
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-5 px-4 pt-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-slate-300">{subtitle}</p>}
        </div>
        {children}
      </main>
    </div>
  );
}

/** Tela mostrada a quem ainda não liberou as ferramentas. */
export function PaidOnly({ feature }: { feature: string }) {
  return (
    <div className="rounded-2xl border border-[#3b82f6]/40 bg-[#3b82f6]/15 p-6 text-center sm:p-8">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#3b82f6]/20">
        <Lock className="h-5 w-5 text-[#67e8f9]" />
      </span>
      <h2 className="mt-4 text-xl font-bold text-white">{feature} faz parte das ferramentas</h2>
      <p className="mx-auto mt-2 max-w-sm text-slate-200">
        Seu site é grátis. Por R$ 37/mês você libera agenda, contratos com Pix, orçamentos e página de links.
      </p>
      <Link
        href="/dashboard"
        className="mt-5 inline-flex rounded-xl btn-shine px-6 py-3 font-bold text-white hover:brightness-110"
      >
        Liberar por R$ 37/mês
      </Link>
    </div>
  );
}
