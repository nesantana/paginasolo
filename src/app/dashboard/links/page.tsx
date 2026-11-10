"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";
import type { TenantLink, TenantRow } from "@/types/database.types";
import { OwnerShell, PaidOnly, useOwnerTenant } from "@/components/OwnerShell";

const field =
  "w-full rounded-xl border border-white/10 bg-[#0a0e17] px-4 py-3 text-base text-white placeholder:text-slate-500 focus:border-[#67e8f9] focus:outline-none";

function LinksEditor({ tenant }: { tenant: TenantRow }) {
  const [links, setLinks] = useState<TenantLink[]>(
    Array.isArray(tenant.links) ? tenant.links : []
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/${tenant.slug}/links`;

  const update = (i: number, patch: Partial<TenantLink>) =>
    setLinks((l) => l.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/tenants/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setMsg({ ok: false, text: data.error || "Não foi possível salvar." });
        return;
      }
      setLinks(data.links as TenantLink[]);
      setMsg({ ok: true, text: "Salvo! Sua página de links já está atualizada." });
    } catch {
      setMsg({ ok: false, text: "Sem conexão. Tente de novo." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-white/10 bg-[#0f172a] p-5 sm:p-6">
        <p className="text-sm font-bold text-slate-300">Seu link para o Instagram, TikTok e WhatsApp</p>
        <p className="mt-2 break-all rounded-xl bg-[#0a0e17] px-4 py-3 font-mono text-sm text-[#67e8f9]">
          {url}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              } catch {
                window.prompt("Copie o link:", url);
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0f172a] px-4 py-2.5 text-sm font-extrabold text-zinc-900"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiado!" : "Copiar link"}
          </button>
          <a
            href={`/${tenant.slug}/links`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold"
          >
            <ExternalLink className="h-4 w-4" /> Ver como o cliente vê
          </a>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-slate-400">
          Já aparecem sozinhos: pedir orçamento no WhatsApp, seu site, ligar, como chegar e avaliação
          no Google (quando preenchidos). Abaixo você adiciona o que quiser.
        </p>
      </section>

      <section className="space-y-3 rounded-3xl border border-white/10 bg-[#0f172a] p-5 sm:p-6">
        <h2 className="text-lg font-extrabold">Seus links extras</h2>
        {links.map((l, i) => (
          <div key={i} className="grid gap-2 rounded-xl bg-[#0a0e17] p-3 sm:grid-cols-[1fr_1.4fr_auto]">
            <input
              className={field}
              placeholder="Nome (ex.: Instagram)"
              maxLength={50}
              value={l.label}
              onChange={(e) => update(i, { label: e.target.value })}
              aria-label="Nome do link"
            />
            <input
              className={field}
              placeholder="instagram.com/seunegocio"
              inputMode="url"
              autoCapitalize="none"
              value={l.url}
              onChange={(e) => update(i, { url: e.target.value })}
              aria-label="Endereço do link"
            />
            <button
              type="button"
              onClick={() => setLinks((x) => x.filter((_, k) => k !== i))}
              aria-label="Remover link"
              className="rounded-xl px-3 py-2 text-slate-400 hover:bg-red-500/10 hover:text-red-300"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {links.length < 12 && (
          <button
            type="button"
            onClick={() => setLinks((l) => [...l, { label: "", url: "" }])}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#67e8f9] hover:text-[#67e8f9]"
          >
            <Plus className="h-4 w-4" /> Adicionar link
          </button>
        )}

        {msg && (
          <p
            role="status"
            className={`rounded-xl px-4 py-3 text-sm font-semibold ${
              msg.ok ? "bg-emerald-500/15 text-emerald-200" : "bg-red-500/15 text-red-200"
            }`}
          >
            {msg.text}
          </p>
        )}

        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="btn-shine text-white hover:brightness-110 flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 font-extrabold disabled:opacity-60"
        >
          {busy && <Loader2 className="h-5 w-5 animate-spin" />}
          {busy ? "Salvando..." : "Salvar links"}
        </button>
        <p className="text-xs text-slate-400">
          Só links seguros (https). Endereços sem https:// recebem automaticamente.
        </p>
      </section>
    </div>
  );
}

export default function LinksPage() {
  const tenant = useOwnerTenant();
  const paid = tenant?.is_active && tenant.subscription_status === "active";

  return (
    <OwnerShell
      title="Página de links"
      subtitle="Um único link na bio do Instagram com tudo o que o cliente precisa."
    >
      {!tenant ? (
        <p className="flex items-center gap-2 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </p>
      ) : paid ? (
        <LinksEditor key={tenant.id} tenant={tenant} />
      ) : (
        <PaidOnly feature="A página de links" />
      )}
    </OwnerShell>
  );
}
