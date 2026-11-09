"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

/** O Supabase devolve o usuário aqui com o token no #hash; trocamos pela sessão do admin. */
export default function ConfirmarAdminPage() {
  const [error, setError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = hash.get("access_token");
    window.history.replaceState(null, "", window.location.pathname);

    if (!token) {
      setError("Link inválido ou expirado. Peça um novo.");
      return;
    }
    fetch("/api/admin/confirmar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: token }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) window.location.replace("/admin");
        else setError(data.error || "Não foi possível entrar.");
      })
      .catch(() => setError("Sem conexão. Tente de novo."));
  }, []);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#060d14] px-5 text-center text-white">
      {error ? (
        <div className="max-w-sm space-y-4">
          <p className="text-lg font-bold">{error}</p>
          <Link href="/admin" className="inline-block rounded-2xl bg-[#FF6600] px-6 py-3 font-extrabold">
            Voltar
          </Link>
        </div>
      ) : (
        <p className="flex items-center gap-3 text-lg font-bold">
          <Loader2 className="h-5 w-5 animate-spin text-[#FF9C40]" /> Entrando no admin...
        </p>
      )}
    </div>
  );
}
