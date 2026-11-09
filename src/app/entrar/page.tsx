"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export default function EntrarPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/entrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      setMsg({
        ok: Boolean(res.ok && data.ok),
        text: data.message || data.error || "Não foi possível enviar agora.",
      });
    } catch {
      setMsg({ ok: false, text: "Sem conexão. Tente de novo." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative isolate flex min-h-dvh items-center justify-center overflow-x-clip bg-[#0a0e17] px-5 text-white">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="grid-bg absolute inset-0" />
        <div className="animate-blob absolute -top-32 -left-24 h-[24rem] w-[24rem] rounded-full bg-[#3b82f6]/30 blur-[110px]" />
      </div>

      <div className="animate-fade-up w-full max-w-md">
        <Link href="/" aria-label="Meu Site Novo" className="flex justify-center">
          <BrandLogo size={44} className="text-2xl" />
        </Link>

        <div className="glass mt-8 rounded-3xl p-7 sm:p-8">
          <span className="btn-shine flex h-12 w-12 items-center justify-center rounded-2xl">
            <Mail className="h-6 w-6" />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold">Entrar no meu painel</h1>
          <p className="mt-2 text-slate-300">
            Digite o e-mail que você usou para criar o site. Enviamos um link de
            acesso.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-3">
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              className="w-full rounded-2xl border border-white/15 bg-white/5 px-5 py-3.5 text-base text-white placeholder:text-slate-500 focus:border-[#67e8f9] focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy}
              className="btn-shine flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 font-extrabold shadow-lg shadow-[#3b82f6]/30 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
              {busy ? "Enviando..." : "Enviar link de acesso"}
            </button>
          </form>

          {msg && (
            <p
              role="status"
              className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${
                msg.ok ? "bg-emerald-500/15 text-emerald-200" : "bg-red-500/15 text-red-200"
              }`}
            >
              {msg.text}
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-slate-400">
          Ainda não tem site?{" "}
          <Link href="/criar" className="font-bold text-[#67e8f9] underline underline-offset-4">
            Criar agora
          </Link>
        </p>
      </div>
    </div>
  );
}
