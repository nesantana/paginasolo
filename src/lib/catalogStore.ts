import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "@/lib/supabase/admin";
import type { CatalogItem } from "@/types/catalog";
import type { TenantRow, TenantServiceItem } from "@/types/database.types";
import { formatBRL, priceTextToCents } from "@/lib/quoteUi";
import { updateTenantServices } from "@/lib/tenantStore";

const db = () => getAdminClient() as unknown as SupabaseClient;
const MAX_ITEMS = 300;
const COLS = "id, kind, name, description, price_cents, unit, active, show_on_site, revisit_days";
export const SITE_MAX_SERVICES = 8;
const norm = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export type CatalogInput = {
  kind: "service" | "product";
  name: string;
  description: string | null;
  price_cents: number;
  unit: string | null;
  show_on_site: boolean;
  revisit_days: number | null;
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
    show_on_site: b.show_on_site === true,
    revisit_days: Number(b.revisit_days) >= 7 && Number(b.revisit_days) <= 730 ? Math.round(Number(b.revisit_days)) : null,
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

export async function getCatalogItem(tenantId: string, id: string): Promise<CatalogItem | null> {
  const { data, error } = await db().from("catalog_items").select(COLS).eq("id", id).eq("tenant_id", tenantId).maybeSingle();
  if (error) throw new Error(`Supabase: ${error.message}`);
  return (data as CatalogItem) || null;
}

const siteText = (it: Pick<CatalogItem, "price_cents" | "unit">) =>
  it.price_cents > 0 ? `${formatBRL(it.price_cents)}${it.unit ? ` ${it.unit}` : ""}`.slice(0, 60) : "Orçamento no WhatsApp";

/** O site tem espaço para poucos serviços: diz se este item ainda cabe. */
export const siteHasRoom = (tenant: TenantRow, name: string) =>
  (tenant.services || []).some((s) => norm(s.title) === norm(name)) || (tenant.services || []).length < SITE_MAX_SERVICES;

/** Mantém a lista de serviços do site igual ao catálogo (só mexe nos itens do catálogo). */
export async function syncSiteServices(
  tenant: TenantRow,
  change: { upsert?: CatalogItem; removeTitle?: string }
): Promise<TenantRow | null> {
  let list: TenantServiceItem[] = [...(tenant.services || [])];
  const drop = (title: string) => {
    list = list.filter((s) => norm(s.title) !== norm(title));
  };
  if (change.removeTitle) drop(change.removeTitle);
  if (change.upsert) {
    const it = change.upsert;
    const idx = list.findIndex((s) => norm(s.title) === norm(it.name));
    if (it.show_on_site) {
      const svc: TenantServiceItem = { title: it.name, description: it.description || "", price_optional: siteText(it) };
      if (idx >= 0) list[idx] = { ...list[idx], ...svc };
      else list.push(svc);
    } else if (idx >= 0) list.splice(idx, 1);
  }
  list = list.slice(0, SITE_MAX_SERVICES);
  if (list.length === 0) list = [{ title: "Orçamento sem compromisso", description: "Fale comigo no WhatsApp.", price_optional: "Orçamento no WhatsApp" }];
  return updateTenantServices(tenant.id, list);
}

/** Traz para o catálogo os serviços que já estão no site. */
export async function importSiteServices(tenant: TenantRow): Promise<number> {
  const have = new Set((await listCatalog(tenant.id)).map((c) => norm(c.name)));
  let n = 0;
  for (const s of tenant.services || []) {
    if (!s.title || have.has(norm(s.title))) continue;
    const r = await createCatalogItem(tenant.id, {
      kind: "service",
      name: s.title.slice(0, 80),
      description: s.description ? s.description.slice(0, 200) : null,
      price_cents: priceTextToCents(s.price_optional),
      unit: null,
      show_on_site: true,
      revisit_days: null,
    });
    if (!("error" in r)) n++;
  }
  return n;
}
