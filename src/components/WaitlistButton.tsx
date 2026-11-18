"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Sheet } from "@/components/Sheet";

const field =
  "w-full rounded-xl border border-white/15 bg-[#0f172a] px-3.5 py-3 text-base text-white placeholder:text-slate-500 focus:border-[#67e8f9] focus:outline-none";
const lbl = "block min-w-0 space-y-1 text-sm font-semibold text-slate-200";

/** Botão que abre a tela da lista de espera. Recebe o visual de quem usa. */
export function WaitlistButton({ className, children }: { className: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [profession, setProfession] = useState("");
  const [trap, setTrap] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function save() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/lista-espera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, profession, site: trap }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) return setError(d.error || "Não foi possível salvar.");
      setDone(true);
    } catch {
      setError("Sem conexão. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {open && (
        <Sheet onClose={() => setOpen(false)}>
          {done ? (
            <div className="space-y-4 py-6 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500/20">
                <Check className="h-7 w-7 text-emerald-300" />
              </span>
              <h2 className="text-2xl font-extrabold">Você está na lista!</h2>
              <p className="text-slate-300">A autonomIA abre no dia 25 de novembro. Vamos te avisar pelo WhatsApp assim que liberar.</p>
              <button type="button" onClick={() => setOpen(false)} className="min-h-12 w-full rounded-xl border border-white/15 px-5 font-bold hover:bg-white/10">
                Fechar
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-extrabold">Lista de espera</h2>
                <p className="mt-1 text-sm text-slate-300">
                  A autonomIA abre no dia 25 de novembro. Deixe seu WhatsApp e avisamos você quando liberar.
                </p>
              </div>
              <label className={lbl}>
                Seu nome
                <input value={name} onChange={(e) => setName(e.target.value)} className={field} maxLength={80} autoComplete="name" />
              </label>
              <label className={lbl}>
                Seu WhatsApp
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={field} inputMode="tel" autoComplete="tel" placeholder="(67) 99999-0000" />
              </label>
              <label className={lbl}>
                O que você faz? (opcional)
                <input value={profession} onChange={(e) => setProfession(e.target.value)} className={field} maxLength={60} placeholder="Ex.: eletricista, diarista, pintor" />
              </label>
              <input value={trap} onChange={(e) => setTrap(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="hidden" name="site" />
              {error && <p className="text-sm font-semibold text-red-300">{error}</p>}
              <button
                type="button"
                onClick={save}
                disabled={busy || !name.trim() || !phone.trim()}
                className="btn-shine inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-base font-extrabold disabled:opacity-60"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Entrar na lista de espera
              </button>
            </div>
          )}
        </Sheet>
      )}
    </>
  );
}
