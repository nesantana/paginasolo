import type { MetadataRoute } from "next";
import { listPublishedTenants } from "@/lib/tenantStore";
import { SITE_URL } from "@/lib/siteUrl";

const BASE = SITE_URL;

export const revalidate = 3600;

/** Todo site ativo entra no sitemap (o site é grátis). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tenants = await listPublishedTenants();
  return [
    { url: BASE, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/criar`, changeFrequency: "monthly", priority: 0.8 },
    ...tenants.map((t) => ({
      url: `${BASE}/${t.slug}`,
      lastModified: t.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
