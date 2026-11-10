"use client";

import { Loader2 } from "lucide-react";
import { OwnerShell, PaidOnly, useOwnerTenant } from "@/components/OwnerShell";
import { AgendaManager } from "@/components/AgendaManager";

export default function AgendaPage() {
  const tenant = useOwnerTenant();
  const paid = tenant?.is_active && tenant.subscription_status === "active";

  return (
    <OwnerShell title="Agenda" subtitle="Marque o dia combinado com o cliente e receba o aviso por e-mail no dia.">
      {!tenant ? (
        <p className="flex items-center gap-2 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </p>
      ) : paid ? (
        <AgendaManager tenant={tenant} />
      ) : (
        <PaidOnly feature="A agenda" />
      )}
    </OwnerShell>
  );
}
