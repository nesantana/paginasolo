import "server-only";
import fs from "fs/promises";
import os from "os";
import path from "path";
import type {
  TenantRow,
  AnalyticsEventRow,
  AnalyticsEventType,
  TenantLink,
} from "@/types/database.types";
import { getAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/editAuth";
import { slugCandidates } from "@/lib/slug";
import type { TenantInput, TenantExtras } from "@/lib/validate";
import { defaultFaq } from "@/lib/faqDefaults";

/**
 * Camada de dados do PáginaSolo.
 *  - Com Supabase configurado (URL + SERVICE_ROLE_KEY): tudo no Postgres.
 *  - Sem Supabase: arquivo JSON local (só para desenvolvimento; NÃO persiste na Vercel).
 *
 * Estados de `subscription_status`:
 *   draft     -> chat concluído, preview no ar com noindex, aguardando pagamento
 *   active    -> pago: indexável, entra no sitemap
 *   past_due  -> pagamento falhou/pausado: fora do ar
 *   cancelled -> assinatura cancelada: fora do ar
 */

export const DEMO_SLUG = "climatizacao-pantanal";

export type DailyMetricPoint = {
  date: string;
  label: string;
  pageviews: number;
  whatsappClicks: number;
};

export type TenantDashboardSummary = {
  tenant: TenantRow;
  allTenants: TenantRow[];
  metrics: {
    monthlyPageviews: number;
    monthlyWhatsappClicks: number;
    conversionRate: number;
    dailySeries: DailyMetricPoint[];
  };
};

/** Remove campos sensíveis antes de qualquer dado ir para o navegador. */
export function toPublicTenant(t: TenantRow): TenantRow {
  return {
    ...t,
    edit_token_hash: null,
    payer_email: null,
    mp_preapproval_id: null,
  };
}

export const isPublished = (t: TenantRow) =>
  t.is_active && t.subscription_status === "active";

// ---------------------------------------------------------------------------
// Armazenamento local (dev)
// ---------------------------------------------------------------------------
type LocalStoreSchema = {
  tenants: TenantRow[];
  events: AnalyticsEventRow[];
  updatedAt: string;
};

const DEMO_ID = "11111111-2222-3333-4444-555555555555";
const nowIso = () => new Date().toISOString();

const baseRow = (): Pick<
  TenantRow,
  | "owner_id" | "custom_domain" | "edit_token_hash" | "payer_email"
  | "mp_preapproval_id" | "meta_pixel_id" | "google_tag_id" | "images"
  | "faq" | "testimonials" | "offer_text" | "google_reviews_url" | "links"
> => ({
  owner_id: null,
  custom_domain: null,
  edit_token_hash: null,
  payer_email: null,
  mp_preapproval_id: null,
  meta_pixel_id: null,
  google_tag_id: null,
  images: [],
  faq: [],
  testimonials: [],
  offer_text: null,
  google_reviews_url: null,
  links: [],
});

const DEMO_TENANT: TenantRow = {
  ...baseRow(),
  id: DEMO_ID,
  slug: DEMO_SLUG,
  business_name: "Pantanal Climatização & Ar-Condicionado",
  category: "Instalação e Manutenção de Ar-Condicionado",
  city: "Campo Grande - MS",
  whatsapp_number: "5567981513750",
  address: "Av. Afonso Pena, 3500 - Centro, Campo Grande - MS",
  opening_hours: "Segunda a Sábado: 07h30 às 18h30 • Plantão de Emergência",
  headline:
    "Instalação, Higienização e Conserto de Ar-Condicionado em Campo Grande com Garantia de 90 Dias.",
  description:
    "Atendimento rápido no mesmo dia para residências, clínicas e empresas em toda Campo Grande - MS. Técnicos certificados, ferramental com bomba de vácuo e nota fiscal.",
  primary_color: "#FF6600",
  services: [
    {
      title: "Instalação de Split e Inverter (9.000 a 60.000 BTUs)",
      description:
        "Instalação seguindo normas do fabricante para manter a garantia de fábrica, com tubulação de cobre e teste de estanqueidade.",
      price_optional: "A partir de R$ 420",
    },
    {
      title: "Higienização Profunda + Bactericida Hospitalar",
      description:
        "Elimina fungos, ácaros, mau cheiro e reduz o consumo de energia elétrica em até 30%.",
      price_optional: "R$ 160",
    },
    {
      title: "Manutenção Corretiva & Recarga de Gás Refrigerante",
      description:
        "Diagnóstico preciso para aparelhos que pararam de gelar, vazamento de água ou erro no painel.",
      price_optional: "Visita Técnica no Mesmo Dia",
    },
    {
      title: "Contrato PMOC para Clínicas e Comércios",
      description:
        "Plano de Manutenção, Operação e Controle exigido pela Vigilância Sanitária com emissão de ART.",
      price_optional: "Sob Consulta",
    },
  ],
  logo_url: null,
  is_active: true,
  subscription_status: "active",
  published_at: nowIso(),
  created_at: nowIso(),
  updated_at: nowIso(),
};

const DATA_DIR = path.join(process.cwd(), "data");
const LOCAL_FILE = path.join(DATA_DIR, "paginasolo.json");
const TMP_FILE = path.join(os.tmpdir(), "paginasolo-db.json");

declare global {
  // eslint-disable-next-line no-var
  var __paginaSoloMemStore: LocalStoreSchema | undefined;
}

async function readLocalStore(): Promise<LocalStoreSchema> {
  for (const file of [LOCAL_FILE, TMP_FILE]) {
    try {
      const raw = await fs.readFile(/*turbopackIgnore: true*/ file, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.tenants)) {
        // migra registros antigos (sem os campos novos)
        parsed.tenants = parsed.tenants.map((t: TenantRow) => ({
          ...baseRow(),
          ...t,
          published_at: t.published_at ?? null,
        }));
        globalThis.__paginaSoloMemStore = parsed;
        return parsed;
      }
    } catch {
      // ignora
    }
  }
  if (globalThis.__paginaSoloMemStore) return globalThis.__paginaSoloMemStore;

  const initial: LocalStoreSchema = {
    tenants: [DEMO_TENANT],
    events: [],
    updatedAt: nowIso(),
  };
  globalThis.__paginaSoloMemStore = initial;
  return initial;
}

async function writeLocalStore(store: LocalStoreSchema): Promise<void> {
  store.updatedAt = nowIso();
  globalThis.__paginaSoloMemStore = store;
  const serialized = JSON.stringify(store, null, 2);
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(LOCAL_FILE, serialized, "utf-8");
  } catch {
    // serverless: segue só em memória/tmp
  }
  try {
    await fs.writeFile(TMP_FILE, serialized, "utf-8");
  } catch {
    // ignora
  }
}

// ---------------------------------------------------------------------------
// Primitivas (uma implementação por backend)
// ---------------------------------------------------------------------------
type Lookup =
  | { by: "slug"; value: string }
  | { by: "id"; value: string }
  | { by: "token"; value: string }
  | { by: "preapproval"; value: string };

async function findTenant(q: Lookup): Promise<TenantRow | null> {
  if (isAdminConfigured()) {
    const col = {
      slug: "slug",
      id: "id",
      token: "edit_token_hash",
      preapproval: "mp_preapproval_id",
    }[q.by];
    const value = q.by === "token" ? hashToken(q.value) : q.value;
    const { data, error } = await getAdminClient()
      .from("tenants")
      .select("*")
      .eq(col, value)
      .maybeSingle();
    if (error) throw new Error(`Supabase: ${error.message}`);
    if (data) return data as unknown as TenantRow;
    if (q.by === "slug" && q.value === DEMO_SLUG) return DEMO_TENANT;
    return null;
  }

  const store = await readLocalStore();
  return (
    store.tenants.find((t) => {
      if (q.by === "slug") return t.slug === q.value;
      if (q.by === "id") return t.id === q.value;
      if (q.by === "token")
        return t.edit_token_hash === hashToken(q.value);
      return t.mp_preapproval_id === q.value;
    }) || null
  );
}

async function slugExists(slug: string): Promise<boolean> {
  if (slug === DEMO_SLUG) return true;
  if (isAdminConfigured()) {
    const { data } = await getAdminClient()
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    return Boolean(data);
  }
  const store = await readLocalStore();
  return store.tenants.some((t) => t.slug === slug);
}

async function insertTenant(row: TenantRow): Promise<TenantRow> {
  if (isAdminConfigured()) {
    const { data, error } = await getAdminClient()
      .from("tenants")
      .insert(row)
      .select("*")
      .single();
    if (error) throw new Error(`Supabase: ${error.message}`);
    return data as unknown as TenantRow;
  }
  const store = await readLocalStore();
  store.tenants.unshift(row);
  await writeLocalStore(store);
  return row;
}

async function patchTenant(
  id: string,
  patch: Partial<TenantRow>
): Promise<TenantRow | null> {
  const next = { ...patch, updated_at: nowIso() };
  if (isAdminConfigured()) {
    const { data, error } = await getAdminClient()
      .from("tenants")
      .update(next)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(`Supabase: ${error.message}`);
    return (data as unknown as TenantRow) || null;
  }
  const store = await readLocalStore();
  const idx = store.tenants.findIndex((t) => t.id === id);
  if (idx < 0) return null;
  store.tenants[idx] = { ...store.tenants[idx], ...next };
  await writeLocalStore(store);
  return store.tenants[idx];
}

// ---------------------------------------------------------------------------
// API pública da camada
// ---------------------------------------------------------------------------

/** Para a página pública. Inclui rascunhos (preview); quem decide noindex é a página. */
export async function getTenantBySlug(slug: string): Promise<TenantRow | null> {
  const t = await findTenant({ by: "slug", value: slug.toLowerCase().trim() });
  if (!t || !t.is_active) return null;
  if (t.subscription_status === "past_due" || t.subscription_status === "cancelled")
    return null;
  return t;
}

export const getTenantByToken = (token: string) =>
  findTenant({ by: "token", value: token });

export const getTenantByPreapproval = (id: string) =>
  findTenant({ by: "preapproval", value: id });

/** Recuperação de acesso: o site mais recente cujo e-mail de cadastro bate. */
export async function getLatestTenantByEmail(email: string): Promise<TenantRow | null> {
  const e = email.trim().toLowerCase();
  if (!e) return null;
  if (isAdminConfigured()) {
    const { data, error } = await getAdminClient()
      .from("tenants")
      .select("*")
      .eq("payer_email", e)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`Supabase: ${error.message}`);
    return (data as unknown as TenantRow) || null;
  }
  const store = await readLocalStore();
  return store.tenants.find((t) => t.payer_email === e) || null;
}

/** Troca o token de edição (o antigo deixa de valer). */
export const rotateEditToken = (id: string, token: string) =>
  patchTenant(id, { edit_token_hash: hashToken(token) });

export const getTenantById = (id: string) => findTenant({ by: "id", value: id });

/** Só sites pagos (home, sitemap). */
export async function listPublishedTenants(): Promise<TenantRow[]> {
  if (isAdminConfigured()) {
    const { data } = await getAdminClient()
      .from("tenants")
      .select("slug, business_name, category, city, updated_at, id, is_active, subscription_status")
      .eq("is_active", true)
      .eq("subscription_status", "active")
      .order("created_at", { ascending: false })
      .limit(5000);
    const rows = (data || []) as unknown as TenantRow[];
    return rows.some((r) => r.slug === DEMO_SLUG) ? rows : [...rows, DEMO_TENANT];
  }
  const store = await readLocalStore();
  return store.tenants.filter(isPublished);
}

/** Cria o rascunho e devolve o token de edição em texto puro (só existe aqui, uma vez). */
export async function createDraftTenant(
  input: TenantInput,
  token: string
): Promise<TenantRow> {
  let slug = "";
  for (const candidate of slugCandidates(input.business_name, input.city)) {
    if (!(await slugExists(candidate))) {
      slug = candidate;
      break;
    }
  }
  if (!slug) slug = `site-${crypto.randomUUID().slice(0, 8)}`;

  const row: TenantRow = {
    ...baseRow(),
    id: crypto.randomUUID(),
    slug,
    business_name: input.business_name,
    category: input.category,
    city: input.city,
    whatsapp_number: input.whatsapp_number,
    address: input.address,
    opening_hours: input.opening_hours,
    headline: input.headline,
    description: input.description,
    primary_color: input.primary_color,
    services: input.services,
    logo_url: input.logo_url,
    payer_email: input.payer_email,
    meta_pixel_id: input.meta_pixel_id,
    google_tag_id: input.google_tag_id,
    faq: defaultFaq(input),
    edit_token_hash: hashToken(token),
    is_active: true,
    subscription_status: "draft",
    published_at: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  return insertTenant(row);
}

/** Edição pelo dono (já autenticado por token). Slug, status e pagamento nunca mudam aqui. */
export async function updateTenantContent(
  id: string,
  input: TenantInput
): Promise<TenantRow | null> {
  return patchTenant(id, {
    business_name: input.business_name,
    category: input.category,
    city: input.city,
    whatsapp_number: input.whatsapp_number,
    address: input.address,
    opening_hours: input.opening_hours,
    headline: input.headline,
    description: input.description,
    primary_color: input.primary_color,
    services: input.services,
    logo_url: input.logo_url,
    meta_pixel_id: input.meta_pixel_id,
    google_tag_id: input.google_tag_id,
  });
}

/** Galeria, depoimentos, FAQ e oferta (edição pelo dono já autenticado). */
export async function updateTenantExtras(
  id: string,
  extras: TenantExtras
): Promise<TenantRow | null> {
  return patchTenant(id, extras);
}

/** Página de links (edição pelo dono já autenticado). */
export async function updateTenantLinks(
  id: string,
  links: TenantLink[]
): Promise<TenantRow | null> {
  return patchTenant(id, { links });
}

export async function setPayerAndPreapproval(
  id: string,
  payerEmail: string,
  preapprovalId: string
) {
  return patchTenant(id, {
    payer_email: payerEmail,
    mp_preapproval_id: preapprovalId,
  });
}

/** Chamado pelo webhook do Mercado Pago, depois de consultar o status na API do MP. */
export async function applySubscriptionStatus(
  id: string,
  mpStatus: string
): Promise<TenantRow | null> {
  const current = await findTenant({ by: "id", value: id });
  if (!current) return null;

  if (mpStatus === "authorized") {
    return patchTenant(id, {
      subscription_status: "active",
      published_at: current.published_at || nowIso(),
    });
  }
  if (mpStatus === "paused") return patchTenant(id, { subscription_status: "past_due" });
  if (mpStatus === "cancelled")
    return patchTenant(id, { subscription_status: "cancelled" });
  return current; // "pending" etc.: nada muda
}

export async function recordAnalyticsEvent(input: {
  tenantId: string;
  eventType: AnalyticsEventType;
  referrer?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const row = {
    tenant_id: input.tenantId,
    event_type: input.eventType,
    referrer: input.referrer?.slice(0, 300) || null,
    user_agent: input.userAgent?.slice(0, 300) || null,
  };

  if (isAdminConfigured()) {
    // O FK garante que só tenants reais recebem eventos.
    await getAdminClient().from("analytics_events").insert(row);
    return;
  }

  const store = await readLocalStore();
  if (!store.tenants.some((t) => t.id === input.tenantId)) return;
  store.events.unshift({
    id: crypto.randomUUID(),
    ...row,
    created_at: nowIso(),
  });
  store.events = store.events.slice(0, 20000);
  await writeLocalStore(store);
}

export async function getDashboardSummary(
  tenant: TenantRow
): Promise<TenantDashboardSummary> {
  const since = new Date(Date.now() - 30 * 86400000);
  let events: { event_type: string; created_at: string }[] = [];

  if (isAdminConfigured()) {
    const { data } = await getAdminClient()
      .from("analytics_events")
      .select("event_type, created_at")
      .eq("tenant_id", tenant.id)
      .gte("created_at", since.toISOString())
      .limit(50000);
    events = data || [];
  } else {
    const store = await readLocalStore();
    events = store.events.filter(
      (e) => e.tenant_id === tenant.id && new Date(e.created_at) >= since
    );
  }

  const monthlyPageviews = events.filter((e) => e.event_type === "pageview").length;
  const monthlyWhatsappClicks = events.filter(
    (e) => e.event_type === "click_whatsapp"
  ).length;
  const conversionRate =
    monthlyPageviews > 0
      ? Number(((monthlyWhatsappClicks / monthlyPageviews) * 100).toFixed(1))
      : 0;

  const dailyMap = new Map<string, { pageviews: number; whatsappClicks: number }>();
  for (let i = 29; i >= 0; i--) {
    const key = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    dailyMap.set(key, { pageviews: 0, whatsappClicks: 0 });
  }
  for (const ev of events) {
    const entry = dailyMap.get(ev.created_at.slice(0, 10));
    if (!entry) continue;
    if (ev.event_type === "pageview") entry.pageviews++;
    if (ev.event_type === "click_whatsapp") entry.whatsappClicks++;
  }

  const dailySeries: DailyMetricPoint[] = Array.from(dailyMap.entries()).map(
    ([date, c]) => {
      const [, m, d] = date.split("-");
      return { date, label: `${d}/${m}`, pageviews: c.pageviews, whatsappClicks: c.whatsappClicks };
    }
  );

  const safe = toPublicTenant(tenant);
  return {
    tenant: safe,
    allTenants: [safe],
    metrics: { monthlyPageviews, monthlyWhatsappClicks, conversionRate, dailySeries },
  };
}
