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
    <div className="min-h-dvh bg-slate-50 pb-16 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" /> Meu painel
          </Link>
          <BrandLogo size={28} className="text-lg" />
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-5 px-4 pt-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-slate-600">{subtitle}</p>}
        </div>
        {children}
      </main>
    </div>
  );
}

/** Tela mostrada a quem ainda não liberou as ferramentas. */
export function PaidOnly({ feature }: { feature: string }) {
  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 text-center sm:p-8">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
        <Lock className="h-5 w-5 text-blue-700" />
      </span>
      <h2 className="mt-4 text-xl font-bold text-blue-950">{feature} faz parte das ferramentas</h2>
      <p className="mx-auto mt-2 max-w-sm text-blue-900">
        Seu site é grátis. Por R$ 37/mês você libera agenda, contratos com Pix, orçamentos e página de links.
      </p>
      <Link
        href="/dashboard"
        className="mt-5 inline-flex rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700"
      >
        Liberar por R$ 37/mês
      </Link>
    </div>
  );
}
