import type { Metadata } from "next";
import Link from "next/link";
import { ChatBuilder } from "@/components/ChatBuilder";

export const metadata: Metadata = {
  title: "Crie seu site em minutos — PáginaSolo",
  description:
    "Responda algumas perguntas e veja seu site pronto. Apareça no Google por menos de uma pizza por mês.",
  robots: { index: false },
};

export default function CriarPage() {
  return (
    <div className="min-h-dvh bg-[#07111a] text-white">
      <header className="border-b border-white/10 bg-[#07111a]/95 sticky top-0 z-30">
        <div className="mx-auto max-w-2xl px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-baseline">
            <span className="text-xl font-extrabold">
              Página<span className="text-[#FF9C40]">Solo</span>
            </span>
            <span className="h-2 w-2 rounded-full bg-[#FF6600] ml-1" />
          </Link>
          <span className="text-xs text-slate-400">Leva uns 3 minutos</span>
        </div>
      </header>
      <ChatBuilder />
    </div>
  );
}
