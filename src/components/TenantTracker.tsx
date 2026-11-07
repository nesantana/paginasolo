"use client";

import { useEffect } from "react";
import type { AnalyticsEventType } from "@/types/database.types";

export function sendTrackEvent(
  tenantId: string,
  eventType: AnalyticsEventType
) {
  try {
    const payload = JSON.stringify({
      tenantId,
      eventType,
      referrer: typeof document !== "undefined" ? document.referrer : null,
    });

    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/track", blob);
      return;
    }

    fetch("/api/track", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: payload,
    }).catch(() => {});
  } catch {
    // non-blocking
  }
}

export function PageviewBeacon({ tenantId }: { tenantId: string }) {
  useEffect(() => {
    sendTrackEvent(tenantId, "pageview");
  }, [tenantId]);

  return null;
}

type TrackedAnchorProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  tenantId: string;
  eventType: AnalyticsEventType;
};

export function TrackedLink({
  tenantId,
  eventType,
  children,
  onClick,
  ...rest
}: TrackedAnchorProps) {
  return (
    <a
      {...rest}
      onClick={(e) => {
        sendTrackEvent(tenantId, eventType);
        onClick?.(e);
      }}
    >
      {children}
    </a>
  );
}
