"use client";

import { Loader2 } from "lucide-react";
import { OwnerShell, PaidOnly, useOwnerTenant } from "@/components/OwnerShell";
import { QuotesManager } from "@/components/QuotesManager";

export default function OrcamentosPage() {
  const tenant = useOwnerTenant();
  const paid = tenant?.is_active && tenant.subscription_status === "active";

  return (
    <OwnerShell
      title="Orçamentos e follow-up"
      subtitle="Envie o orçamento por link e nunca mais esqueça de chamar o cliente de volta."
    >
      {!tenant ? (
        <p className="flex items-center gap-2 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </p>
      ) : paid ? (
        <QuotesManager tenant={tenant} />
      ) : (
        <PaidOnly feature="Orçamentos e follow-up" />
      )}
    </OwnerShell>
  );
}
