import "server-only";
import type { TenantRow } from "@/types/database.types";
import { appointmentsBetween, openPaymentsDueUntil } from "@/lib/agendaStore";
import { listQuotes } from "@/lib/quoteStore";
import { tenantTimeZone, todayIn } from "@/lib/digest";
import { followupState, formatBRL } from "@/lib/quoteUi";
import { notify } from "@/lib/notify";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Avisos do começo do dia (rodam no cron): serviços de hoje, cobranças para fazer,
 * clientes para chamar de volta e plano perto de vencer. Só avisa quando há algo a fazer.
 */
export async function notifyDailyFor(tenant: TenantRow, now = new Date()): Promise<number> {
  let sent = 0;
  const today = todayIn(tenantTimeZone(tenant.city), now);

  const [appts, payments, quotes] = await Promise.all([
    appointmentsBetween(tenant.id, today, today),
    openPaymentsDueUntil(tenant.id, today),
    listQuotes(tenant.id),
  ]);

  if (appts.length) {
    const first = appts.find((a) => a.start_time);
    await notify(tenant.id, {
      kind: "agenda",
      title: `Hoje: ${plural(appts.length, "serviço", "serviços")}`,
      body: first
        ? `O primeiro é às ${first.start_time!.slice(0, 5)}, com ${first.customer_name}.`
        : `Com ${appts[0].customer_name}${appts.length > 1 ? " e outros" : ""}.`,
      url: "/dashboard/agenda",
    });
    sent++;
  }

  // "informed" = o cliente disse que pagou: o dono só precisa conferir, não cobrar
  const toCharge = payments.filter((p) => p.status === "pending");
  if (toCharge.length) {
    const late = toCharge.filter((p) => p.due_date < today).length;
    const total = toCharge.reduce((s, p) => s + p.amount_cents, 0);
    await notify(tenant.id, {
      kind: "payment_due",
      title: late
        ? `${plural(toCharge.length, "cobrança", "cobranças")} (${late} atrasada${late > 1 ? "s" : ""})`
        : `${plural(toCharge.length, "cobrança vence", "cobranças vencem")} hoje`,
      body: `Aguardando pagamento: ${formatBRL(total)}.`,
      url: "/dashboard/clientes",
    });
    sent++;
  }

  const due = quotes.filter((q) => {
    const s = followupState(q, today);
    return s === "late" || s === "today";
  });
  if (due.length) {
    await notify(tenant.id, {
      kind: "followup",
      title: `${plural(due.length, "cliente", "clientes")} para chamar de volta`,
      body: due.length === 1 ? `${due[0].customer_name} está esperando retorno do orçamento.` : "Abra para ver a mensagem pronta de cada um.",
      url: "/dashboard/clientes",
    });
    sent++;
  }

  if (!tenant.complimentary && tenant.plan_expires_at) {
    const days = Math.ceil((new Date(tenant.plan_expires_at).getTime() - now.getTime()) / 86400000);
    if (days === 3 || days === 1 || days === 0) {
      await notify(tenant.id, {
        kind: "plan",
        title: days === 0 ? "Seu plano vence hoje" : `Seu plano vence em ${plural(days, "dia", "dias")}`,
        body: "Renove para não perder agenda, contratos e orçamentos.",
        url: "/dashboard",
      });
      sent++;
    }
  }
  return sent;
}
