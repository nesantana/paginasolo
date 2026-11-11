import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteUrl";

const BASE = SITE_URL;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard", "/pagamento/", "/admin", "/c/", "/o/"] },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
