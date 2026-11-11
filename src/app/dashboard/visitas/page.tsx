"use client";

import { Loader2 } from "lucide-react";
import { OwnerShell, PaidOnly, useOwnerTenant } from "@/components/OwnerShell";
import { VisitsManager } from "@/components/VisitsManager";

export default function VisitasPage() {
  const tenant = useOwnerTenant();
  const paid = tenant?.is_active && tenant.subscription_status === "active";

  return (
    <OwnerShell
      title="Visitas técnicas"
      subtitle="Anote o que precisa ser feito na casa do cliente e transforme em orçamento com um toque."
    >
      {!tenant ? (
        <p className="flex items-center gap-2 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </p>
      ) : paid ? (
        <VisitsManager tenant={tenant} />
      ) : (
        <PaidOnly feature="As visitas técnicas" />
      )}
    </OwnerShell>
  );
}
