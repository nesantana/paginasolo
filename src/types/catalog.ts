export type CatalogItem = {
  id: string;
  kind: "service" | "product";
  name: string;
  description: string | null;
  price_cents: number;
  unit: string | null;
  active: boolean;
  /** Aparece na lista de serviços do site público. */
  show_on_site: boolean;
  /** Dias depois do serviço para voltar a falar com o cliente (manutenção/revisão). */
  revisit_days: number | null;
};
