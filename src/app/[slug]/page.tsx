import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/lib/tenantStore";
import Script from "next/script";
import { PageviewBeacon, TrackedLink } from "@/components/TenantTracker";
import { PublishButton } from "@/components/PublishButton";
import {
  MessageSquare,
  MapPin,
  Clock,
  Phone,
  CheckCircle2,
  Navigation,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

// Renderização Estática Revalidada sob Demanda (ISR) para carregamento < 500ms e PageSpeed 100
export const revalidate = 3600;

const BASE = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3004").replace(/\/+$/, "");

/** "Campo Grande - MS" -> "MS" (null se a cidade não trouxer UF). */
function regionFromCity(city: string): string | null {
  const m = city.match(/[-,/]\s*([A-Za-z]{2})\s*$/);
  return m ? m[1].toUpperCase() : null;
}

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);

  if (!tenant) {
    return {
      title: "Página Não Encontrada",
    };
  }

  // Formato exigido para SEO Local: "[Nome da Empresa] - [Categoria] em [Cidade]"
  const seoTitle = `${tenant.business_name} - ${tenant.category} em ${tenant.city}`;
  const seoDescription =
    tenant.description ||
    tenant.headline ||
    `${tenant.business_name}: especialista em ${tenant.category} em ${tenant.city}. Solicite orçamento direto pelo WhatsApp.`;

  return {
    title: seoTitle,
    description: seoDescription,
    metadataBase: new URL(BASE),
    // Prévia (ainda não paga) nunca vai para o Google.
    robots:
      tenant.subscription_status === "active"
        ? { index: true, follow: true }
        : { index: false, follow: false },
    alternates: {
      canonical: `/${tenant.slug}`,
    },
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      type: "website",
      locale: "pt_BR",
      siteName: tenant.business_name,
      url: `/${tenant.slug}`,
    },
    other: {
      ...(regionFromCity(tenant.city)
        ? { "geo.region": `BR-${regionFromCity(tenant.city)}` }
        : {}),
      "geo.placename": tenant.city,
    },
  };
}

export default async function TenantPublicLandingPage({ params }: PageProps) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);

  if (!tenant || !tenant.is_active) {
    notFound();
  }

  const isPreview = tenant.subscription_status !== "active";
  const cleanPhone = tenant.whatsapp_number.replace(/\D/g, "");
  const phoneWithDdi = cleanPhone.startsWith("55")
    ? cleanPhone
    : `55${cleanPhone}`;

  const defaultWaText = `Olá! Vi a página da *${tenant.business_name}* (${tenant.city}) e gostaria de solicitar um orçamento.`;
  const whatsappUrl = `https://wa.me/${phoneWithDdi}?text=${encodeURIComponent(
    defaultWaText
  )}`;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${tenant.business_name} ${tenant.address || tenant.city}`
  )}`;

  const callUrl = `tel:+${phoneWithDdi}`;

  // Schema JSON-LD completo de LocalBusiness para SEO Local
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: tenant.business_name,
    description: tenant.description || tenant.headline,
    telephone: `+${phoneWithDdi}`,
    url: `${BASE}/${tenant.slug}`,
    ...(tenant.logo_url ? { image: tenant.logo_url } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: tenant.address || tenant.city,
      addressLocality: tenant.city,
      ...(regionFromCity(tenant.city)
        ? { addressRegion: regionFromCity(tenant.city) }
        : {}),
      addressCountry: "BR",
    },
    areaServed: {
      "@type": "City",
      name: tenant.city,
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: `Serviços de ${tenant.category}`,
      itemListElement: (tenant.services || []).map((srv) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: srv.title,
          description: srv.description,
        },
      })),
    },
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#07111a] text-white pb-24 sm:pb-12">
      {isPreview && (
        <div className="sticky top-0 z-50 bg-[#FF6600] text-white px-4 py-2.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs sm:text-sm font-bold">
          <span>Prévia do seu site — ainda não está no Google.</span>
          <PublishButton
            label="Publicar por R$ 37/mês"
            className="inline-flex items-center gap-2 rounded-full bg-white text-[#c2410c] px-4 py-1.5 text-xs font-extrabold shadow disabled:opacity-60"
          />
        </div>
      )}

      {/* Disparo leve de Pageview sem bloquear renderização */}
      {!isPreview && <PageviewBeacon tenantId={tenant.id} />}

      {/* Pixels de anúncio (IDs validados no cadastro; só em site publicado) */}
      {!isPreview && tenant.meta_pixel_id && (
        <Script id="meta-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");fbq("init","${tenant.meta_pixel_id}");fbq("track","PageView");`}</Script>
      )}
      {!isPreview && tenant.google_tag_id && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${tenant.google_tag_id}`} strategy="afterInteractive" />
          <Script id="gtag-init" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date());gtag("config","${tenant.google_tag_id}");`}</Script>
        </>
      )}

      {/* Schema.org LocalBusiness JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      {/* Barra Superior */}
      <header className="border-b border-white/10 bg-[#07111a]/95 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center font-extrabold text-sm text-white shrink-0 shadow-md"
              style={{ backgroundColor: tenant.primary_color || "#FF6600" }}
            >
              {tenant.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tenant.logo_url}
                  alt={`Logo ${tenant.business_name}`}
                  className="h-9 w-9 rounded-xl object-cover bg-white"
                />
              ) : (
                tenant.business_name.slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="truncate">
              <span className="font-extrabold text-sm sm:text-base text-white block truncate">
                {tenant.business_name}
              </span>
              <span className="text-[11px] text-slate-400 block truncate">
                {tenant.category} • {tenant.city}
              </span>
            </div>
          </div>

          <TrackedLink
            tenantId={tenant.id}
            eventType="click_whatsapp"
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-extrabold px-4 py-2 text-xs sm:text-sm shrink-0 shadow-lg shadow-emerald-500/20 transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chamar no WhatsApp</span>
          </TrackedLink>
        </div>
      </header>

      <main className="flex-1">
        {/* 1. HERO DIRETO COM PROPOSTA DE VALOR & CTA DE ALTA CONVERSÃO */}
        <section className="relative py-12 sm:py-20 border-b border-white/10 bg-gradient-to-b from-[#0c1d2c] to-[#07111a]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-bold text-[#FF9C40]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {tenant.category} em {tenant.city}
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-white leading-[1.12] tracking-tight">
              {tenant.headline ||
                `${tenant.business_name} — Especialista em ${tenant.category} em ${tenant.city}`}
            </h1>

            <p className="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
              {tenant.description}
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3.5">
              <TrackedLink
                tenantId={tenant.id}
                eventType="click_whatsapp"
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-extrabold px-8 py-4 text-sm sm:text-base shadow-xl shadow-emerald-500/25 transition-all"
              >
                <MessageSquare className="w-5 h-5" />
                <span>Solicitar Orçamento no WhatsApp</span>
              </TrackedLink>

              <TrackedLink
                tenantId={tenant.id}
                eventType="click_call"
                href={callUrl}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-white font-extrabold px-6 py-4 text-sm sm:text-base transition-all"
              >
                <Phone className="w-4 h-4 text-[#FF9C40]" />
                <span>Ligar Agora</span>
              </TrackedLink>
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-5 text-xs text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Atendimento Rápido pelo WhatsApp
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Atendimento em {tenant.city}
              </span>
            </div>
          </div>
        </section>

        {/* 2. BLOCO DE SERVIÇOS & DIFERENCIAIS (Cards Leves) */}
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 space-y-8">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#FF9C40]">
                Nossas Especialidades
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                Serviços e Soluções de {tenant.business_name}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {(tenant.services || []).map((srv, idx) => {
                const serviceWaUrl = `https://wa.me/${phoneWithDdi}?text=${encodeURIComponent(
                  `Olá! Vi no site da *${tenant.business_name}* o serviço *"${srv.title}"* e gostaria de solicitar um orçamento.`
                )}`;

                return (
                  <div
                    key={`${srv.title}-${idx}`}
                    className="rounded-2xl border border-white/10 bg-[#0c1d2c] p-5 sm:p-6 flex flex-col justify-between gap-4 hover:border-white/25 transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-base sm:text-lg font-extrabold text-white">
                          {srv.title}
                        </h3>
                        {srv.price_optional && (
                          <span className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-xs font-extrabold text-emerald-300 shrink-0">
                            {srv.price_optional}
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                        {srv.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        Disponível em {tenant.city}
                      </span>
                      <TrackedLink
                        tenantId={tenant.id}
                        eventType="click_whatsapp"
                        href={serviceWaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-400 hover:text-emerald-300"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Pedir Orçamento →</span>
                      </TrackedLink>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 3. LOCALIZAÇÃO, HORÁRIO DE FUNCIONAMENTO & ROTA NO GOOGLE MAPS */}
        <section className="py-12 sm:py-16 bg-[#0b1926] border-t border-white/10">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="rounded-3xl border border-white/15 bg-[#07111a] p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-8 space-y-4">
                <span className="inline-block text-xs font-extrabold uppercase tracking-wider text-[#FF9C40]">
                  Atendimento Local • {tenant.city}
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  Localização e Horário de Atendimento
                </h2>

                <div className="space-y-2.5 text-xs sm:text-sm text-slate-300">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-[#FF9C40] shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">Endereço: </strong>
                      {tenant.address || tenant.city}
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-[#FF9C40] shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">Horário: </strong>
                      {tenant.opening_hours || "Segunda a Sábado, 08h às 18h"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-4 flex flex-col gap-3">
                <TrackedLink
                  tenantId={tenant.id}
                  eventType="click_maps"
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 py-3.5 px-5 text-xs sm:text-sm font-extrabold text-white transition-all"
                >
                  <Navigation className="w-4 h-4 text-[#FF9C40]" />
                  <span>Traçar Rota no Google Maps</span>
                </TrackedLink>

                <TrackedLink
                  tenantId={tenant.id}
                  eventType="click_whatsapp"
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 py-3.5 px-5 text-xs sm:text-sm font-extrabold text-zinc-950 transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Falar no WhatsApp Agora</span>
                </TrackedLink>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-400">
        <p>
          © {new Date().getFullYear()} <strong>{tenant.business_name}</strong> •{" "}
          {tenant.category} em {tenant.city}.
        </p>
      </footer>

      {/* Barra Flutuante Mobile de Conversão */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 p-3 bg-[#07111a]/95 backdrop-blur-lg border-t border-white/15 flex items-center gap-2.5">
        <TrackedLink
          tenantId={tenant.id}
          eventType="click_whatsapp"
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 text-zinc-950 font-extrabold py-3.5 text-xs shadow-lg"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Solicitar Orçamento no WhatsApp</span>
        </TrackedLink>
        <TrackedLink
          tenantId={tenant.id}
          eventType="click_maps"
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1 rounded-full border border-white/15 bg-white/10 px-4 py-3.5 text-xs font-extrabold text-white"
        >
          <MapPin className="w-4 h-4 text-[#FF9C40]" />
          <span>Mapa</span>
        </TrackedLink>
      </div>
    </div>
  );
}
