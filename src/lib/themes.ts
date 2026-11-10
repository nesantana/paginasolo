/**
 * Temas do site público. Cada um muda cores, tipografia, formato do topo,
 * dos serviços e os textos de apoio. A cor da marca do cliente continua valendo.
 * Sem "server-only": o painel usa estes dados para mostrar as miniaturas.
 */
export const THEME_IDS = ["moderno", "clinica", "restaurante", "servicos", "beleza"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export type Theme = {
  id: ThemeId;
  name: string;
  bestFor: string;
  /** Miniatura no seletor: fundo, superfície e cor de destaque padrão. */
  swatch: { bg: string; surface: string; accent: string; text: string };
  dark: boolean;
  /** Classes do container raiz. */
  root: string;
  /** Texto secundário. */
  muted: string;
  /** Cartões. */
  surface: string;
  /** Fonte dos títulos. */
  heading: string;
  /** Raio dos cartões e botões. */
  radius: string;
  /** Hero: centralizado ou alinhado à esquerda com cartão de contato. */
  hero: "center" | "split";
  /** Serviços: cartões numerados, cardápio com preço à direita ou lista com faixa. */
  services: "cards" | "menu" | "strips";
  /** Barra do topo/rodapé. */
  bar: string;
  /** Linhas divisórias. */
  line: string;
  copy: {
    badge: (category: string, city: string) => string;
    servicesTitle: string;
    galleryTitle: string;
    testimonialsTitle: string;
    stepsTitle: string;
    steps: { t: string; d: (city: string) => string }[];
    primaryCta: string;
    headerCta: string;
    serviceCta: string;
    callCta: string;
    perk: string;
    placeTitle: string;
    routeCta: string;
  };
};

export const THEMES: Record<ThemeId, Theme> = {
  moderno: {
    id: "moderno",
    name: "Moderno",
    bestFor: "Qualquer negócio. Fundo escuro, vidro e brilho.",
    swatch: { bg: "#0a0e17", surface: "#1e293b", accent: "#3b82f6", text: "#ffffff" },
    dark: true,
    root: "bg-[#0a0e17] text-white",
    muted: "text-slate-300",
    surface: "glass",
    heading: "",
    radius: "rounded-3xl",
    hero: "center",
    services: "cards",
    bar: "bg-[#0a0e17]/95 border-white/10",
    line: "border-white/10",
    copy: {
      badge: (c, city) => `${c} em ${city}`,
      servicesTitle: "O que fazemos",
      galleryTitle: "Nosso trabalho",
      testimonialsTitle: "Quem já contratou",
      stepsTitle: "Orçamento em 3 passos",
      steps: [
        { t: "Chame no WhatsApp", d: () => "Conte o que você precisa." },
        { t: "Receba o orçamento", d: () => "Resposta rápida, sem compromisso." },
        { t: "Feche e relaxe", d: (city) => `Atendimento em ${city}.` },
      ],
      primaryCta: "Pedir orçamento no WhatsApp",
      headerCta: "Chamar no WhatsApp",
      serviceCta: "Pedir orçamento",
      callCta: "Ligar agora",
      perk: "Resposta rápida pelo WhatsApp",
      placeTitle: "Onde estamos",
      routeCta: "Traçar rota",
    },
  },

  clinica: {
    id: "clinica",
    name: "Clínica e saúde",
    bestFor: "Clínicas, dentistas, psicólogos, fisioterapia, estética. Claro, limpo e de confiança.",
    swatch: { bg: "#f4f9fb", surface: "#ffffff", accent: "#0ea5a4", text: "#0f2a33" },
    dark: false,
    root: "bg-[#f4f9fb] text-[#0f2a33]",
    muted: "text-slate-600",
    surface: "bg-white border border-slate-200 shadow-sm",
    heading: "",
    radius: "rounded-2xl",
    hero: "split",
    services: "cards",
    bar: "bg-white/95 border-slate-200",
    line: "border-slate-200",
    copy: {
      badge: (c, city) => `${c} · ${city}`,
      servicesTitle: "Nossos atendimentos",
      galleryTitle: "Nosso espaço",
      testimonialsTitle: "O que dizem os pacientes",
      stepsTitle: "Como agendar",
      steps: [
        { t: "Fale com a recepção", d: () => "Pelo WhatsApp, em poucos toques." },
        { t: "Escolha o horário", d: () => "Combinamos o melhor dia para você." },
        { t: "Venha ser atendido", d: (city) => `Atendimento presencial em ${city}.` },
      ],
      primaryCta: "Agendar pelo WhatsApp",
      headerCta: "Agendar consulta",
      serviceCta: "Agendar este atendimento",
      callCta: "Ligar para a clínica",
      perk: "Agendamento rápido pelo WhatsApp",
      placeTitle: "Como chegar",
      routeCta: "Traçar rota",
    },
  },

  restaurante: {
    id: "restaurante",
    name: "Restaurante e comida",
    bestFor: "Restaurantes, lanchonetes, pizzarias, padarias, marmitas. Quente, com cardápio.",
    swatch: { bg: "#1c1410", surface: "#2a1d16", accent: "#f59e0b", text: "#fff7ed" },
    dark: true,
    root: "bg-[#1c1410] text-[#fff7ed]",
    muted: "text-orange-100/70",
    surface: "bg-[#2a1d16] border border-orange-200/10",
    heading: "font-display",
    radius: "rounded-2xl",
    hero: "center",
    services: "menu",
    bar: "bg-[#1c1410]/95 border-orange-200/10",
    line: "border-orange-200/15",
    copy: {
      badge: (c, city) => `${c} em ${city}`,
      servicesTitle: "Cardápio",
      galleryTitle: "Direto da nossa cozinha",
      testimonialsTitle: "Quem já provou",
      stepsTitle: "Como pedir",
      steps: [
        { t: "Escolha no cardápio", d: () => "Veja os pratos e valores acima." },
        { t: "Faça o pedido", d: () => "Mande uma mensagem no WhatsApp." },
        { t: "Receba ou retire", d: (city) => `Atendemos em ${city}.` },
      ],
      primaryCta: "Fazer pedido no WhatsApp",
      headerCta: "Fazer pedido",
      serviceCta: "Pedir este",
      callCta: "Ligar e reservar",
      perk: "Pedido rápido pelo WhatsApp",
      placeTitle: "Venha nos visitar",
      routeCta: "Traçar rota",
    },
  },

  servicos: {
    id: "servicos",
    name: "Prestador de serviço",
    bestFor: "Eletricista, encanador, climatização, reformas, mecânica. Direto ao ponto, botão grande.",
    swatch: { bg: "#ffffff", surface: "#f1f5f9", accent: "#facc15", text: "#0f172a" },
    dark: false,
    root: "bg-white text-slate-900",
    muted: "text-slate-600",
    surface: "bg-slate-100 border border-slate-200",
    heading: "uppercase tracking-tight",
    radius: "rounded-xl",
    hero: "split",
    services: "strips",
    bar: "bg-white/95 border-slate-200",
    line: "border-slate-200",
    copy: {
      badge: (c, city) => `${c} em ${city}`,
      servicesTitle: "Serviços",
      galleryTitle: "Trabalhos feitos",
      testimonialsTitle: "Clientes atendidos",
      stepsTitle: "Orçamento em 3 passos",
      steps: [
        { t: "Chame no WhatsApp", d: () => "Mande fotos e conte o problema." },
        { t: "Receba o orçamento", d: () => "Valor claro, sem compromisso." },
        { t: "Serviço feito", d: (city) => `Atendemos em ${city} e região.` },
      ],
      primaryCta: "Orçamento grátis no WhatsApp",
      headerCta: "Orçamento grátis",
      serviceCta: "Pedir orçamento",
      callCta: "Ligar agora",
      perk: "Resposta rápida, sem compromisso",
      placeTitle: "Onde atendemos",
      routeCta: "Traçar rota",
    },
  },

  beleza: {
    id: "beleza",
    name: "Beleza e bem-estar",
    bestFor: "Salão, barbearia, manicure, estúdio, loja. Elegante, com tipografia fina.",
    swatch: { bg: "#fbf6f3", surface: "#ffffff", accent: "#be185d", text: "#2b1a1f" },
    dark: false,
    root: "bg-[#fbf6f3] text-[#2b1a1f]",
    muted: "text-[#2b1a1f]/65",
    surface: "bg-white border border-[#2b1a1f]/10",
    heading: "font-display",
    radius: "rounded-[28px]",
    hero: "center",
    services: "menu",
    bar: "bg-[#fbf6f3]/95 border-[#2b1a1f]/10",
    line: "border-[#2b1a1f]/10",
    copy: {
      badge: (c, city) => `${c} · ${city}`,
      servicesTitle: "Serviços e valores",
      galleryTitle: "Nosso trabalho",
      testimonialsTitle: "Clientes felizes",
      stepsTitle: "Como marcar seu horário",
      steps: [
        { t: "Chame no WhatsApp", d: () => "Diga o serviço que você quer." },
        { t: "Escolha o horário", d: () => "Reservamos o melhor para você." },
        { t: "Venha se cuidar", d: (city) => `Esperamos você em ${city}.` },
      ],
      primaryCta: "Marcar horário no WhatsApp",
      headerCta: "Marcar horário",
      serviceCta: "Marcar este serviço",
      callCta: "Ligar",
      perk: "Horário marcado pelo WhatsApp",
      placeTitle: "Onde fica",
      routeCta: "Traçar rota",
    },
  },
};

export const DEFAULT_THEME: ThemeId = "moderno";

export function isThemeId(v: unknown): v is ThemeId {
  return typeof v === "string" && (THEME_IDS as readonly string[]).includes(v);
}

export function getTheme(id: string | null | undefined): Theme {
  return isThemeId(id) ? THEMES[id] : THEMES[DEFAULT_THEME];
}

/** Sugere o tema pela categoria digitada no chat (o dono pode trocar depois). */
export function suggestTheme(category: string): ThemeId {
  const c = category
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  const has = (words: string[]) => words.some((w) => c.includes(w));
  if (has(["clinic", "dentist", "odonto", "psicolog", "fisioter", "medic", "saude", "nutri", "veterin", "pediatr", "terapia", "laboratorio"]))
    return "clinica";
  if (has(["restaurante", "lanchonete", "pizza", "padaria", "hamburg", "marmit", "churrasc", "bar ", "cafe", "doceria", "confeitaria", "sorvete", "acai", "comida", "buffet"]))
    return "restaurante";
  if (has(["salao", "barbear", "manicure", "cabelei", "estetic", "beleza", "maquiag", "sobrancelha", "studio", "estudio", "loja", "boutique", "moda", "spa", "tatuag"]))
    return "beleza";
  if (has(["eletric", "encanad", "ar-condicionado", "ar condicionado", "climatiz", "reforma", "pintor", "pintura", "mecanic", "chaveiro", "marceneiro", "serralh", "dedetiz", "limpeza", "pedreiro", "instala", "manutenc", "conserto", "vidracar", "jardin", "mudanc", "frete"]))
    return "servicos";
  return "moderno";
}

/** Preto ou branco, o que ler melhor sobre a cor da marca (hex #rrggbb). */
export function readableOn(hex: string): "#0a0a0a" | "#ffffff" {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return L > 0.4 ? "#0a0a0a" : "#ffffff";
}
