import "server-only";
import type { TenantRow } from "@/types/database.types";
import type { AppointmentRow } from "@/types/finance";
import { appointmentsBetween, claimDigest, openPaymentsDueUntil, releaseDigest } from "@/lib/agendaStore";
import { sendEmail, type MailResult } from "@/lib/mailer";
import { formatBRL, formatDateBR } from "@/lib/quoteUi";

const TZ_BY_UF: Record<string, string> = {
  AC: "America/Rio_Branco", AM: "America/Manaus", RO: "America/Porto_Velho",
  RR: "America/Boa_Vista", MT: "America/Cuiaba", MS: "America/Campo_Grande",
};

/** Fuso do dono, pela UF no fim da cidade ("Campo Grande - MS"). Padrão: Brasília. */
export function tenantTimeZone(city: string): string {
  const m = city.match(/[-,/]\s*([A-Za-z]{2})\s*$/);
  return (m && TZ_BY_UF[m[1].toUpperCase()]) || "America/Sao_Paulo";
}

/** Data de hoje (YYYY-MM-DD) no fuso informado. */
export function todayIn(tz: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : "");

type PayItem = Awaited<ReturnType<typeof openPaymentsDueUntil>>[number];

function apptLine(a: AppointmentRow) {
  const when = hhmm(a.start_time) || "Horário a combinar";
  return { when, a };
}

export function buildDigest(opts: {
  tenant: Pick<TenantRow, "business_name">;
  today: string;
  appointmentsToday: AppointmentRow[];
  appointmentsTomorrow: AppointmentRow[];
  payments: PayItem[];
  panelUrl: string;
}) {
  const { today, appointmentsToday, appointmentsTomorrow, payments } = opts;
  const overdue = payments.filter((p) => p.due_date < today);
  const dueToday = payments.filter((p) => p.due_date === today);

  const subjectParts: string[] = [];
  if (appointmentsToday.length) subjectParts.push(`${appointmentsToday.length} serviço${appointmentsToday.length > 1 ? "s" : ""} hoje`);
  if (dueToday.length + overdue.length) subjectParts.push(`${dueToday.length + overdue.length} cobrança${dueToday.length + overdue.length > 1 ? "s" : ""}`);
  const subject = `Sua agenda de hoje: ${subjectParts.join(" e ")}`;

  // ----- texto simples -----
  const t: string[] = [`Bom dia! Seu dia, ${formatDateBR(today)}:`, ""];
  if (appointmentsToday.length) {
    t.push("SERVIÇOS DE HOJE");
    for (const { when, a } of appointmentsToday.map(apptLine)) {
      t.push(`- ${when} · ${a.customer_name} · ${a.title}${a.address ? ` · ${a.address}` : ""}${a.customer_phone ? ` · ${a.customer_phone}` : ""}`);
      if (a.notes) t.push(`  Obs.: ${a.notes}`);
    }
    t.push("");
  }
  if (overdue.length || dueToday.length) {
    t.push("PAGAMENTOS");
    for (const p of [...overdue, ...dueToday]) {
      t.push(`- ${p.customer_name}: ${p.label} ${formatBRL(p.amount_cents)} ${p.due_date < today ? `(atrasado desde ${formatDateBR(p.due_date)})` : "(vence hoje)"}`);
    }
    t.push("");
  }
  if (appointmentsTomorrow.length) {
    t.push("AMANHÃ");
    for (const { when, a } of appointmentsTomorrow.map(apptLine)) t.push(`- ${when} · ${a.customer_name} · ${a.title}`);
    t.push("");
  }
  t.push(`Abrir meu painel: ${opts.panelUrl}`);
  const text = t.join("\n");

  // ----- HTML (tudo que vem do usuário passa por esc) -----
  const row = (left: string, right: string, sub = "") =>
    `<tr><td style="padding:12px 0;border-bottom:1px solid #e2e8f0;font-family:Arial,Helvetica,sans-serif;">` +
    `<div style="font-size:15px;font-weight:700;color:#0f172a;">${left}</div>` +
    (sub ? `<div style="font-size:13px;color:#64748b;margin-top:2px;">${sub}</div>` : "") +
    `</td><td align="right" style="padding:12px 0 12px 12px;border-bottom:1px solid #e2e8f0;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#0f172a;white-space:nowrap;vertical-align:top;">${right}</td></tr>`;
  const section = (title: string, rows: string) =>
    `<h2 style="margin:26px 0 4px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#3b82f6;font-family:Arial,Helvetica,sans-serif;">${title}</h2>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;

  let body = "";
  if (appointmentsToday.length) {
    body += section(
      "Serviços de hoje",
      appointmentsToday
        .map(apptLine)
        .map(({ when, a }) =>
          row(
            `${esc(a.customer_name)} · ${esc(a.title)}`,
            esc(when),
            [a.address && esc(a.address), a.customer_phone && esc(a.customer_phone), a.notes && `Obs.: ${esc(a.notes)}`].filter(Boolean).join("<br>")
          )
        )
        .join("")
    );
  }
  if (overdue.length || dueToday.length) {
    body += section(
      "Pagamentos",
      [...overdue, ...dueToday]
        .map((p) =>
          row(
            `${esc(p.customer_name)} · ${esc(p.label)}`,
            esc(formatBRL(p.amount_cents)),
            p.due_date < today ? `<span style="color:#dc2626;">Atrasado desde ${formatDateBR(p.due_date)}</span>` : "Vence hoje"
          )
        )
        .join("")
    );
  }
  if (appointmentsTomorrow.length) {
    body += section(
      "Amanhã",
      appointmentsTomorrow
        .map(apptLine)
        .map(({ when, a }) => row(`${esc(a.customer_name)} · ${esc(a.title)}`, esc(when)))
        .join("")
    );
  }

  const html =
    `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(subject)}</title></head>` +
    `<body style="margin:0;padding:0;background:#eef2f7;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:32px 12px;"><tr><td align="center">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">` +
    `<tr><td style="background:#0a0e17;border-radius:20px 20px 0 0;padding:26px 32px;font-family:Arial,Helvetica,sans-serif;">` +
    `<div style="font-size:22px;font-weight:800;color:#ffffff;">meu<span style="color:#67e8f9;">site</span>novo</div>` +
    `<div style="height:4px;width:56px;background:#3b82f6;background-image:linear-gradient(90deg,#06b6d4,#3b82f6,#8b5cf6);border-radius:4px;margin-top:14px;"></div></td></tr>` +
    `<tr><td style="background:#ffffff;padding:30px 32px 8px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">` +
    `<h1 style="margin:0;font-size:24px;line-height:1.25;font-weight:800;">Bom dia! Seu dia de hoje 👷</h1>` +
    `<p style="margin:8px 0 0;font-size:14px;color:#64748b;">${formatDateBR(today)} · ${esc(opts.tenant.business_name)}</p>${body}</td></tr>` +
    `<tr><td style="background:#ffffff;padding:22px 32px 32px;font-family:Arial,Helvetica,sans-serif;">` +
    `<a href="${esc(opts.panelUrl)}" style="display:block;background:#3b82f6;background-image:linear-gradient(110deg,#06b6d4,#3b82f6 50%,#8b5cf6);border-radius:14px;padding:15px 24px;font-size:16px;font-weight:800;color:#ffffff;text-decoration:none;text-align:center;">Abrir meu painel</a></td></tr>` +
    `<tr><td style="background:#0a0e17;border-radius:0 0 20px 20px;padding:18px 32px;font-family:Arial,Helvetica,sans-serif;text-align:center;font-size:12px;color:#94a3b8;">Você recebe este resumo nos dias em que tem serviço ou cobrança.</td></tr>` +
    `</table></td></tr></table></body></html>`;

  return { subject, html, text, hasContent: appointmentsToday.length + overdue.length + dueToday.length > 0 };
}

export type DigestOutcome = "sent" | "empty" | "already_sent" | "no_email" | MailResult;

/** Monta e envia o resumo do dia de um dono. Não repete no mesmo dia (a menos que `force`). */
export async function sendDigestFor(
  tenant: TenantRow,
  opts: { origin: string; force?: boolean; now?: Date }
): Promise<DigestOutcome> {
  if (!tenant.payer_email) return "no_email";
  const tz = tenantTimeZone(tenant.city);
  const today = todayIn(tz, opts.now);
  const tomorrow = addDays(today, 1);

  const [todayList, tomorrowList, payments] = await Promise.all([
    appointmentsBetween(tenant.id, today, today),
    appointmentsBetween(tenant.id, tomorrow, tomorrow),
    openPaymentsDueUntil(tenant.id, today),
  ]);
  const digest = buildDigest({
    tenant,
    today,
    appointmentsToday: todayList,
    appointmentsTomorrow: tomorrowList,
    payments,
    panelUrl: `${opts.origin}/dashboard/agenda`,
  });
  if (!digest.hasContent) return "empty";

  if (!opts.force && !(await claimDigest(tenant.id, today))) return "already_sent";
  const res = await sendEmail({ to: tenant.payer_email, subject: digest.subject, html: digest.html, text: digest.text });
  if (!res.ok) {
    if (!opts.force) await releaseDigest(tenant.id, today); // permite nova tentativa
    return res;
  }
  return "sent";
}
