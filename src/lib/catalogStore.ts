import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "@/lib/supabase/admin";
import type { CatalogItem } from "@/types/catalog";

const db = () => getAdminClient() as unknown as SupabaseClient;
const MAX_ITEMS = 300;
const COLS = "id, kind, name, description, price_cents, unit, active";

export type CatalogInput = {
  kind: "service" | "product";
  name: string;
  description: string | null;
  price_cents: number;
  unit: string | null;
};

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

export function parseCatalogInput(raw: unknown): CatalogInput | { error: string } {
  const b = (raw ?? {}) as Record<string, unknown>;
  const name = clean(b.name, 80);
  if (!name) return { error: "Dê um nome ao item." };
  const price = Math.round(Number(b.price_cents) || 0);
  if (price < 0 || price > 100_000_000) return { error: "Preço inválido." };
  return {
    kind: b.kind === "product" ? "product" : "service",
    name,
    description: clean(b.description, 200) || null,
    price_cents: price,
    unit: clean(b.unit, 20) || null,
  };
}

export async function listCatalog(tenantId: string): Promise<CatalogItem[]> {
  const { data, error } = await db()
    .from("catalog_items")
    .select(COLS)
    .eq("tenant_id", tenantId)
    .eq("active", true)
    .order("name", { ascending: true })
    .limit(MAX_ITEMS);
  if (error) throw new Error(`Supabase: ${error.message}`);
  return (data || []) as CatalogItem[];
}

export async function createCatalogItem(tenantId: string, input: CatalogInput): Promise<CatalogItem | { error: string }> {
  const { count } = await db().from("catalog_items").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("active", true);
  if ((count ?? 0) >= MAX_ITEMS) return { error: "Limite de itens do catálogo atingido." };
  const { data, error } = await db().from("catalog_items").insert({ tenant_id: tenantId, ...input }).select(COLS).single();
  if (error) throw new Error(`Supabase: ${error.message}`);
  return data as CatalogItem;
}

export async function updateCatalogItem(tenantId: string, id: string, input: CatalogInput): Promise<CatalogItem | null> {
  const { data, error } = await db()
    .from("catalog_items")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select(COLS)
    .maybeSingle();
  if (error) throw new Error(`Supabase: ${error.message}`);
  return (data as CatalogItem) || null;
}

export async function deleteCatalogItem(tenantId: string, id: string): Promise<boolean> {
  const { error, count } = await db().from("catalog_items").delete({ count: "exact" }).eq("id", id).eq("tenant_id", tenantId);
  if (error) throw new Error(`Supabase: ${error.message}`);
  return (count ?? 0) > 0;
}
