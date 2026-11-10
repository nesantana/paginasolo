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
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-5 text-slate-900">
      <div className="w-full max-w-md">
        <Link href="/" aria-label="Meu Site Novo" className="flex justify-center">
          <BrandLogo size={44} className="text-2xl" />
        </Link>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-7 sm:p-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-700">
            <Mail className="h-6 w-6" />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold">Entrar no meu painel</h1>
          <p className="mt-2 text-slate-600">
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
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
              {busy ? "Enviando..." : "Enviar link de acesso"}
            </button>
          </form>

          {msg && (
            <p
              role="status"
              className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${
                msg.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"
              }`}
            >
              {msg.text}
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Ainda não tem site?{" "}
          <Link href="/criar" className="font-bold text-blue-700 underline underline-offset-4">
            Criar agora
          </Link>
        </p>
      </div>
    </div>
  );
}
