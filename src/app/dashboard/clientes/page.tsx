"use client";

import { Loader2 } from "lucide-react";
import { OwnerShell, PaidOnly, useOwnerTenant } from "@/components/OwnerShell";
import { FinanceManager } from "@/components/FinanceManager";

export default function ClientesPage() {
  const tenant = useOwnerTenant();
  const paid = Boolean(tenant);

  return (
    <OwnerShell
      title="Meus clientes"
      subtitle="Tudo num lugar só: orçamento, contrato e Pix de cada cliente, do mais novo para o mais antigo."
    >
      {!tenant ? (
        <p className="flex items-center gap-2 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </p>
      ) : paid ? (
        <FinanceManager tenant={tenant} />
      ) : (
        <PaidOnly feature="Meus clientes" />
      )}
    </OwnerShell>
  );
}
