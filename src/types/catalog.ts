export type CatalogItem = {
  id: string;
  kind: "service" | "product";
  name: string;
  description: string | null;
  price_cents: number;
  unit: string | null;
  active: boolean;
};
