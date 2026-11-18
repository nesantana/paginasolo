"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft } from "lucide-react";

/**
 * Tela por cima de tudo (modal).
 * No celular ocupa a tela inteira, com o botão "Voltar" fixo no topo.
 * No computador vira uma janela no meio. A página de trás não rola.
 */
export function Sheet({ title, onClose, children }: { title?: string; onClose: () => void; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-stretch justify-center bg-black/70 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title || "Janela"}>
      <div className="absolute inset-0 hidden sm:block" onClick={onClose} aria-hidden />
      <div className="relative flex w-full max-w-xl flex-col bg-[#0a0e17] text-white sm:max-h-full sm:rounded-3xl sm:border sm:border-white/15 sm:shadow-2xl">
        <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:pt-2">
          <button type="button" onClick={onClose} className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-base font-bold text-[#67e8f9] hover:bg-white/10">
            <ChevronLeft className="h-5 w-5" /> Voltar
          </button>
          {title && <p className="min-w-0 flex-1 truncate pr-3 text-right text-base font-extrabold">{title}</p>}
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>,
    document.body
  );
}
