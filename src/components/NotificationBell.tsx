"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellRing,
  CalendarClock,
  CheckCheck,
  Eye,
  FileSignature,
  Gift,
  Loader2,
  Rocket,
  Wallet,
} from "lucide-react";
import type { NotificationRow, NotifyKind } from "@/lib/notify";

const KIND_ICON: Record<NotifyKind, { icon: typeof Bell; cls: string }> = {
  quote_viewed: { icon: Eye, cls: "bg-sky-400/15 text-sky-300" },
  quote_accepted: { icon: CheckCheck, cls: "bg-emerald-400/15 text-emerald-300" },
  contract_viewed: { icon: Eye, cls: "bg-sky-400/15 text-sky-300" },
  contract_signed: { icon: FileSignature, cls: "bg-emerald-400/15 text-emerald-300" },
  payment_informed: { icon: Wallet, cls: "bg-amber-400/15 text-amber-300" },
  payment_due: { icon: Wallet, cls: "bg-amber-400/15 text-amber-300" },
  followup: { icon: BellRing, cls: "bg-violet-400/15 text-violet-300" },
  agenda: { icon: CalendarClock, cls: "bg-[#3b82f6]/15 text-[#67e8f9]" },
  plan: { icon: Rocket, cls: "bg-[#3b82f6]/15 text-[#67e8f9]" },
  referral: { icon: Gift, cls: "bg-emerald-400/15 text-emerald-300" },
};

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function keyToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "agora";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

const pushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window &&
  Boolean(PUBLIC_KEY);

async function subscribeThisDevice(): Promise<boolean> {
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(PUBLIC_KEY) }));
  const res = await fetch("/api/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub.toJSON()),
  });
  return res.ok;
}

const isIosDevice = () => typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isInstalled = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true);

/** Passo a passo para quem não consegue ativar (iPhone sem o app instalado, navegador sem suporte). */
function UnsupportedHelp() {
  if (isIosDevice() && !isInstalled()) {
    return (
      <div className="space-y-1.5 text-xs text-slate-200">
        <p className="text-sm font-bold">Para receber avisos no iPhone, instale o app:</p>
        <ol className="list-decimal space-y-1 pl-4">
          <li>Abra este site no <b>Safari</b>.</li>
          <li>Toque no botão <b>Compartilhar</b> (quadrado com seta para cima).</li>
          <li>Escolha <b>Adicionar à Tela de Início</b>.</li>
          <li>Abra o app pelo <b>ícone novo</b> na tela e toque em Ativar avisos.</li>
        </ol>
      </div>
    );
  }
  return (
    <p className="text-xs text-slate-200">
      Este navegador não permite avisos. No Android, abra pelo <b>Chrome</b>. No iPhone, use o <b>Safari</b> com o app
      instalado na tela de início.
    </p>
  );
}

/** Sino do painel: histórico de avisos + botão para receber notificações no navegador/celular. */
export function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("unsupported");
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState("");
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/notificacoes", { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      setItems(d.items || []);
      setUnread(d.unread || 0);
    } catch {
      // sem conexão: tenta no próximo ciclo
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPerm(pushSupported() ? Notification.permission : "unsupported");
    // se o aparelho não tem suporte, ainda assim o sino mostra o passo a passo
    void load();
    const t = setInterval(() => document.visibilityState === "visible" && void load(), 60000);
    const onVis = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onVis);
    // quem já aceitou: renova a inscrição deste aparelho (cobre login novo e inscrição expirada)
    if (pushSupported() && Notification.permission === "granted") void subscribeThisDevice().catch(() => {});
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function enable() {
    setBusy(true);
    setHint("");
    try {
      const p = await Notification.requestPermission();
      setPerm(p);
      if (p === "granted") {
        const ok = await subscribeThisDevice();
        setHint(ok ? "Pronto! Você vai receber os avisos neste aparelho." : "Não foi possível ativar agora.");
      } else if (p === "denied") {
        setHint("Bloqueado no navegador. Libere as notificações deste site nas configurações do navegador.");
      }
    } catch {
      setHint("Não foi possível ativar neste navegador.");
    } finally {
      setBusy(false);
    }
  }

  async function markAll() {
    setItems((l) => l.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    setUnread(0);
    await fetch("/api/notificacoes", { method: "POST" }).catch(() => {});
  }

  async function openItem(n: NotificationRow) {
    setOpen(false);
    if (!n.read_at) {
      setItems((l) => l.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
      setUnread((u) => Math.max(0, u - 1));
      void fetch("/api/notificacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: n.id }),
      }).catch(() => {});
    }
    router.push(n.url);
  }

  async function sendTest() {
    setBusy(true);
    setHint("");
    try {
      await subscribeThisDevice().catch(() => false);
      const r = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: true }),
      });
      setHint(r.ok ? "Enviei um aviso de teste. Ele deve aparecer em alguns segundos." : "Não consegui enviar o teste agora.");
      void load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          void load();
        }}
        aria-label={unread ? `${unread} notificações novas` : "Notificações"}
        aria-expanded={open}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-slate-200 hover:bg-white/10"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-extrabold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-[4.5rem] z-50 max-h-[75dvh] overflow-hidden rounded-2xl border border-white/15 bg-[#0f172a] text-left shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[24rem]">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
            <h2 className="font-extrabold">Notificações</h2>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs font-bold text-[#67e8f9] hover:underline">
                Marcar todas como lidas
              </button>
            )}
          </div>

          {perm === "unsupported" && (
            <div className="m-3 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3">
              <UnsupportedHelp />
            </div>
          )}
          {(perm === "default" || perm === "denied") && (
            <div className="m-3 rounded-xl border border-[#3b82f6]/40 bg-[#3b82f6]/10 p-3">
              <p className="text-sm font-bold">Receba avisos no celular</p>
              <p className="mt-0.5 text-xs text-slate-300">
                Orçamento aceito, contrato assinado, pagamento: você fica sabendo na hora, mesmo com o app fechado.
              </p>
              {perm === "denied" ? (
                <p className="mt-2 text-xs text-amber-300">
                  Os avisos estão bloqueados. Toque no cadeado ao lado do endereço do site, abra Permissões ou Notificações,
                  escolha Permitir e atualize a página.
                </p>
              ) : (
                <button
                  onClick={enable}
                  disabled={busy}
                  className="btn-shine mt-2 inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-extrabold disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BellRing className="h-3.5 w-3.5" />}
                  Ativar avisos neste aparelho
                </button>
              )}
            </div>
          )}
          {perm === "granted" && (
            <div className="mx-4 mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs text-emerald-300">
                <BellRing className="h-3.5 w-3.5" /> Avisos ativados neste aparelho
              </p>
              <button onClick={sendTest} disabled={busy} className="text-xs font-bold text-[#67e8f9] hover:underline disabled:opacity-60">
                Enviar aviso de teste
              </button>
            </div>
          )}
          {hint && <p className="mx-4 mt-2 text-xs text-slate-300">{hint}</p>}

          <ul className="max-h-[55dvh] divide-y divide-white/10 overflow-y-auto">
            {items.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-slate-400">
                Nada por aqui ainda. Quando alguém abrir ou aceitar um orçamento, aparece aqui.
              </li>
            )}
            {items.map((n) => {
              const k = KIND_ICON[n.kind] || KIND_ICON.plan;
              const Icon = k.icon;
              return (
                <li key={n.id}>
                  <button
                    onClick={() => openItem(n)}
                    className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-white/5 ${n.read_at ? "opacity-70" : ""}`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${k.cls}`}>
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-sm font-bold leading-snug">{n.title}</span>
                        <span className="shrink-0 text-[11px] text-slate-400">{ago(n.created_at)}</span>
                      </span>
                      {n.body && <span className="mt-0.5 block text-xs text-slate-300">{n.body}</span>}
                    </span>
                    {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#67e8f9]" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Aviso no topo do painel para quem ainda não ativou as notificações neste aparelho. */
export function PushBanner() {
  const [state, setState] = useState<"hidden" | "ask" | "install" | "blocked">("hidden");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem("ps_push_banner") === "1";
    } catch {
      // sem storage: mostra sempre
    }
    if (dismissed) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!pushSupported()) setState(isIosDevice() && !isInstalled() ? "install" : "hidden");
    else if (Notification.permission === "default") setState("ask");
    else if (Notification.permission === "denied") setState("blocked");
  }, []);

  if (state === "hidden") return null;

  const close = () => {
    try {
      localStorage.setItem("ps_push_banner", "1");
    } catch {
      // ignora
    }
    setState("hidden");
  };

  async function enable() {
    setBusy(true);
    try {
      const p = await Notification.requestPermission();
      if (p === "granted") {
        await subscribeThisDevice().catch(() => false);
        setState("hidden");
      } else if (p === "denied") setState("blocked");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[#3b82f6]/40 bg-[#3b82f6]/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-2 font-extrabold">
          <BellRing className="h-5 w-5 text-[#67e8f9]" /> Receba um aviso quando o cliente aceitar
        </p>
        <button onClick={close} className="shrink-0 text-xs font-bold text-slate-400 hover:text-white">
          Agora não
        </button>
      </div>
      {state === "ask" && (
        <>
          <p className="mt-1 text-sm text-slate-300">Orçamento aceito, contrato assinado e pagamento chegam no seu celular, mesmo com o app fechado.</p>
          <button
            onClick={enable}
            disabled={busy}
            className="btn-shine mt-3 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-extrabold disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />} Ativar avisos neste aparelho
          </button>
        </>
      )}
      {state === "install" && (
        <div className="mt-2">
          <UnsupportedHelp />
        </div>
      )}
      {state === "blocked" && (
        <p className="mt-1 text-sm text-amber-300">
          Os avisos estão bloqueados neste aparelho. Toque no cadeado ao lado do endereço do site, abra Permissões, escolha
          Permitir em Notificações e atualize a página.
        </p>
      )}
    </div>
  );
}
