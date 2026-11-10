import "server-only";
import type { QuoteRow, TenantRow } from "@/types/database.types";
import type { AppointmentRow, ContractRow, ContractWithPayments } from "@/types/finance";
import {
  contractExistsForQuote,
  createContract,
  getContractForTenant,
  setContractStatus,
} from "@/lib/financeStore";
import {
  appointmentExistsForContract,
  createAppointment,
  openAppointmentsForContract,
} from "@/lib/agendaStore";
import { buildPlan } from "@/lib/contractUi";
import { formatBRL } from "@/lib/quoteUi";
import { tenantTimeZone, todayIn } from "@/lib/digest";

/**
 * Fluxo ligado do trabalho do autônomo:
 *   orçamento aceito  ->  contrato (rascunho, pronto para revisar e enviar)
 *   contrato aceito   ->  serviço na agenda (se já tem data de entrega)
 *   serviço concluído ->  contrato concluído (o saldo "na entrega" passa a vencer)
 * Cada passo é "melhor esforço": uma falha aqui nunca derruba a ação principal.
 */

/** Orçamento aceito pelo cliente vira contrato. Sem valor definido, deixa para o dono. */
export async function contractFromAcceptedQuote(
  quote: QuoteRow,
  tenant: TenantRow
): Promise<ContractWithPayments | null> {
  if (quote.total_cents <= 0) return null;
  if (await contractExistsForQuote(tenant.id, quote.id)) return null;

  const today = todayIn(tenantTimeZone(tenant.city));
  const title = quote.items.map((i) => i.title).join(", ").slice(0, 140) || "Serviço";
  const scope = quote.items
    .map((i) => `• ${i.qty > 1 ? `${i.qty}× ` : ""}${i.title}${i.price_cents > 0 ? `: ${formatBRL(i.price_cents * i.qty)}` : ""}`)
    .join("\n")
    .slice(0, 1500);

  // Forma de pagamento padrão (o dono troca antes de enviar): 50% de entrada e 50% na entrega.
  const payments = buildPlan(quote.total_cents, {
    upfrontPct: 50,
    balance: "completion",
    installments: 1,
    today,
  });

  return createContract(tenant.id, {
    quote_id: quote.id,
    title,
    scope,
    customer_name: quote.customer_name,
    customer_phone: quote.customer_phone,
    customer_doc: null,
    customer_address: null,
    total_cents: quote.total_cents,
    delivery_date: null,
    extra_terms: quote.notes,
    payments,
  });
}

/** Contrato aceito com data de entrega já combinada: coloca o serviço na agenda. */
export async function appointmentFromSignedContract(contract: ContractRow): Promise<AppointmentRow | null> {
  if (!contract.delivery_date) return null;
  if (await appointmentExistsForContract(contract.tenant_id, contract.id)) return null;
  return createAppointment(contract.tenant_id, {
    contract_id: contract.id,
    customer_name: contract.customer_name,
    customer_phone: contract.customer_phone,
    title: contract.title,
    address: contract.customer_address,
    notes: null,
    starts_on: contract.delivery_date,
    start_time: null,
    duration_min: 480,
  });
}

/**
 * Concluiu o último serviço do contrato? Então o contrato fica concluído e o
 * saldo "na entrega" passa a vencer hoje.
 */
export async function completeContractIfDone(tenantId: string, appointment: AppointmentRow): Promise<void> {
  if (!appointment.contract_id) return;
  if ((await openAppointmentsForContract(tenantId, appointment.contract_id)) > 0) return;
  const contract = await getContractForTenant(tenantId, appointment.contract_id);
  if (!contract || contract.status === "completed" || contract.status === "cancelled") return;
  await setContractStatus(tenantId, contract.id, "completed");
}
