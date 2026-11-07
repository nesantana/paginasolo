"use client";

import { useCallback, useEffect, useState } from "react";
import type { QuoteRow } from "@/types/database.types";
import type { PatchBody } from "@/components/QuoteCard";

/** Orçamentos do dono logado. `locked` = plano ainda não ativo (HTTP 402). */
export function useQuotes() {
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/orcamentos", { cache: "no-store" });
      if (res.status === 402) {
        setLocked(true);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "Não foi possível carregar os orçamentos.");
        return;
      }
      setError("");
      setQuotes(data.quotes as QuoteRow[]);
    } catch {
      setError("Sem conexão. Tente de novo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const patch = useCallback(async (id: string, body: PatchBody) => {
    const res = await fetch(`/api/orcamentos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      setError(data.error || "Não foi possível salvar.");
      return;
    }
    setError("");
    setQuotes((list) => list.map((q) => (q.id === id ? (data.quote as QuoteRow) : q)));
  }, []);

  const remove = useCallback(async (id: string) => {
    const res = await fetch(`/api/orcamentos/${id}`, { method: "DELETE" });
    if (res.ok) setQuotes((list) => list.filter((q) => q.id !== id));
    else setError("Não foi possível apagar.");
  }, []);

  const add = useCallback((q: QuoteRow) => setQuotes((list) => [q, ...list]), []);

  return { quotes, loading, locked, error, reload, patch, remove, add };
}
