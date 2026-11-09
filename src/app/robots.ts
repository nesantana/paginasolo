import type { MetadataRoute } from "next";

const BASE = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3004").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard", "/pagamento/", "/admin"] },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
