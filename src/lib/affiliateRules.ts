/** Regras do programa de indicação. Sem dependência de servidor: usável no navegador. */
export const DEFAULT_RATE = 30; // % do primeiro pagamento (o admin ajusta por afiliado)
export const MIN_PAYOUT = 50; // saldo mínimo para pedir saque (R$)
export const HOLD_DAYS = 30; // carência até a comissão liberar (prazo de estornos)
export const REF_CODE_RE = /^[a-z0-9-]{3,30}$/;

export const PIX_TYPES = ["cpf", "cnpj", "email", "telefone", "aleatoria"] as const;
export type PixKeyType = (typeof PIX_TYPES)[number];

export const PIX_TYPE_LABEL: Record<PixKeyType, string> = {
  cpf: "CPF",
  cnpj: "CNPJ",
  email: "E-mail",
  telefone: "Telefone",
  aleatoria: "Chave aleatória",
};

/** Texto da regra de comissão de um afiliado, para mostrar a ele e ao admin. */
export function ruleText(rate: number, maxPayments: number | null): string {
  if (maxPayments === 1) return `${rate}% do primeiro pagamento de cada indicado`;
  if (maxPayments) return `${rate}% de cada pagamento, nos primeiros ${maxPayments} de cada indicado`;
  return `${rate}% de todos os pagamentos de cada indicado`;
}
