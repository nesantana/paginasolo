import "server-only";
import { after } from "next/server";
import * as webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient, isAdminConfigured } from "@/lib/supabase/admin";

/**
 * Notificações do dono do site: ficam no sino do painel e chegam como notificação do
 * navegador/celular (Web Push), mesmo com o painel fechado.
 * Env: NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.
 * Nenhuma função daqui lança erro: avisar é bônus e nunca pode quebrar o fluxo do cliente.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => getAdminClient() as unknown as SupabaseClient<any, "public", any>;

export type NotifyKind =
  | "quote_viewed"
  | "quote_accepted"
  | "contract_viewed"
  | "contract_signed"
  | "payment_informed"
  | "payment_due"
  | "followup"
  | "agenda"
  | "plan"
  | "referral";

export type NotifyInput = {
  kind: NotifyKind;
  title: string;
  body?: string;
  /** Caminho dentro do app que abre ao tocar na notificação. */
  url?: string;
};

export type NotificationRow = {
  id: string;
  kind: NotifyKind;
  title: string;
  body: string;
  url: string;
  read_at: string | null;
  created_at: string;
};

export const pushConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT
  );

let vapidReady = false;
function setupVapid(): boolean {
  if (!pushConfigured()) return false;
  if (!vapidReady) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT!,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );
    vapidReady = true;
  }
  return true;
}

type SubRow = { id: string; endpoint: string; p256dh: string; auth: string };

async function sendPush(tenantId: string, n: NotifyInput) {
  if (!setupVapid()) return;
  const { data } = await db()
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("tenant_id", tenantId);
  const subs = (data || []) as SubRow[];
  if (!subs.length) return;

  const payload = JSON.stringify({
    title: n.title,
    body: n.body || "",
    url: n.url || "/dashboard",
    tag: n.kind,
  });
  const dead: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: 60 * 60 * 24, urgency: "high" }
        );
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) dead.push(s.id); // aparelho desinstalou/revogou
        else console.error("push:", code || e);
      }
    })
  );
  if (dead.length) await db().from("push_subscriptions").delete().in("id", dead);
}

/** Grava no sino e dispara o push. Espera terminar (use em cron ou dentro de after). */
export async function notify(tenantId: string, n: NotifyInput): Promise<void> {
  if (!isAdminConfigured()) return;
  try {
    await db().from("notifications").insert({
      tenant_id: tenantId,
      kind: n.kind,
      title: n.title.slice(0, 120),
      body: (n.body || "").slice(0, 240),
      url: n.url || "/dashboard",
    });
    await sendPush(tenantId, n);
  } catch (e) {
    console.error("notify:", e);
  }
}

/** Dentro de uma rota: responde ao cliente primeiro e notifica depois (não atrasa o cliente). */
export function notifyAfter(tenantId: string, n: NotifyInput): void {
  try {
    after(() => notify(tenantId, n));
  } catch {
    void notify(tenantId, n); // fora de um request (ex.: script)
  }
}

// ---------------------------------------------------------------------------
// Sino e aparelhos
// ---------------------------------------------------------------------------
export async function listNotifications(tenantId: string, limit = 30) {
  if (!isAdminConfigured()) return { items: [] as NotificationRow[], unread: 0 };
  const [list, count] = await Promise.all([
    db()
      .from("notifications")
      .select("id, kind, title, body, url, read_at, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(limit),
    db()
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .is("read_at", null),
  ]);
  return { items: (list.data || []) as NotificationRow[], unread: count.count || 0 };
}

export async function markNotificationsRead(tenantId: string, id?: string) {
  if (!isAdminConfigured()) return;
  let q = db()
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .is("read_at", null);
  if (id) q = q.eq("id", id);
  await q;
}

export async function savePushSubscription(
  tenantId: string,
  sub: { endpoint: string; p256dh: string; auth: string },
  userAgent: string | null
): Promise<boolean> {
  if (!isAdminConfigured()) return false;
  const { error } = await db()
    .from("push_subscriptions")
    .upsert(
      { tenant_id: tenantId, ...sub, user_agent: userAgent?.slice(0, 200) || null },
      { onConflict: "endpoint" }
    );
  if (error) console.error("savePushSubscription:", error.message);
  return !error;
}

export async function removePushSubscription(tenantId: string, endpoint: string) {
  if (!isAdminConfigured()) return;
  await db().from("push_subscriptions").delete().eq("tenant_id", tenantId).eq("endpoint", endpoint);
}
