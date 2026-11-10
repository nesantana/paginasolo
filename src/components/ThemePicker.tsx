"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { THEME_IDS, THEMES, getTheme, readableOn, type Theme, type ThemeId } from "@/lib/themes";

/** Miniatura fiel ao formato do tema: topo, título, botão e o estilo dos serviços. */
function Mini({ t, color }: { t: Theme; color: string }) {
  const { bg, surface, text } = t.swatch;
  const line = (w: string, o = 0.35) => (
    <div className="h-1 rounded-full" style={{ width: w, backgroundColor: text, opacity: o }} />
  );
  return (
    <div className="h-36 w-full overflow-hidden rounded-xl border border-white/10 p-3" style={{ backgroundColor: bg }}>
      <div className="flex items-center justify-between">
        <div className="h-3 w-3 rounded" style={{ backgroundColor: color }} />
        <div className="h-2 w-8 rounded-full bg-[#25D366]" />
      </div>
      {t.hero === "center" ? (
        <div className="mt-3 flex flex-col items-center gap-1.5">
          <div
            className={`text-[11px] font-extrabold leading-none ${t.heading}`}
            style={{ color: text }}
          >
            Seu título aqui
          </div>
          {line("70%")}
          <div className="mt-1 h-3.5 w-16 rounded-md bg-[#25D366]" />
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-[1.3fr_1fr] gap-2">
          <div className="space-y-1.5">
            <div
              className={`text-[11px] font-extrabold leading-tight ${t.heading}`}
              style={{ color: text }}
            >
              Seu título aqui
            </div>
            {line("90%")}
            {line("60%")}
          </div>
          <div className="space-y-1 rounded-md p-1.5" style={{ backgroundColor: surface }}>
            <div className="h-3 rounded bg-[#25D366]" />
            {line("80%", 0.25)}
          </div>
        </div>
      )}
      <div className="mt-3 space-y-1.5">
        {t.services === "cards" && (
          <div className="grid grid-cols-2 gap-1.5">
            {[0, 1].map((i) => (
              <div key={i} className="h-6 rounded-md" style={{ backgroundColor: surface }} />
            ))}
          </div>
        )}
        {t.services === "menu" &&
          [0, 1].map((i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="h-1 w-10 rounded-full" style={{ backgroundColor: text, opacity: 0.5 }} />
              <div className="h-px flex-1 border-t border-dotted" style={{ borderColor: text, opacity: 0.4 }} />
              <div className="h-1 w-4 rounded-full" style={{ backgroundColor: color }} />
            </div>
          ))}
        {t.services === "strips" &&
          [0, 1].map((i) => (
            <div
              key={i}
              className="h-3.5 rounded-sm border-l-4"
              style={{ backgroundColor: surface, borderLeftColor: color }}
            />
          ))}
      </div>
    </div>
  );
}

export function ThemePicker({
  initial,
  brandColor,
}: {
  initial: string;
  brandColor: string;
}) {
  const [current, setCurrent] = useState<ThemeId>(getTheme(initial).id);
  const [busy, setBusy] = useState<ThemeId | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const choose = async (id: ThemeId) => {
    if (id === current || busy) return;
    setBusy(id);
    setMsg(null);
    try {
      const res = await fetch("/api/tenants/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setCurrent(id);
        setMsg({ ok: true, text: `Visual "${THEMES[id].name}" aplicado. Seu site já mudou.` });
      } else {
        setMsg({ ok: false, text: data.error || "Não foi possível trocar o visual." });
      }
    } catch {
      setMsg({ ok: false, text: "Sem conexão. Tente de novo." });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-[#0f172a] p-5 sm:p-6">
      <div>
        <h2 className="text-base font-extrabold">Visual do site</h2>
        <p className="mt-1 text-sm text-slate-300">
          Escolha o formato que combina com o seu negócio. Seus textos, fotos e cores continuam os mesmos.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {THEME_IDS.map((id) => {
          const t = THEMES[id];
          const selected = id === current;
          // Cor da marca vale no tema; o azul padrão cede lugar ao destaque do tema.
          const bc = brandColor.toLowerCase();
          const color = !bc || (bc === "#3b82f6" && id !== "moderno") ? t.swatch.accent : brandColor;
          return (
            <button
              key={id}
              type="button"
              onClick={() => choose(id)}
              disabled={!!busy}
              aria-pressed={selected}
              className={`group relative flex flex-col gap-2 rounded-2xl border p-2 text-left transition ${
                selected
                  ? "border-[#67e8f9] bg-[#3b82f6]/15"
                  : "border-white/10 bg-[#0a0e17] hover:border-white/40"
              } disabled:opacity-70`}
            >
              <Mini t={t} color={color} />
              <div className="px-1 pb-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-extrabold">{t.name}</span>
                  {busy === id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#67e8f9]" />
                  ) : selected ? (
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded-full"
                      style={{ backgroundColor: "#67e8f9", color: readableOn("#67e8f9") }}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{t.bestFor}</p>
              </div>
            </button>
          );
        })}
      </div>

      {msg && (
        <p className={`text-sm font-bold ${msg.ok ? "text-emerald-300" : "text-red-300"}`}>{msg.text}</p>
      )}
    </div>
  );
}
