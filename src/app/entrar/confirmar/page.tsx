"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

/** O Supabase devolve o usuário aqui com o token no #hash; trocamos por acesso ao painel. */
export default function ConfirmarEntradaPage() {
  const [error, setError] = useState("");
  // O React (modo dev) roda o efeito 2x; o token só existe na 1ª, pois o hash é apagado.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = hash.get("access_token");
    const hashError = hash.get("error_description");
    // tira o token da barra de endereço
    window.history.replaceState(null, "", window.location.pathname);

    if (!token) {
      setError(
        hashError
          ? "Esse link expirou ou já foi usado. Peça um novo."
          : "Link inválido. Peça um novo."
      );
      return;
    }

    fetch("/api/entrar/confirmar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: token }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) window.location.replace(data.redirect || "/dashboard");
        else setError(data.error || "Não foi possível entrar. Peça um novo link.");
      })
      .catch(() => setError("Sem conexão. Tente de novo."));
  }, []);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#0a0e17] px-5 text-center text-white">
      {error ? (
        <div className="max-w-sm space-y-4">
          <p className="text-lg font-bold">{error}</p>
          <Link
            href="/entrar"
            className="btn-shine inline-block rounded-2xl px-6 py-3 font-extrabold"
          >
            Pedir novo link
          </Link>
        </div>
      ) : (
        <p className="flex items-center gap-3 text-lg font-bold">
          <Loader2 className="h-5 w-5 animate-spin text-[#67e8f9]" />
          Abrindo o seu painel...
        </p>
      )}
    </div>
  );
}
