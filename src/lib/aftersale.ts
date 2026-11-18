import type { ContractRow } from "@/types/finance";
import type { CatalogItem } from "@/types/catalog";
import { diffDays } from "@/lib/quoteUi";

export type AfterSale = {
  kind: "post" | "revisit";
  days: number;
  title: string;
  text: string;
  message: string;
};

const norm = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const first = (n: string) => n.trim().split(/\s+/)[0] || n;

/** Pós-venda sai 2 dias depois do serviço concluído; a revisão, no prazo do item do catálogo. */
export const POST_SALE_AFTER_DAYS = 2;

/** Itens do catálogo citados no contrato (pelo nome). */
export function catalogMatches(c: Pick<ContractRow, "title" | "scope">, catalog: CatalogItem[]): CatalogItem[] {
  const hay = norm(`${c.title} ${c.scope || ""}`);
  return catalog.filter((i) => i.name.length >= 3 && hay.includes(norm(i.name)));
}

export function afterSaleFor(
  c: Pick<ContractRow, "status" | "completed_at" | "customer_name" | "title" | "scope" | "aftersale_done_at" | "revisit_done_at">,
  catalog: CatalogItem[],
  business: string,
  today: string
): AfterSale | null {
  if (c.status !== "completed" || !c.completed_at) return null;
  const d = diffDays(c.completed_at.slice(0, 10), today);
  const name = first(c.customer_name);
  const service = c.title.length > 60 ? `${c.title.slice(0, 57)}...` : c.title;

  if (!c.aftersale_done_at && d >= POST_SALE_AFTER_DAYS && d <= 45) {
    return {
      kind: "post",
      days: d,
      title: `Pós-venda: pergunte se ficou tudo certo com ${name}`,
      text: "Um contato curto depois do serviço gera confiança, avaliação e indicação.",
      message: `Olá, ${name}! Tudo bem? Aqui é da ${business}. Passando para saber se ficou tudo certo com o serviço (${service}). Se tiver qualquer detalhe, é só me falar. E se gostou, me ajuda indicando para um amigo? Fico muito grato! 🙏`,
    };
  }

  const days = catalogMatches(c, catalog)
    .map((i) => i.revisit_days)
    .filter((n): n is number => typeof n === "number" && n > 0);
  if (days.length && !c.revisit_done_at) {
    const when = Math.min(...days);
    if (d >= when && d <= when + 180) {
      const months = d >= 330 ? "1 ano" : `${Math.max(1, Math.round(d / 30))} ${Math.round(d / 30) > 1 ? "meses" : "mês"}`;
      return {
        kind: "revisit",
        days: d,
        title: `Hora de rever ${name}`,
        text: `Faz ${months} do serviço. Esse tipo de serviço pede uma revisão: ofereça uma visita.`,
        message: `Olá, ${name}! Aqui é da ${business}. Já faz uns ${months} desde o serviço (${service}). Vale uma revisão para garantir que está tudo certo. Quer que eu marque uma visita?`,
      };
    }
  }
  return null;
}
