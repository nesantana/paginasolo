"use client";

import { Printer } from "lucide-react";

export function PrintReceipt() {
  return (
    <button
      onClick={() => window.print()}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-bold text-slate-800 print:hidden"
    >
      <Printer className="h-4 w-4" /> Imprimir / salvar em PDF
    </button>
  );
}
