import type { Metadata } from "next";
import Link from "next/link";
import { ChatBuilder } from "@/components/ChatBuilder";
import { AuthNav } from "@/components/AuthNav";
import { BrandLogo } from "@/components/BrandLogo";

export const metadata: Metadata = {
  title: "Comece grátis — autonomIA",
  description:
    "Responda algumas perguntas e veja seu site pronto. Seu site no ar de graça. As ferramentas custam menos de uma pizza por mês.",
  robots: { index: false },
};

export default function CriarPage() {
  return (
    <div className="relative isolate min-h-dvh overflow-x-clip bg-[#0a0e17] text-white">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="grid-bg absolute inset-0" />
        <div className="animate-blob absolute -top-32 -left-24 h-[24rem] w-[24rem] rounded-full bg-[#3b82f6]/30 blur-[110px]" />
        <div
          className="animate-blob absolute top-1/2 -right-24 h-[22rem] w-[22rem] rounded-full bg-[#8b5cf6]/20 blur-[110px]"
          style={{ animationDelay: "-7s" }}
        />
      </div>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0e17]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <Link href="/" aria-label="autonomIA">
            <BrandLogo size={34} className="text-xl" />
          </Link>
          <AuthNav
            className="bg-[#0f172a] border border-white/10 rounded-full px-4 py-1.5 text-xs font-bold text-slate-200 transition hover:bg-white/10"
            guestLabel="Já tenho site · Entrar"
            manageLabel="Gerenciar meu site"
          />
        </div>
      </header>
      <ChatBuilder />
    </div>
  );
}
