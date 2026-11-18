"use client";

import { use } from "react";
import { Loader2 } from "lucide-react";
import { OwnerShell, PaidOnly, useOwnerTenant } from "@/components/OwnerShell";
import { FinanceManager } from "@/components/FinanceManager";

export default function ClienteDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const tenant = useOwnerTenant();
  const paid = tenant?.is_active && tenant.subscription_status === "active";

  return (
    <OwnerShell title="Cliente" subtitle="Tudo deste cliente: o que já aconteceu e o que fazer agora.">
      {!tenant ? (
        <p className="flex items-center gap-2 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </p>
      ) : paid ? (
        <FinanceManager tenant={tenant} focusId={id} />
      ) : (
        <PaidOnly feature="Meus clientes" />
      )}
    </OwnerShell>
  );
}
