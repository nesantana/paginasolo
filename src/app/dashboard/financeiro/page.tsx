"use client";

import { Loader2 } from "lucide-react";
import { OwnerShell, PaidOnly, useOwnerTenant } from "@/components/OwnerShell";
import { FinanceManager } from "@/components/FinanceManager";

export default function FinanceiroPage() {
  const tenant = useOwnerTenant();
  const paid = tenant?.is_active && tenant.subscription_status === "active";

  return (
    <OwnerShell
      title="Contratos e pagamentos"
      subtitle="Gere o contrato, cobre por Pix e veja o que já foi pago e o que ainda falta."
    >
      {!tenant ? (
        <p className="flex items-center gap-2 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </p>
      ) : paid ? (
        <FinanceManager tenant={tenant} />
      ) : (
        <PaidOnly feature="Contratos e pagamentos" />
      )}
    </OwnerShell>
  );
}
