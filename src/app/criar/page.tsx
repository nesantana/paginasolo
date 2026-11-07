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
    <div className="relative isolate min-h-dvh overflow-x-clip bg-[#060d14] text-white">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="grid-bg absolute inset-0" />
        <div className="animate-blob absolute -top-32 -left-24 h-[24rem] w-[24rem] rounded-full bg-[#FF6600]/30 blur-[110px]" />
        <div
          className="animate-blob absolute top-1/2 -right-24 h-[22rem] w-[22rem] rounded-full bg-[#ff3d71]/20 blur-[110px]"
          style={{ animationDelay: "-7s" }}
        />
      </div>

      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#060d14]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <Link href="/" className="text-xl font-extrabold tracking-tight">
            Página<span className="text-[#FF9C40]">Solo</span>
          </Link>
          <Link
            href="/entrar"
            className="glass rounded-full px-4 py-1.5 text-xs font-bold text-slate-200 transition hover:bg-white/15"
          >
            Já tenho site · Entrar
          </Link>
        </div>
      </header>
      <ChatBuilder />
    </div>
  );
}
