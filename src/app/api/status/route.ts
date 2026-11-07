import { NextResponse } from "next/server";
import { getTenantBySlug } from "@/lib/tenantStore";

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("s") || "";
  const t = await getTenantBySlug(slug);
  return NextResponse.json(
    { status: t?.subscription_status ?? "unknown" },
    { headers: { "Cache-Control": "no-store" } }
  );
}
