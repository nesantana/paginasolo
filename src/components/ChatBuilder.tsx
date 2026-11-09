"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Check,
  Copy,
  ExternalLink,
  ImagePlus,
  Loader2,
  SkipForward,
} from "lucide-react";
import { PublishButton } from "@/components/PublishButton";

type StepKey =
  | "business_name"
  | "category"
  | "city"
  | "whatsapp_number"
  | "address"
  | "opening_hours"
  | "logo_url"
  | "services"
  | "primary_color"
  | "payer_email";

type Step = {
  key: StepKey;
  ask: (a: Answers) => string;
  kind: "text" | "chips" | "logo" | "services" | "color";
  placeholder?: string;
  chips?: string[];
  skipLabel?: string;
  inputMode?: "text" | "tel" | "email";
};

type Answers = Partial<Record<StepKey, string>>;

const STEPS: Step[] = [
  {
    key: "business_name",
    kind: "text",
    placeholder: "Ex: Pantanal Climatização",
    ask: () =>
      "Oi! 👋 Eu vou montar o seu site agora, é rápido. Primeiro: qual é o nome da sua empresa?",
  },
  {
    key: "category",
    kind: "chips",
    chips: [
      "Ar-condicionado",
      "Salão de beleza",
      "Barbearia",
      "Mecânica",
      "Eletricista",
      "Encanador",
      "Clínica / Consultório",
      "Restaurante",
      "Loja",
      "Diarista / Limpeza",
    ],
    placeholder: "Ou escreva o que você faz",
    ask: (a) => `Prazer, ${a.business_name}! O que vocês fazem? Escolha ou escreva.`,
  },
  {
    key: "city",
    kind: "text",
    placeholder: "Ex: Campo Grande - MS",
    ask: () =>
      "Em qual cidade vocês atendem? Coloque também o estado, ajuda a aparecer no Google (ex: Campo Grande - MS).",
  },
  {
    key: "whatsapp_number",
    kind: "text",
    inputMode: "tel",
    placeholder: "(67) 99999-9999",
    ask: () => "Qual é o WhatsApp para os clientes chamarem vocês?",
  },
  {
    key: "address",
    kind: "text",
    placeholder: "Rua, número, bairro",
    skipLabel: "Não tenho endereço (vou até o cliente)",
    ask: () => "Onde vocês ficam? Digite o endereço.",
  },
  {
    key: "opening_hours",
    kind: "chips",
    chips: [
      "Segunda a Sexta: 08h às 18h",
      "Segunda a Sábado: 08h às 18h",
      "Todos os dias: 08h às 20h",
      "24 horas",
    ],
    placeholder: "Ou escreva o seu horário",
    ask: () => "Qual o horário de atendimento?",
  },
  {
    key: "logo_url",
    kind: "logo",
    skipLabel: "Não tenho logo",
    ask: () => "Vocês têm uma logo? Envie a imagem (pode ser foto do celular).",
  },
  {
    key: "services",
    kind: "services",
    placeholder: "Um serviço por linha\nEx:\nInstalação de ar-condicionado\nLimpeza de ar-condicionado\nConserto",
    ask: () =>
      "Quais serviços ou produtos vocês oferecem? Escreva um por linha (até 6). Eu cuido de escrever os textos.",
  },
  {
    key: "primary_color",
    kind: "color",
    ask: () => "Qual cor combina com a sua marca?",
  },
  {
    key: "payer_email",
    kind: "text",
    inputMode: "email",
    placeholder: "voce@email.com",
    ask: () =>
      "Último passo: seu e-mail. É por ele que você recebe o acesso para editar o site e o recibo.",
  },
];

const COLORS = [
  { label: "Laranja", hex: "#FF6600" },
  { label: "Azul", hex: "#0284C7" },
  { label: "Verde", hex: "#059669" },
  { label: "Vermelho", hex: "#E11D48" },
  { label: "Roxo", hex: "#7C3AED" },
  { label: "Dourado", hex: "#D97706" },
  { label: "Preto", hex: "#1F2937" },
];

type Msg = { from: "bot" | "user"; text: string; image?: string };

/** Reduz a logo para ~256px no navegador: leve para o banco e para o site. */
async function resizeLogo(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 256 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const webp = canvas.toDataURL("image/webp", 0.85);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/png");
}

export function ChatBuilder() {
  const [answers, setAnswers] = useState<Answers>({});
  const [stepIdx, setStepIdx] = useState(0);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(true);
  const [phrase, setPhrase] = useState(0);
  const timers = useRef<number[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"" | "logo" | "build">("");
  const [result, setResult] = useState<{ slug: string; accessPath: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const step = STEPS[stepIdx];
  const done = stepIdx >= STEPS.length;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy, result, typing]);

  // Saudação inicial: "digitando..." antes da primeira mensagem
  useEffect(() => {
    const t = window.setTimeout(() => {
      setMessages([{ from: "bot", text: STEPS[0].ask({}) }]);
      setTyping(false);
    }, 1100);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((t) => window.clearTimeout(t));
  }, []);

  // Frases que se alternam enquanto o site é montado
  useEffect(() => {
    if (busy !== "build") return;
    const i = window.setInterval(() => setPhrase((n) => n + 1), 1800);
    return () => window.clearInterval(i);
  }, [busy]);

  function validate(s: Step, value: string): string {
    const v = value.trim();
    if (s.key === "business_name" && v.length < 2) return "Digite o nome da empresa.";
    if (s.key === "category" && v.length < 3) return "Diga o que vocês fazem.";
    if (s.key === "city" && v.length < 3) return "Digite a cidade.";
    if (s.key === "whatsapp_number") {
      const d = v.replace(/\D/g, "");
      if (d.length < 10 || d.length > 13) return "Digite o WhatsApp com DDD. Ex: (67) 99999-9999";
    }
    if (s.key === "payer_email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))
      return "Esse e-mail parece incompleto.";
    if (s.key === "services") {
      const n = v.split("\n").map((l) => l.trim()).filter(Boolean).length;
      if (n < 1) return "Escreva pelo menos um serviço.";
    }
    return "";
  }

  function advance(value: string, shown: Msg) {
    if (typing) return;
    const next = { ...answers, [step.key]: value };
    setAnswers(next);
    setError("");
    setText("");
    const nextIdx = stepIdx + 1;
    const reply =
      nextIdx < STEPS.length
        ? STEPS[nextIdx].ask(next)
        : "Perfeito! Já tenho tudo. Vou montar o seu site agora… ✨";

    setMessages((m) => [...m, shown]);
    setTyping(true);
    // "pensa" um pouco antes de responder; respostas maiores demoram mais
    const delay = 900 + Math.min(reply.length * 14, 1100) + Math.random() * 400;
    timers.current.push(
      window.setTimeout(() => {
        setTyping(false);
        setMessages((m) => [...m, { from: "bot", text: reply }]);
        setStepIdx(nextIdx);
        if (nextIdx >= STEPS.length) void build(next);
      }, delay)
    );
  }

  function submitText(raw?: string) {
    if (typing) return;
    const value = (raw ?? text).trim();
    const err = validate(step, value);
    if (err) return setError(err);
    advance(value, { from: "user", text: value });
  }

  async function onLogo(file: File | undefined) {
    if (!file || typing) return;
    setBusy("logo");
    setError("");
    try {
      if (!file.type.startsWith("image/") || file.type.includes("svg"))
        throw new Error("Envie uma foto PNG ou JPG.");
      const dataUrl = await resizeLogo(file);
      advance(dataUrl, { from: "user", text: "Logo enviada", image: dataUrl });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não consegui ler essa imagem.");
    } finally {
      setBusy("");
    }
  }

  async function build(a: Answers) {
    setBusy("build");
    try {
      const services = (a.services || "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 6)
        .map((title) => ({ title, description: "" }));

      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: a.business_name,
          category: a.category,
          city: a.city,
          whatsapp_number: a.whatsapp_number,
          address: a.address || null,
          opening_hours: a.opening_hours,
          logo_url: a.logo_url || null,
          primary_color: a.primary_color,
          payer_email: a.payer_email,
          services,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Erro ao criar o site.");
      setResult({ slug: data.slug, accessPath: data.accessPath });
      setMessages((m) => [
        ...m,
        { from: "bot", text: "Pronto! Seu site está montado. Dá uma olhada 👇" },
      ]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          from: "bot",
          text: `Ops: ${e instanceof Error ? e.message : "algo deu errado"}. Toque em "Tentar de novo".`,
        },
      ]);
    } finally {
      setBusy("");
    }
  }

  const accessUrl =
    result && typeof window !== "undefined" ? `${window.location.origin}${result.accessPath}` : "";

  async function copyAccess() {
    try {
      await navigator.clipboard.writeText(accessUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // sem clipboard: o link está visível na tela
    }
  }

  const progress = Math.round((Math.min(stepIdx, STEPS.length) / STEPS.length) * 100);

  return (
    <div className="mx-auto w-full max-w-2xl flex flex-col min-h-[calc(100dvh-4rem)]">
      <div className="px-4 pt-4">
        <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-400">
          <span>
            {result ? "Site pronto!" : `Passo ${Math.min(stepIdx + 1, STEPS.length)} de ${STEPS.length}`}
          </span>
          <span>{result ? 100 : progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="btn-shine h-2 rounded-full transition-all duration-700"
            style={{ width: `${result ? 100 : Math.max(progress, 6)}%` }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3" aria-live="polite">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`animate-pop-in flex items-end gap-2 ${m.from === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.from === "bot" && (
              <span className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center">
                <img src="/brand/logo-meusitenovo.svg" alt="" className="h-8 w-8" />
              </span>
            )}
            <div
              className={`max-w-[82%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed whitespace-pre-line shadow-lg ${
                m.from === "user"
                  ? "btn-shine text-white rounded-br-md font-semibold"
                  : "glass text-slate-100 rounded-bl-md"
              }`}
            >
              {m.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.image} alt="Sua logo" className="h-16 w-16 rounded-lg object-cover bg-white" />
              ) : (
                m.text
              )}
            </div>
          </div>
        ))}

        {typing && (
          <div className="animate-pop-in flex items-end gap-2" aria-label="Digitando">
            <span className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center">
              <img src="/brand/logo-meusitenovo.svg" alt="" className="h-8 w-8" />
            </span>
            <div className="glass flex items-center gap-1.5 rounded-2xl rounded-bl-md px-4 py-4">
              {[0, 1, 2].map((d) => (
                <span
                  key={d}
                  className="dot-bounce h-2 w-2 rounded-full bg-slate-300"
                  style={{ animationDelay: `${d * 160}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        {busy === "build" && (
          <div className="glass animate-pop-in flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-slate-200">
            <Loader2 className="h-5 w-5 animate-spin text-[#67e8f9]" />{" "}
            {
              [
                "Escrevendo os textos…",
                "Montando o layout…",
                "Ajustando para o Google…",
                "Quase pronto…",
              ][phrase % 4]
            }
          </div>
        )}

        {done && !busy && !result && (
          <button
            onClick={() => void build(answers)}
            className="btn-shine rounded-full px-6 py-3 text-sm font-extrabold text-white"
          >
            Tentar de novo
          </button>
        )}

        {result && (
          <div className="space-y-4 pt-2">
            <div className="animate-pop-in animate-float mx-auto w-[280px] rounded-[2rem] border-4 border-white/20 bg-black p-1.5 shadow-[0_30px_80px_-10px_rgba(255,102,0,0.45)]">
              <iframe
                src={`/${result.slug}`}
                title="Prévia do seu site"
                className="h-[480px] w-full rounded-[1.5rem] bg-[#0a0e17]"
              />
            </div>

            <div className="glass rounded-2xl p-5 space-y-3">
              <p className="text-sm text-slate-200">
                Seu site está pronto. Para aparecer no Google e ficar no ar, ative a assinatura de{" "}
                <strong className="text-white">R$ 37/mês</strong>, sem fidelidade.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <PublishButton label="Publicar agora — R$ 37/mês" />
                <a
                  href={`/${result.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Abrir em tela cheia
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-xs text-amber-100 space-y-2">
              <p className="font-bold">Guarde este link: é a sua chave para editar o site.</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={accessUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 min-w-0 rounded-lg bg-black/30 px-3 py-2 text-[11px] text-amber-50"
                />
                <button
                  onClick={copyAccess}
                  className="inline-flex items-center gap-1 rounded-lg bg-amber-400 px-3 py-2 font-extrabold text-black"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
              <a href="/dashboard" className="inline-block font-bold underline">
                Ir para o meu painel
              </a>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {!done && !typing && messages.length > 0 && (
        <div className="border-t border-white/10 bg-[#0a0e17]/90 backdrop-blur-xl px-4 py-3 space-y-2.5">
          {error && <p className="text-xs font-bold text-red-300">{error}</p>}

          {(step.kind === "chips" || step.kind === "color") && (
            <div className="flex flex-wrap gap-2">
              {step.kind === "chips" &&
                step.chips!.map((c) => (
                  <button
                    key={c}
                    onClick={() => submitText(c)}
                    className="rounded-full border border-white/15 bg-white/5 hover:bg-white/10 hover:border-[#67e8f9] hover:scale-105 px-4 py-2.5 text-sm font-bold text-white transition"
                  >
                    {c}
                  </button>
                ))}
              {step.kind === "color" &&
                COLORS.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => advance(c.hex, { from: "user", text: c.label })}
                    aria-label={c.label}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 hover:border-[#67e8f9] hover:scale-105 px-4 py-2.5 text-sm font-bold text-white transition"
                  >
                    <span className="h-4 w-4 rounded-full" style={{ backgroundColor: c.hex }} />
                    {c.label}
                  </button>
                ))}
            </div>
          )}

          {step.kind === "logo" && (
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => void onLogo(e.target.files?.[0])}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={busy === "logo"}
                className="inline-flex items-center gap-2 btn-shine rounded-full px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-[#3b82f6]/30 disabled:opacity-60"
              >
                {busy === "logo" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                Enviar logo
              </button>
            </div>
          )}

          {step.skipLabel && (
            <button
              onClick={() => advance("", { from: "user", text: step.skipLabel! })}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white"
            >
              <SkipForward className="w-3.5 h-3.5" /> {step.skipLabel}
            </button>
          )}

          {(step.kind === "text" || step.kind === "chips" || step.kind === "services") && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitText();
              }}
              className="flex items-end gap-2"
            >
              {step.kind === "services" ? (
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={step.placeholder}
                  rows={4}
                  autoFocus
                  className="flex-1 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-base text-white placeholder:text-slate-500 focus:outline-none focus:border-[#67e8f9]"
                />
              ) : (
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={step.placeholder}
                  inputMode={step.inputMode}
                  type={step.inputMode === "email" ? "email" : "text"}
                  autoFocus
                  autoComplete="off"
                  className="flex-1 rounded-full border border-white/15 bg-white/5 px-5 py-3.5 text-base text-white placeholder:text-slate-500 focus:outline-none focus:border-[#67e8f9]"
                />
              )}
              <button
                type="submit"
                aria-label="Enviar"
                className="btn-shine h-12 w-12 shrink-0 rounded-full text-white flex items-center justify-center shadow-lg shadow-[#3b82f6]/30 transition hover:scale-110"
              >
                <ArrowUp className="w-5 h-5" />
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
