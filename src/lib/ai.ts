import "server-only";
import type { TenantServiceItem } from "@/types/database.types";

export type CopyInput = {
  business_name: string;
  category: string;
  city: string;
  services: string[]; // só os nomes que o dono digitou
};

export type GeneratedCopy = {
  headline: string;
  description: string;
  services: TenantServiceItem[];
  source: "ai" | "template";
};

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";

function templateCopy(i: CopyInput): GeneratedCopy {
  return {
    headline: `${i.business_name} — ${i.category} em ${i.city}`.slice(0, 150),
    description: `Precisa de ${i.category.toLowerCase()} em ${i.city}? A ${i.business_name} atende rápido, com orçamento sem compromisso direto pelo WhatsApp.`,
    services: i.services.map((title) => ({
      title,
      description: `${title} com atendimento rápido e orçamento sem compromisso pelo WhatsApp.`,
      price_optional: "Orçamento no WhatsApp",
    })),
    source: "template",
  };
}

/**
 * Claude escreve só o texto (headline, descrição, descrição dos serviços).
 * Se não houver chave ou a chamada falhar, cai no template: o fluxo nunca trava.
 * Instrução explícita: não inventar preço, garantia, anos de mercado ou certificações.
 */
export async function generateCopy(i: CopyInput): Promise<GeneratedCopy> {
  if (!process.env.ANTHROPIC_API_KEY || i.services.length === 0) return templateCopy(i);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1200,
        system:
          "Você escreve textos curtos de sites de pequenos negócios brasileiros, otimizados para SEO local no Google. Português do Brasil, tom direto e confiável. REGRAS: nunca invente preços, prazos, garantias, anos de experiência, certificações, endereços ou números; use apenas os dados fornecidos. Inclua naturalmente a categoria e a cidade no título e na descrição. Responda SOMENTE com JSON válido, sem markdown.",
        messages: [
          {
            role: "user",
            content: `Negócio: ${i.business_name}\nCategoria: ${i.category}\nCidade: ${i.city}\nServiços informados: ${JSON.stringify(i.services)}\n\nRetorne JSON: {"headline": string (máx 110 caracteres), "description": string (máx 260 caracteres), "services": [{"title": string (o nome informado, pode corrigir ortografia), "description": string (máx 150 caracteres)}]} com um item por serviço informado, na mesma ordem.`,
          },
        ],
      }),
    });
    if (!res.ok) return templateCopy(i);

    const data = await res.json();
    const text: string = data?.content?.find((c: { type: string }) => c.type === "text")?.text || "";
    const parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));

    const fallback = templateCopy(i);
    const aiServices: { title?: string; description?: string }[] = Array.isArray(parsed.services)
      ? parsed.services
      : [];
    return {
      headline: String(parsed.headline || fallback.headline).slice(0, 160),
      description: String(parsed.description || fallback.description).slice(0, 400),
      services: i.services.map((orig, idx) => ({
        title: String(aiServices[idx]?.title || orig).slice(0, 90),
        description: String(aiServices[idx]?.description || fallback.services[idx].description).slice(0, 280),
        price_optional: "Orçamento no WhatsApp",
      })),
      source: "ai",
    };
  } catch {
    return templateCopy(i);
  }
}
