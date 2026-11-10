import type { Metadata } from "next";
import Link from "next/link";
import { ChatBuilder } from "@/components/ChatBuilder";
import { AuthNav } from "@/components/AuthNav";
import { BrandLogo } from "@/components/BrandLogo";

export const metadata: Metadata = {
  title: "Crie seu site em minutos — Meu Site Novo",
  description:
    "Responda algumas perguntas e veja seu site pronto. Seu site no ar de graça. As ferramentas custam menos de uma pizza por mês.",
  robots: { index: false },
};

export default function CriarPage() {
  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <Link href="/" aria-label="Meu Site Novo">
            <BrandLogo size={34} className="text-xl" />
          </Link>
          <AuthNav
            className="bg-white border border-slate-200 rounded-full px-4 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
            guestLabel="Já tenho site · Entrar"
            manageLabel="Gerenciar meu site"
          />
        </div>
      </header>
      <ChatBuilder />
    </div>
  );
}
