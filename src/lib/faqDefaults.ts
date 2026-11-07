import type { TenantFaqItem } from "@/types/database.types";

/**
 * Perguntas frequentes iniciais, sem IA e sem custo. São genéricas de propósito
 * (não afirmam nada que o dono não tenha dito); o dono edita no painel.
 */
export function defaultFaq(input: {
  category: string;
  city: string;
  opening_hours?: string | null;
}): TenantFaqItem[] {
  const hours = input.opening_hours?.trim();
  return [
    {
      q: "Como peço um orçamento?",
      a: "É só chamar no WhatsApp e contar o que você precisa. Respondemos com valores e prazos, sem compromisso.",
    },
    {
      q: `Vocês atendem em ${input.city}?`,
      a: `Sim, atendemos ${input.city}. Se você estiver em outra região, chame no WhatsApp e confirmamos.`,
    },
    {
      q: "Qual o horário de atendimento?",
      a: hours || "Chame no WhatsApp para confirmar os horários disponíveis.",
    },
    {
      q: "Quais as formas de pagamento?",
      a: "Combinamos a forma de pagamento direto pelo WhatsApp, junto com o orçamento.",
    },
    {
      q: `Vocês trabalham com ${input.category.toLowerCase()}?`,
      a: "Sim, é a nossa especialidade. Veja a lista de serviços acima ou pergunte pelo WhatsApp.",
    },
  ];
}
