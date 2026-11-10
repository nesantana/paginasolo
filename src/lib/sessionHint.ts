/**
 * Marcador de "tem sessão" legível pelo navegador. NÃO autoriza nada: o acesso de verdade
 * continua nos cookies httpOnly (ps_edit / ps_admin). Serve só para a interface decidir
 * entre "Entrar" e "Gerenciar meu site" sem tornar as páginas públicas dinâmicas.
 * Valores: "o" = dono de site, "a" = admin, "b" = admin que também tem site (os dois).
 */
export const HINT_COOKIE = "ps_in";

export const hintCookieOptions = (maxAgeSeconds: number) => ({
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: maxAgeSeconds,
});

export const OWNER_HINT_MAX_AGE = 60 * 60 * 24 * 365;

/** Junta o que já existe com o que acabou de entrar: admin + dono vira "b". */
export function mergeHint(current: string | undefined, adding: "o" | "a"): "o" | "a" | "b" {
  if (current === "b") return "b";
  if ((current === "a" && adding === "o") || (current === "o" && adding === "a")) return "b";
  return adding;
}
export const ADMIN_HINT_MAX_AGE = 12 * 60 * 60;
