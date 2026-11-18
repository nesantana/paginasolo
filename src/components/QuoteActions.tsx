"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, MessageCircle } from "lucide-react";
import { acceptMessage, whatsappLink } from "@/lib/quoteUi";

type Props = {
  code: string;
  whatsapp: string;
  customer: string;
  business: string;
  totalCents: number;
  accepted: boolean;
  closed: boolean;
  color: string;
};

export function QuoteActions({
  code,
  whatsapp,
  customer,
  business,
  totalCents,
  accepted: initiallyAccepted,
  closed,
  color,
}: Props) {
  const [accepted, setAccepted] = useState(initiallyAccepted);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Marca "visto" só quando uma pessoa abre (a prévia do WhatsApp não executa JS).
  useEffect(() => {
    fetch(`/api/o/${code}/visto`, { method: "POST", keepalive: true }).catch(() => {});
  }, [code]);

  const acceptText = acceptMessage({ customer, business, total_cents: totalCents });
  const talk = whatsappLink(
    whatsapp,
    "Olá! Estou vendo o orçamento que você me enviou e tenho uma dúvida."
  );

  async function accept() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/o/${code}/aceitar`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "Não foi possível registrar agora.");
        return;
      }
      setAccepted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Sem conexão. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  if (accepted) {
    return (
      <div className="space-y-4">
        <div className="rounded-3xl bg-emerald-50 p-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          <p className="mt-2 text-xl font-extrabold text-emerald-800">Orçamento aceito!</p>
          <p className="mt-1 text-emerald-900">
            {business} já recebeu o aviso e vai entrar em contato com você. É só aguardar.
          </p>
        </div>
        <ol className="space-y-2 rounded-3xl bg-white p-5 text-sm text-slate-700 shadow-sm">
          <li className="flex gap-3"><span className="font-extrabold text-emerald-600">✓</span> Você aceitou o orçamento</li>
          <li className="flex gap-3"><span className="font-extrabold text-slate-400">2</span> {business} prepara o contrato e te envia</li>
          <li className="flex gap-3"><span className="font-extrabold text-slate-400">3</span> Você confere, assina e combina o pagamento</li>
        </ol>
        <p className="text-center text-xs text-slate-500">Está com pressa? Se preferir, fale agora:</p>
        <a
          href={whatsappLink(whatsapp, acceptText)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-bold text-slate-800"
        >
          <MessageCircle className="h-4 w-4 text-emerald-600" /> Chamar {business} no WhatsApp
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!closed && (
        <button
          type="button"
          onClick={accept}
          disabled={busy}
          style={{ backgroundColor: color }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-lg font-extrabold text-white shadow-lg transition hover:brightness-110 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
          Aceitar orçamento
        </button>
      )}
      <a
        href={talk}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-6 py-4 text-base font-extrabold text-zinc-950 transition hover:brightness-105"
      >
        <MessageCircle className="h-5 w-5" /> Tirar uma dúvida no WhatsApp
      </a>
      {error && (
        <p role="alert" className="text-center text-sm font-semibold text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
