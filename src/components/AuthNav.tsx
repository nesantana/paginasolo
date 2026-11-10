"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, LogOut } from "lucide-react";

type Who = "guest" | "owner" | "admin";

function readWho(): Who {
  try {
    const m = document.cookie.match(/(?:^|; )ps_in=([^;]+)/);
    if (m?.[1] === "a") return "admin";
    if (m?.[1] === "o") return "owner";
  } catch {
    // sem acesso a cookies: trata como visitante
  }
  return "guest";
}

/** "Entrar" para quem não tem sessão; "Gerenciar meu site" para quem já entrou. */
export function AuthNav({
  className,
  guestLabel = "Entrar",
  manageLabel = "Gerenciar meu site",
  showLogout = true,
}: {
  className: string;
  guestLabel?: string;
  manageLabel?: string;
  showLogout?: boolean;
}) {
  const [who, setWho] = useState<Who>("guest");
  useEffect(() => setWho(readWho()), []);

  if (who === "guest") {
    return (
      <Link href="/entrar" className={className}>
        {guestLabel}
      </Link>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <Link href={who === "admin" ? "/admin" : "/dashboard"} className={className}>
        <LayoutDashboard className="mr-1.5 inline h-4 w-4" />
        {who === "admin" ? "Painel admin" : manageLabel}
      </Link>
      {showLogout && (
        <button
          type="button"
          aria-label="Sair"
          title="Sair"
          onClick={async () => {
            await fetch("/api/sair", { method: "POST" }).catch(() => {});
            window.location.href = "/";
          }}
          className="rounded-full p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
        </button>
      )}
    </span>
  );
}
