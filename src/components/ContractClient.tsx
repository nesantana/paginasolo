"use client";

import { useEffect, useState } from "react";
import { Check, CheckCircle2, Clock, Copy, Loader2, MessageCircle, Printer } from "lucide-react";
import { formatBRL, formatDateBR, whatsappLink } from "@/lib/quoteUi";
import { dueText } from "@/lib/contractUi";
import type { PaymentStatus, DueKind } from "@/types/finance";

export type PublicPayment = {
  id: string;
  label: string;
  amount_cents: number;
  due_kind: DueKind;
  due_date: string | null;
  status: PaymentStatus;
  paid_at: string | null;
  pixCode: string | null;
  qrSvg: string | null;
};

type Props = {
  code: string;
  customer: string;
  business: string;
  whatsapp: string;
  color: string;
  closed: boolean;
  signedName: string | null;
  signedAt: string | null;
  payments: PublicPayment[];
  hasPix: boolean;
};

export function ContractClient(p: Props) {
  const [signedName, setSignedName] = useState(p.signedName);
  const [signedAt, setSignedAt] = useState(p.signedAt);
  const [name, setName] = useState(p.customer);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pays, setPays] = useState(p.payments);
  const [copied, setCopied] = useState<string | null>(null);
  const [informing, setInforming] = useState<string | null>(null);

  // "Visto" só quando uma pessoa abre (a prévia do WhatsApp não executa JS).
  useEffect(() => {
    fetch(`/api/c/${p.code}/visto`, { method: "POST", keepalive: true }).catch(() => {});
  }, [p.code]);

  async function sign() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/c/${p.code}/assinar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "Não foi possível registrar agora.");
        return;
      }
      setSignedName(name.trim());
      setSignedAt(new Date().toISOString());
      window.open(
        whatsappLink(p.whatsapp, `Olá! Sou ${name.trim()} e aceitei o contrato. Podemos combinar os próximos passos?`),
        "_blank",
        "noopener"
      );
    } catch {
      setError("Sem conexão. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      setError("Não consegui copiar. Selecione o código e copie manualmente.");
    }
  }

  async function informPaid(id: string) {
    setInforming(id);
    try {
      const res = await fetch(`/api/c/${p.code}/paguei`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id: id }),
      });
      if (res.ok) setPays((cur) => cur.map((x) => (x.id === id ? { ...x, status: "informed" } : x)));
    } finally {
      setInforming(null);
    }
  }

  const accent = { backgroundColor: p.color };

  return (
    <>
      {/* ACEITE */}
      <section className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-900/10 print:shadow-none">
        {signedName ? (
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
            <div>
              <p className="font-extrabold text-slate-900">Contrato aceito</p>
              <p className="text-sm text-slate-600">
                Por <strong>{signedName}</strong>
                {signedAt && ` em ${formatDateBR(signedAt.slice(0, 10))} às ${new Date(signedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
              </p>
            </div>
          </div>
        ) : p.closed ? (
          <p className="font-bold text-slate-600">Este contrato foi encerrado.</p>
        ) : (
          <div className="space-y-3 print:hidden">
            <p className="font-extrabold text-slate-900">Aceitar o contrato</p>
            <label className="block text-sm text-slate-600">
              Digite seu nome completo
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-3 text-base text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </label>
            <label className="flex items-start gap-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="mt-1 h-4 w-4"
              />
              Li o contrato e concordo com os termos e com a forma de pagamento.
            </label>
            {error && <p className="text-sm font-bold text-red-600">{error}</p>}
            <button
              onClick={sign}
              disabled={busy || !agree || name.trim().split(" ").filter(Boolean).length < 2}
              style={accent}
              className="flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-extrabold text-white disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
              Aceitar contrato
            </button>
            <p className="text-xs text-slate-500">
              Aceite eletrônico simples: registramos seu nome, data e horário.
            </p>
          </div>
        )}
      </section>

      {/* PAGAMENTOS */}
      <section className="space-y-3 rounded-3xl bg-white p-6 shadow-xl shadow-slate-900/10 print:break-inside-avoid print:shadow-none">
        <p className="font-extrabold text-slate-900">Pagamentos</p>
        {pays.map((x) => {
          const paid = x.status === "paid";
          const informed = x.status === "informed";
          const cancelled = x.status === "cancelled";
          return (
            <div key={x.id} className={`rounded-2xl border p-4 ${paid ? "border-emerald-200 bg-emerald-50" : "border-slate-200"} ${cancelled ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">{x.label}</p>
                  <p className="text-sm text-slate-500">{cancelled ? "Cancelado" : dueText(x) || "A combinar"}</p>
                </div>
                <p className="text-lg font-extrabold text-slate-900">{formatBRL(x.amount_cents)}</p>
              </div>

              {paid && (
                <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> Pago{x.paid_at ? ` em ${formatDateBR(x.paid_at.slice(0, 10))}` : ""}
                </p>
              )}
              {informed && (
                <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-sky-700">
                  <Clock className="h-4 w-4" /> Aviso enviado. Aguardando confirmação.
                </p>
              )}

              {!paid && !cancelled && x.pixCode && (
                <div className="mt-3 space-y-3 border-t border-slate-100 pt-3 print:hidden">
                  {x.qrSvg && (
                    <div
                      className="mx-auto h-44 w-44 rounded-xl border border-slate-200 bg-white p-2 [&>svg]:h-full [&>svg]:w-full"
                      // SVG gerado no servidor pela biblioteca de QR a partir do nosso Pix; não contém entrada do usuário.
                      dangerouslySetInnerHTML={{ __html: x.qrSvg }}
                    />
                  )}
                  <p className="break-all rounded-xl bg-slate-50 p-3 text-xs text-slate-600">{x.pixCode}</p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      onClick={() => copy(x.id, x.pixCode!)}
                      style={accent}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold text-white"
                    >
                      {copied === x.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied === x.id ? "Copiado!" : "Copiar Pix copia e cola"}
                    </button>
                    {!informed && (
                      <button
                        onClick={() => informPaid(x.id)}
                        disabled={informing === x.id}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-800 disabled:opacity-60"
                      >
                        {informing === x.id && <Loader2 className="h-4 w-4 animate-spin" />} Já paguei
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!p.hasPix && (
          <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600 print:hidden">
            Os dados para pagamento serão enviados por {p.business} pelo WhatsApp.
          </p>
        )}
      </section>

      <div className="flex flex-col gap-2 sm:flex-row print:hidden">
        <button
          onClick={() => window.print()}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-bold text-slate-800"
        >
          <Printer className="h-4 w-4" /> Imprimir / salvar em PDF
        </button>
        <a
          href={whatsappLink(p.whatsapp, "Olá! Estou vendo o contrato e tenho uma dúvida.")}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-bold text-slate-800"
        >
          <MessageCircle className="h-4 w-4 text-emerald-600" /> Falar com {p.business}
        </a>
      </div>
    </>
  );
}
