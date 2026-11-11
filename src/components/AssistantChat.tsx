"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, Loader2, Lock, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { PublishButton } from "@/components/PublishButton";

type Proposal = {
  kind: "quote" | "contract" | "appointment" | "visit" | "visit_quote";
  args: Record<string, unknown>;
  title: string;
  lines: string[];
  warnings: string[];
};
type SendAction = { label: string; whatsappUrl: string; mark: { path: string; body: Record<string, unknown> } };
type LinkAction = { label: string; url: string; whatsappUrl: string; mark?: { path: string; body: Record<string, unknown> } };
type Msg = {
  role: "user" | "assistant";
  content: string;
  proposals?: Proposal[];
  /** botões "enviar no WhatsApp" que o assistente preparou (orçamento, contrato, cobrança) */
  actions?: LinkAction[];
  sentActions?: Record<number, boolean>;
  /** estado de cada cartão: ok = salvo, canceled = descartado */
  done?: Record<number, { ok: boolean; text: string; href?: string; send?: SendAction; sent?: boolean } | "canceled">;
};

type Example = { label: string; text: string; mode: "ask" | "fill" };
export const EXAMPLE_GROUPS: { title: string; items: Example[] }[] = [
  {
    title: "Criar para um cliente",
    items: [
      { label: "Fazer um orçamento", text: "Faça um orçamento para o cliente NOME, telefone (67) 99999-9999, de SERVIÇO por R$ 0", mode: "fill" },
      { label: "Fazer um contrato", text: "Quero um contrato simples para NOME sobre o orçamento dele, pagamento 50/50", mode: "fill" },
      { label: "Marcar na agenda", text: "Marque NOME amanhã às 9h para SERVIÇO", mode: "fill" },
    ],
  },
  {
    title: "Na visita ao cliente",
    items: [
      { label: "Anotar na visita", text: "Estou na casa do cliente NOME. Anota: ", mode: "fill" },
      { label: "Ver minhas anotações", text: "Mostra as anotações da visita do cliente NOME", mode: "fill" },
      { label: "Virar orçamento", text: "Transforma as anotações da visita do cliente NOME em orçamento", mode: "fill" },
      { label: "Quem devo chamar de volta?", text: "Quais retornos eu tenho para fazer?", mode: "ask" },
    ],
  },
  {
    title: "Perguntar sobre o seu dia",
    items: [
      { label: "O que tenho hoje?", text: "O que tenho hoje?", mode: "ask" },
      { label: "E amanhã?", text: "O que tenho na agenda amanhã?", mode: "ask" },
      { label: "Quem está me devendo?", text: "Quem está me devendo?", mode: "ask" },
      { label: "Quanto recebi este mês?", text: "Quanto recebi este mês?", mode: "ask" },
    ],
  },
  {
    title: "Ganhar mais",
    items: [
      { label: "Como aumento meu rendimento?", text: "Quero aumentar meu rendimento, o que eu faço?", mode: "ask" },
      { label: "Orçamentos parados", text: "Quais orçamentos estão parados e quem devo chamar de volta?", mode: "ask" },
      { label: "Onde gasto mais tempo?", text: "Em quais serviços eu gasto mais tempo este mês?", mode: "ask" },
    ],
  },
];

/** Outros componentes pedem para abrir o chat (e já perguntar ou preencher algo). */
export function openAssistant(detail: { ask?: string; fill?: string } = {}) {
  window.dispatchEvent(new CustomEvent("assistant:open", { detail }));
}

/** Cartão grande no topo do painel: mostra o que dá para pedir e abre o chat com um toque. */
export function AssistantCard({ paid }: { paid: boolean }) {
  const [text, setText] = useState("");
  return (
    <section className="relative overflow-hidden rounded-3xl border border-[#8b5cf6]/50 bg-gradient-to-br from-[#1e1b4b] via-[#0f172a] to-[#0c4a6e] p-5 shadow-xl shadow-[#8b5cf6]/10 sm:p-7">
      <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-[#8b5cf6]/30 blur-3xl" />
      <div className="relative space-y-4">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl btn-shine shadow-lg">
            <Sparkles className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-xl font-extrabold sm:text-2xl">Peça para o assistente</h2>
            <p className="text-sm text-slate-300 sm:text-base">
              Escreva como no WhatsApp. Ele faz o orçamento, o contrato e a agenda; você só confirma.
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) openAssistant({ ask: text.trim() });
            else openAssistant();
            setText("");
          }}
          className="flex items-center gap-2"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ex.: orçamento para a Ana, instalação de ar, R$ 450"
            maxLength={1000}
            className="min-w-0 flex-1 rounded-xl border border-white/20 bg-[#0a0e17]/80 px-4 py-3.5 text-base text-white placeholder:text-slate-400"
          />
          <button
            type="submit"
            aria-label="Enviar"
            className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl btn-shine text-white hover:brightness-110"
          >
            {paid ? <Send className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {["Fazer um orçamento", "O que tenho hoje?", "Quem está me devendo?", "Como aumento meu rendimento?"].map((label) => {
            const ex = EXAMPLE_GROUPS.flatMap((g) => g.items).find((i) => i.label === label)!;
            return (
              <button
                key={label}
                type="button"
                onClick={() => (ex.mode === "ask" ? openAssistant({ ask: ex.text }) : openAssistant({ fill: ex.text }))}
                className="rounded-full border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-100 hover:border-[#67e8f9]/60 hover:bg-white/10"
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** Assistente por chat: botão flutuante, tela cheia no celular. Quem não liberou o plano vê o cadeado. */
export function AssistantChat({ paid }: { paid: boolean }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const pendingAsk = useRef("");

  useEffect(() => {
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent<{ ask?: string; fill?: string }>).detail || {};
      if (d.fill) setText(d.fill);
      if (d.ask) pendingAsk.current = d.ask;
      setOpen(true);
    };
    window.addEventListener("assistant:open", onOpen);
    return () => window.removeEventListener("assistant:open", onOpen);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, busy, open]);

  useEffect(() => {
    if (open && paid && pendingAsk.current) {
      const t = pendingAsk.current;
      pendingAsk.current = "";
      void send(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, paid]);

  async function send(raw: string) {
    const content = raw.trim();
    if (!content || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content }];
    setMsgs(next);
    setText("");
    setBusy(true);
    try {
      const res = await fetch("/api/assistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok) setMsgs([...next, { role: "assistant", content: d.reply, proposals: d.proposals, actions: d.actions }]);
      else setMsgs([...next, { role: "assistant", content: d.error || "Não consegui responder agora. Tente de novo." }]);
    } catch {
      setMsgs([...next, { role: "assistant", content: "Sem conexão. Tente de novo." }]);
    } finally {
      setBusy(false);
    }
  }

  async function confirm(mi: number, pi: number) {
    const p = msgs[mi].proposals?.[pi];
    if (!p) return;
    const key = `${mi}:${pi}`;
    setSaving(key);
    try {
      const res = await fetch("/api/assistente/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: p.kind, args: p.args }),
      });
      const d = await res.json().catch(() => ({}));
      const result = res.ok && d.ok ? { ok: true, text: d.message as string, href: d.href as string, send: d.send as SendAction | undefined } : { ok: false, text: (d.error as string) || "Não foi possível salvar." };
      setMsgs((cur) => cur.map((m, i) => (i === mi ? { ...m, done: { ...m.done, [pi]: result } } : m)));
      // O modelo precisa saber que foi salvo (para o próximo pedido, ex.: "agora faz o contrato").
      if (result.ok) setMsgs((cur) => [...cur, { role: "assistant", content: `✔ ${result.text}` }]);
    } finally {
      setSaving(null);
    }
  }

  /** Abre o WhatsApp já com a mensagem e registra o envio (o toque é o que libera abrir a janela). */
  function sendWhatsapp(mi: number, pi: number) {
    const st = msgs[mi].done?.[pi];
    if (!st || st === "canceled" || !st.send) return;
    const { whatsappUrl, mark } = st.send;
    window.open(whatsappUrl, "_blank", "noopener");
    setMsgs((cur) => cur.map((m, i) => (i === mi ? { ...m, done: { ...m.done, [pi]: { ...st, sent: true } } } : m)));
    void fetch(mark.path, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mark.body) }).catch(() => {});
  }

  function sendAction(mi: number, ai: number) {
    const a = msgs[mi].actions?.[ai];
    if (!a) return;
    window.open(a.whatsappUrl, "_blank", "noopener");
    setMsgs((cur) => cur.map((m, i) => (i === mi ? { ...m, sentActions: { ...m.sentActions, [ai]: true } } : m)));
    if (a.mark)
      void fetch(a.mark.path, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(a.mark.body) }).catch(() => {});
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* sem permissão para copiar: segue sem avisar */
    }
  }

  const discard = (mi: number, pi: number) =>
    setMsgs((cur) => cur.map((m, i) => (i === mi ? { ...m, done: { ...m.done, [pi]: "canceled" } } : m)));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir o assistente"
        className="animate-pulse-ring fixed bottom-4 right-4 z-40 inline-flex items-center gap-2.5 rounded-full btn-shine px-6 py-4 text-base font-extrabold text-white shadow-2xl shadow-[#8b5cf6]/40 hover:brightness-110 sm:bottom-6 sm:right-6"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        <Sparkles className="h-6 w-6" /> Pedir ao assistente
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0e17] sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[640px] sm:max-h-[85vh] sm:w-[400px] sm:rounded-3xl sm:border sm:border-white/15 sm:shadow-2xl">
          <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#0f172a] px-4 py-3 sm:rounded-t-3xl">
            <div className="flex items-center gap-2 font-extrabold">
              <Sparkles className="h-5 w-5 text-[#67e8f9]" /> Assistente
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="rounded-lg p-2 text-slate-300 hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </header>

          {!paid ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#3b82f6]/20">
                <Lock className="h-7 w-7 text-[#67e8f9]" />
              </span>
              <h2 className="text-xl font-extrabold">Seu assistente de trabalho</h2>
              <p className="text-sm text-slate-300">
                Peça por mensagem: &ldquo;faz um orçamento para a Ana&rdquo;, &ldquo;o que tenho na quinta?&rdquo;, &ldquo;quanto recebi esse mês?&rdquo;.
                Ele cria, você confirma.
              </p>
              <PublishButton
                label="Liberar por R$ 37/mês"
                className="inline-flex items-center justify-center gap-2 rounded-xl btn-shine px-6 py-3 text-sm font-extrabold text-white disabled:opacity-60"
              />
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {msgs.length === 0 && (
                  <div className="space-y-5">
                    <div className="rounded-2xl bg-[#0f172a] border border-white/10 px-4 py-3 text-slate-100">
                      <p className="font-extrabold">Oi! Eu cuido da papelada pra você.</p>
                      <p className="mt-1 text-sm text-slate-300">
                        Escreva do seu jeito, como no WhatsApp. Ou toque num exemplo abaixo. Eu só salvo depois que você tocar em
                        <strong> Confirmar</strong>.
                      </p>
                    </div>
                    {EXAMPLE_GROUPS.map((g) => (
                      <div key={g.title} className="space-y-2">
                        <p className="text-xs font-extrabold uppercase tracking-wider text-[#a5f3fc]">{g.title}</p>
                        <div className="flex flex-wrap gap-2">
                          {g.items.map((ex) => (
                            <button
                              key={ex.label}
                              type="button"
                              onClick={() => (ex.mode === "ask" ? void send(ex.text) : setText(ex.text))}
                              className="rounded-full border border-white/15 bg-[#0f172a] px-4 py-2.5 text-sm font-bold text-slate-100 hover:border-[#3b82f6]/60"
                            >
                              {ex.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {msgs.map((m, mi) => (
                  <div key={mi} className={m.role === "user" ? "flex justify-end" : "space-y-2"}>
                    <div
                      className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-base ${
                        m.role === "user" ? "bg-[#3b82f6] text-white" : "bg-[#0f172a] text-slate-100 border border-white/10"
                      }`}
                    >
                      {m.content}
                    </div>

                    {m.actions?.map((a, ai) => (
                      <div key={ai} className="max-w-[92%] space-y-2">
                        <button
                          type="button"
                          onClick={() => sendAction(mi, ai)}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3.5 text-left text-base font-extrabold text-zinc-950 hover:brightness-110"
                        >
                          <MessageCircle className="h-5 w-5 shrink-0" /> {m.sentActions?.[ai] ? "Enviado. Enviar de novo" : a.label}
                        </button>
                        <button type="button" onClick={() => copyLink(a.url)} className="text-sm font-bold text-[#67e8f9] underline">
                          Copiar o link
                        </button>
                      </div>
                    ))}

                    {m.proposals?.map((p, pi) => {
                      const st = m.done?.[pi];
                      return (
                        <div key={pi} className="max-w-[92%] space-y-2 rounded-2xl border border-[#3b82f6]/50 bg-[#3b82f6]/10 p-4">
                          <p className="font-extrabold text-[#a5f3fc]">{p.title}</p>
                          <ul className="space-y-0.5 text-sm text-slate-100">
                            {p.lines.map((l) => (
                              <li key={l}>{l}</li>
                            ))}
                          </ul>
                          {p.warnings.map((w) => (
                            <p key={w} className="flex items-start gap-2 rounded-xl bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-200">
                              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {w}
                            </p>
                          ))}
                          {st === "canceled" ? (
                            <p className="text-sm text-slate-400">Descartado.</p>
                          ) : st ? (
                            <div className="space-y-2">
                              <p className={`text-sm font-bold ${st.ok ? "text-emerald-300" : "text-red-300"}`}>
                                {st.ok ? <Check className="mr-1 inline h-4 w-4" /> : null}
                                {st.text}{" "}
                                {st.ok && st.href && (
                                  <Link href={st.href} className="underline">
                                    Abrir
                                  </Link>
                                )}
                              </p>
                              {st.ok && st.send && (
                                <button
                                  type="button"
                                  onClick={() => sendWhatsapp(mi, pi)}
                                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3.5 text-base font-extrabold text-zinc-950 hover:brightness-110"
                                >
                                  <MessageCircle className="h-5 w-5" /> {st.sent ? "Enviado. Reenviar" : st.send.label}
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="flex gap-2 pt-1">
                              <button
                                type="button"
                                disabled={saving === `${mi}:${pi}`}
                                onClick={() => confirm(mi, pi)}
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-extrabold text-zinc-950 hover:bg-emerald-400 disabled:opacity-60"
                              >
                                {saving === `${mi}:${pi}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                {p.warnings.length ? "Confirmar mesmo assim" : "Confirmar"}
                              </button>
                              <button
                                type="button"
                                onClick={() => discard(mi, pi)}
                                className="rounded-xl border border-white/15 px-4 py-3 text-sm font-bold text-slate-200 hover:bg-white/10"
                              >
                                Cancelar
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}

                {busy && (
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-[#0f172a] px-4 py-2.5 text-slate-300">
                    <Loader2 className="h-4 w-4 animate-spin" /> Pensando...
                  </div>
                )}
                <div ref={endRef} />
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void send(text);
                }}
                className="flex items-center gap-2 border-t border-white/10 bg-[#0f172a] p-3 sm:rounded-b-3xl"
                style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
              >
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Escreva aqui..."
                  maxLength={1000}
                  className="min-w-0 flex-1 rounded-xl border border-white/15 bg-[#0a0e17] px-4 py-3 text-base text-white placeholder:text-slate-500"
                />
                <button
                  type="submit"
                  disabled={busy || !text.trim()}
                  aria-label="Enviar"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl btn-shine text-white disabled:opacity-50"
                >
                  <Send className="h-5 w-5" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
