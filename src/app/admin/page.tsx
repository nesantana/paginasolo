"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Crown, ExternalLink, Loader2, LogOut, Search, TrendingUp } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

type Row = {
  id: string;
  slug: string;
  business_name: string;
  category: string;
  city: string;
  payer_email: string | null;
  subscription_status: "draft" | "active" | "past_due" | "cancelled";
  complimentary: boolean;
  comp_note: string | null;
  created_at: string;
  published_at: string | null;
};
type Summary = {
  total: number; paying: number; premium: number; drafts: number; inactive: number;
  mrr: number; arr: number; conversion: number;
};
type Data = { admin: string; hasSite: boolean; price: number; summary: Summary; tenants: Row[] };

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const date = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

function statusOf(t: Row): { label: string; cls: string; key: string } {
  if (t.subscription_status === "active" && t.complimentary)
    return { label: "Premium (cortesia)", cls: "bg-amber-50 text-amber-700 border-amber-300", key: "premium" };
  if (t.subscription_status === "active")
    return { label: "Pagante", cls: "bg-emerald-50 text-emerald-700 border-emerald-300", key: "paying" };
  if (t.subscription_status === "draft")
    return { label: "Grátis", cls: "bg-slate-100 text-slate-600 border-slate-200", key: "draft" };
  return { label: "Inativo", cls: "bg-red-50 text-red-600 border-red-300", key: "inactive" };
}

function Login() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-5 text-slate-900">
      <div className="w-full max-w-sm space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-7 text-center">
        <BrandLogo size={40} className="justify-center text-2xl" />
        <h1 className="text-xl font-extrabold">Painel administrativo</h1>
        <p className="text-sm text-slate-600">Entre com o seu e-mail, o mesmo login de todo mundo.</p>
        <a href="/entrar" className="block rounded-2xl bg-blue-600 px-6 py-3 font-extrabold">
          Entrar
        </a>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [data, setData] = useState<Data | null>(null);
  const [state, setState] = useState<"loading" | "login" | "ready">("loading");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [grantFor, setGrantFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/tenants", { cache: "no-store" });
    if (res.status === 401) return setState("login");
    setData(await res.json());
    setState("ready");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(id: string, grant: boolean) {
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/premium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, grant, note }),
      });
      const d = await res.json().catch(() => ({}));
      setToast(d.ok ? (grant ? "Premium concedido." : "Premium removido.") : d.error || "Erro.");
      setGrantFor(null);
      setNote("");
      await load();
    } finally {
      setBusyId(null);
      setTimeout(() => setToast(""), 3500);
    }
  }

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data?.tenants || []).filter((t) => {
      if (filter !== "all" && statusOf(t).key !== filter) return false;
      if (!term) return true;
      return [t.business_name, t.slug, t.payer_email || "", t.city].join(" ").toLowerCase().includes(term);
    });
  }, [data, q, filter]);

  if (state === "loading")
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 text-slate-900">
        <Loader2 className="h-6 w-6 animate-spin text-blue-700" />
      </div>
    );
  if (state === "login" || !data) return <Login />;

  const s = data.summary;
  const cards = [
    { label: "Faturamento mensal estimado", value: brl(s.mrr), sub: `${s.paying} × ${brl(data.price)} • ${brl(s.arr)}/ano`, hl: true },
    { label: "Pagantes ativos", value: String(s.paying), sub: `conversão ${s.conversion}%` },
    { label: "Premium (cortesia)", value: String(s.premium), sub: "não entram no faturamento" },
    { label: "Sites grátis", value: String(s.drafts), sub: "oportunidade de upgrade" },
    { label: "Inativos", value: String(s.inactive), sub: "pausados ou cancelados" },
  ];

  return (
    <div className="min-h-dvh bg-slate-50 pb-16 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <span className="text-lg font-extrabold">
            <BrandLogo size={32} />{" "}
            <span className="ml-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">admin</span>
          </span>
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="hidden sm:inline">{data.admin}</span>
            {data.hasSite && (
              <a href="/dashboard" className="rounded-full border border-slate-200 px-3 py-1.5 font-bold hover:bg-slate-100">
                Meu site
              </a>
            )}
            <button
              onClick={async () => {
                await fetch("/api/admin/sair", { method: "POST" });
                setState("login");
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 font-bold hover:bg-slate-100"
            >
              <LogOut className="h-3.5 w-3.5" /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 pt-6">
        {toast && <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">{toast}</div>}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {cards.map((c) => (
            <div
              key={c.label}
              className={`rounded-2xl border p-4 ${c.hl ? "col-span-2 border-blue-200 bg-blue-50 lg:col-span-1" : "border-white/10 bg-white/5"}`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-600">
                {c.label} {c.hl && <TrendingUp className="h-4 w-4 text-blue-700" />}
              </div>
              <div className="mt-2 text-2xl font-extrabold sm:text-3xl">{c.value}</div>
              <div className="mt-1 text-xs text-slate-500">{c.sub}</div>
            </div>
          ))}
        </section>
        <p className="text-xs text-slate-500">
          Faturamento bruto estimado (pagantes × preço do plano), antes das taxas do Mercado Pago. Cortesias não contam.
        </p>

        <section className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nome, e-mail, cidade ou link"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[["all", "Todos"], ["paying", "Pagantes"], ["premium", "Premium"], ["draft", "Grátis"], ["inactive", "Inativos"]].map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${filter === k ? "bg-[#3b82f6] text-white" : "border border-slate-200 text-slate-600 hover:bg-white/10"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {rows.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Nenhum site encontrado.</p>}
            {rows.map((t) => {
              const st = statusOf(t);
              const open = grantFor === t.id;
              return (
                <div key={t.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-extrabold">{t.business_name}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                      </div>
                      <div className="mt-0.5 truncate text-xs text-slate-500">
                        {t.category} • {t.city} • {t.payer_email || "sem e-mail"} • criado em {date(t.created_at)}
                      </div>
                      {t.comp_note && <div className="mt-0.5 text-xs text-amber-700">{t.comp_note}</div>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <a
                        href={`/${t.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold hover:bg-slate-100"
                      >
                        Ver <ExternalLink className="h-3 w-3" />
                      </a>
                      {t.complimentary ? (
                        <button
                          disabled={busyId === t.id}
                          onClick={() => act(t.id, false)}
                          className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-60"
                        >
                          Remover premium
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setGrantFor(open ? null : t.id);
                            setNote("");
                          }}
                          className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1.5 text-xs font-extrabold text-black hover:bg-amber-300"
                        >
                          <Crown className="h-3.5 w-3.5" /> Dar premium
                        </button>
                      )}
                    </div>
                  </div>
                  {open && (
                    <div className="mt-3 flex flex-col gap-2 border-t border-slate-200 pt-3 sm:flex-row">
                      <input
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Motivo (opcional): parceiro, teste, indicação…"
                        maxLength={120}
                        className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none"
                      />
                      <button
                        disabled={busyId === t.id}
                        onClick={() => act(t.id, true)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-extrabold text-black disabled:opacity-60"
                      >
                        {busyId === t.id && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar: liberar ferramentas sem cobrança
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
