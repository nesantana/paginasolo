import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/lib/tenantStore";
import Script from "next/script";
import type { ReactNode } from "react";
import { PageviewBeacon, TrackedLink } from "@/components/TenantTracker";
import { PublishButton } from "@/components/PublishButton";
import { MessageSquare, MapPin, Clock, Phone, Navigation } from "lucide-react";

// Renderização Estática Revalidada sob Demanda (ISR)
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

  const color = tenant.primary_color || "#FF6600";
  const services = tenant.services || [];
  const hours = tenant.opening_hours || "Segunda a Sábado, 08h às 18h";

  const waLink = (className: string, children: ReactNode) => (
    <TrackedLink
      tenantId={tenant.id}
      eventType="click_whatsapp"
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </TrackedLink>
  );

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-24 sm:pb-0">
      {isPreview && (
        <div className="sticky top-0 z-50 bg-slate-900 text-white px-4 py-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-sm">
          <span>Prévia — ainda não está no Google.</span>
          <PublishButton
            label="Publicar por R$ 37/mês"
            className="rounded-full bg-white text-slate-900 px-4 py-1 text-xs font-bold disabled:opacity-60"
          />
        </div>
      )}

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

      <main className="mx-auto max-w-2xl px-5">
        {/* Herói */}
        <section className="pt-10 pb-10 sm:pt-16 sm:pb-14">
          <div className="flex items-center gap-3">
            {tenant.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tenant.logo_url}
                alt={`Logo ${tenant.business_name}`}
                className="h-12 w-12 rounded-xl object-cover border border-slate-200"
              />
            ) : (
              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {tenant.business_name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold truncate">{tenant.business_name}</p>
              <p className="text-sm text-slate-500 truncate">
                {tenant.category} · {tenant.city}
              </p>
            </div>
          </div>

          <h1 className="mt-8 text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight">
            {tenant.headline || `${tenant.category} em ${tenant.city}`}
          </h1>
          {tenant.description && (
            <p className="mt-4 text-lg text-slate-600 leading-relaxed">
              {tenant.description}
            </p>
          )}

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            {waLink(
              "inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#1fbd5b] text-white font-bold px-6 py-4 text-base transition-colors",
              <>
                <MessageSquare className="w-5 h-5" />
                Pedir orçamento no WhatsApp
              </>
            )}
            <TrackedLink
              tenantId={tenant.id}
              eventType="click_call"
              href={callUrl}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 hover:bg-slate-50 font-semibold px-6 py-4 text-base transition-colors"
            >
              <Phone className="w-5 h-5" />
              Ligar
            </TrackedLink>
          </div>
        </section>

        {/* Serviços */}
        {services.length > 0 && (
          <section className="py-10 border-t border-slate-200">
            <h2
              className="text-sm font-bold uppercase tracking-wider"
              style={{ color }}
            >
              Serviços
            </h2>
            <ul className="mt-4 divide-y divide-slate-200">
              {services.map((srv, idx) => (
                <li
                  key={`${srv.title}-${idx}`}
                  className="py-4 flex items-start justify-between gap-4"
                >
                  <div className="min-w-0">
                    <h3 className="font-bold">{srv.title}</h3>
                    {srv.description && (
                      <p className="text-slate-600 mt-1 leading-relaxed">
                        {srv.description}
                      </p>
                    )}
                  </div>
                  {srv.price_optional && (
                    <span className="shrink-0 font-bold">{srv.price_optional}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Onde e quando */}
        <section className="py-10 border-t border-slate-200">
          <h2
            className="text-sm font-bold uppercase tracking-wider"
            style={{ color }}
          >
            Onde e quando
          </h2>
          <div className="mt-4 space-y-3">
            <p className="flex items-start gap-3">
              <MapPin className="w-5 h-5 mt-0.5 shrink-0 text-slate-400" />
              <span>{tenant.address || tenant.city}</span>
            </p>
            <p className="flex items-start gap-3">
              <Clock className="w-5 h-5 mt-0.5 shrink-0 text-slate-400" />
              <span>{hours}</span>
            </p>
          </div>
          <TrackedLink
            tenantId={tenant.id}
            eventType="click_maps"
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 font-semibold underline underline-offset-4"
          >
            <Navigation className="w-4 h-4" />
            Ver no Google Maps
          </TrackedLink>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} {tenant.business_name}
      </footer>

      {/* Barra fixa no celular */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 p-3 bg-white/95 backdrop-blur border-t border-slate-200">
        {waLink(
          "flex items-center justify-center gap-2 rounded-xl bg-[#25D366] text-white font-bold py-3.5",
          <>
            <MessageSquare className="w-5 h-5" />
            Pedir orçamento no WhatsApp
          </>
        )}
      </div>
    </div>
  );
}
