export const RESERVED_SLUGS = new Set([
  "api", "app", "www", "dashboard", "painel", "criar", "admin", "login", "entrar", "cartaz", "o",
  "pagamento", "sitemap", "robots", "preco", "precos", "termos", "privacidade",
  "suporte", "ajuda", "blog", "mail", "ftp", "static", "assets", "_next",
]);

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
}

/** Gera slugs candidatos em ordem de preferência: nome, nome-cidade, nome-2, nome-3... */
export function slugCandidates(name: string, city: string): string[] {
  const base = slugify(name) || "meu-negocio";
  const citySlug = slugify(city.split("-")[0] || "");
  const list = [base];
  if (citySlug) list.push(`${base}-${citySlug}`.slice(0, 56));
  for (let i = 2; i <= 30; i++) list.push(`${base}-${i}`);
  return list.filter((s) => !RESERVED_SLUGS.has(s));
}
