"use client";

import { Loader2 } from "lucide-react";
import { OwnerShell, useOwnerTenant } from "@/components/OwnerShell";
import { CatalogManager } from "@/components/CatalogManager";

export default function CatalogoPage() {
  const tenant = useOwnerTenant();
  return (
    <OwnerShell title="Produtos e serviços" subtitle="O que você vende, com preço. Entra pronto no orçamento.">
      {!tenant ? (
        <p className="flex items-center gap-2 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </p>
      ) : (
        <CatalogManager />
      )}
    </OwnerShell>
  );
}
