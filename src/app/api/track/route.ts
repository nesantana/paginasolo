import { NextResponse } from "next/server";
import { recordAnalyticsEvent } from "@/lib/tenantStore";
import type { AnalyticsEventType } from "@/types/database.types";

const ALLOWED_EVENTS = new Set<AnalyticsEventType>([
  "pageview",
  "click_whatsapp",
  "click_call",
  "click_maps",
]);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const tenantId = String(body.tenantId || "").trim();
    const eventType = String(body.eventType || "") as AnalyticsEventType;

    if (!tenantId || !ALLOWED_EVENTS.has(eventType)) {
      return NextResponse.json(
        { ok: false, error: "Parâmetros inválidos" },
        { status: 400 }
      );
    }

    const userAgent = request.headers.get("user-agent");
    const referrer = body.referrer || request.headers.get("referer") || null;

    await recordAnalyticsEvent({
      tenantId,
      eventType,
      referrer,
      userAgent,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
