import "server-only";
import nodemailer from "nodemailer";

/**
 * Envio de e-mail transacional. Dois jeitos (o primeiro configurado vence):
 *  1) SMTP/Gmail: GMAIL_USER + GMAIL_APP_PASSWORD (senha de app de 16 letras, NÃO a senha do Google).
 *     Opcional: MAIL_FROM. Limite do Gmail: ~500 e-mails/dia.
 *  2) Resend: RESEND_API_KEY (+ MAIL_FROM com domínio verificado).
 * Sem nenhum configurado o envio é ignorado e o chamador recebe `not_configured`.
 */
const gmailUser = () => process.env.GMAIL_USER?.trim() || "";
const gmailPass = () => (process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "");

export const mailConfigured = () =>
  Boolean((gmailUser() && gmailPass()) || process.env.RESEND_API_KEY);

export type MailResult = { ok: true } | { ok: false; reason: "not_configured" | "failed"; detail?: string };

type Mail = { to: string; subject: string; html: string; text: string };

async function viaGmail(m: Mail): Promise<MailResult> {
  const user = gmailUser();
  try {
    const transport = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass: gmailPass() },
    });
    await transport.sendMail({
      from: process.env.MAIL_FROM || `Meu Site Novo <${user}>`,
      to: m.to,
      subject: m.subject,
      html: m.html,
      text: m.text,
    });
    return { ok: true };
  } catch (e) {
    const detail = e instanceof Error ? e.message.slice(0, 200) : "erro";
    console.error("mailer gmail:", detail);
    return { ok: false, reason: "failed", detail };
  }
}

async function viaResend(m: Mail): Promise<MailResult> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || "Meu Site Novo <onboarding@resend.dev>",
        to: [m.to],
        subject: m.subject,
        html: m.html,
        text: m.text,
      }),
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      console.error("mailer resend:", res.status, detail);
      return { ok: false, reason: "failed", detail };
    }
    return { ok: true };
  } catch (e) {
    console.error("mailer resend:", e);
    return { ok: false, reason: "failed" };
  }
}

export async function sendEmail(m: Mail): Promise<MailResult> {
  if (gmailUser() && gmailPass()) return viaGmail(m);
  if (process.env.RESEND_API_KEY) return viaResend(m);
  return { ok: false, reason: "not_configured" };
}
