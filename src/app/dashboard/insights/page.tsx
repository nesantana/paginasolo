"use client";

import { Loader2 } from "lucide-react";
import { OwnerShell, useOwnerTenant } from "@/components/OwnerShell";
import { InsightsView } from "@/components/InsightsView";

export default function InsightsPage() {
  const tenant = useOwnerTenant();
  return (
    <OwnerShell title="Insights" subtitle="Como está o seu negócio e o que fazer hoje para ganhar mais.">
      {!tenant ? (
        <p className="flex items-center gap-2 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </p>
      ) : (
        <InsightsView tenant={tenant} />
      )}
    </OwnerShell>
  );
}
