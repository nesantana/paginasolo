import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/lib/tenantStore";
import Script from "next/script";
import type { ReactNode } from "react";
import { PageviewBeacon, TrackedLink } from "@/components/TenantTracker";
import { PublishButton } from "@/components/PublishButton";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  Gift,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
  Quote,
  Star,
  Zap,
} from "lucide-react";
import { defaultFaq } from "@/lib/faqDefaults";
import { Reveal } from "@/components/Reveal";
import { getTheme, readableOn } from "@/lib/themes";

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

  const th = getTheme(tenant.theme);
  // O azul padrão do cadastro não vale nos temas que têm cor própria.
  const brandColor = (tenant.primary_color || "").toLowerCase();
  const color =
    !brandColor || (brandColor === "#3b82f6" && th.id !== "moderno")
      ? th.swatch.accent
      : tenant.primary_color;
  const onColor = readableOn(color);
  // Cor usada como TEXTO/ÍCONE: em fundo claro, um destaque claro (amarelo) some.
  const accentText =
    th.dark || readableOn(color) === "#ffffff" ? color : th.swatch.text;
  const services = tenant.services || [];
  const hours = tenant.opening_hours || "Segunda a Sábado, 08h às 18h";
  const gallery = tenant.images || [];
  const testimonials = tenant.testimonials || [];
  const faq = tenant.faq && tenant.faq.length > 0 ? tenant.faq : defaultFaq(tenant);
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const waLink = (className: string, children: ReactNode, href = whatsappUrl) => (
    <TrackedLink
      tenantId={tenant.id}
      eventType="click_whatsapp"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </TrackedLink>
  );

  const h2 = `text-3xl font-extrabold tracking-tight sm:text-4xl ${th.heading}`;
  const callBtn = th.dark
    ? "glass hover:bg-white/15"
    : "bg-white border border-slate-300 hover:bg-slate-50 text-slate-900";
  const pricePill = th.dark
    ? "bg-emerald-500/15 text-emerald-300"
    : "bg-slate-900/5 text-slate-800";
  // Cartão de localização contrasta com o fundo da página.
  const locCard = th.dark ? "bg-white text-slate-900" : "bg-slate-900 text-white";
  const locBtn = th.dark ? "bg-slate-900 text-white" : "bg-white text-slate-900";

  const serviceWaUrl = (title: string) =>
    `https://wa.me/${phoneWithDdi}?text=${encodeURIComponent(
      `Olá! Vi no site da *${tenant.business_name}* o serviço *"${title}"* e gostaria de solicitar um orçamento.`
    )}`;

  const contactActions = (
    <>
      {waLink(
        "animate-pulse-ring inline-flex items-center justify-center gap-2.5 rounded-2xl bg-[#25D366] px-8 py-4 text-base font-extrabold text-zinc-950 transition hover:scale-[1.03]",
        <>
          <MessageSquare className="h-5 w-5" />
          {th.copy.primaryCta}
        </>
      )}
      <TrackedLink
        tenantId={tenant.id}
        eventType="click_call"
        href={callUrl}
        className={`inline-flex items-center justify-center gap-2 rounded-2xl px-7 py-4 text-base font-bold transition ${callBtn}`}
      >
        <Phone className="h-5 w-5" style={{ color: accentText }} />
        {th.copy.callCta}
      </TrackedLink>
    </>
  );

  return (
    <div
      className={`min-h-screen overflow-x-clip pb-24 sm:pb-0 ${th.root}`}
      data-theme={th.id}
    >
      {isPreview && (
        <div className="sticky top-0 z-50 bg-white text-slate-900 px-4 py-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-sm font-semibold shadow-md">
          <span>Prévia — ainda não está no Google.</span>
          <PublishButton
            label="Publicar por R$ 37/mês"
            className="rounded-full bg-slate-900 text-white px-4 py-1 text-xs font-bold disabled:opacity-60"
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

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqLd).replace(/</g, "\\u003c"),
        }}
      />

      {/* ===== HERO ===== */}
      <section className="relative isolate">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          {th.dark && th.id === "moderno" && <div className="grid-bg absolute inset-0" />}
          <div
            className={`animate-blob absolute -top-32 -left-20 h-[26rem] w-[26rem] rounded-full blur-[110px] ${
              th.id === "moderno" ? "opacity-40" : th.dark ? "opacity-20" : "opacity-15"
            }`}
            style={{ backgroundColor: color }}
          />
          <div
            className={`animate-blob absolute top-24 -right-24 h-[22rem] w-[22rem] rounded-full blur-[110px] ${
              th.id === "moderno" ? "opacity-25" : th.dark ? "opacity-15" : "opacity-10"
            }`}
            style={{ backgroundColor: color, animationDelay: "-8s" }}
          />
        </div>

        <header className="mx-auto flex h-20 max-w-5xl items-center justify-between gap-3 px-5">
          <div className="flex min-w-0 items-center gap-3">
            {tenant.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tenant.logo_url}
                alt={`Logo ${tenant.business_name}`}
                className={`h-11 w-11 bg-white object-cover shadow-lg ${th.radius === "rounded-3xl" ? "rounded-xl" : th.radius}`}
              />
            ) : (
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-extrabold shadow-lg"
                style={{ backgroundColor: color, color: onColor }}
              >
                {tenant.business_name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className={`truncate font-extrabold ${th.heading}`}>{tenant.business_name}</span>
          </div>
          {waLink(
            "hidden sm:inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-extrabold text-zinc-950 shadow-lg shadow-[#25D366]/25 transition hover:scale-105",
            <>
              <MessageSquare className="h-4 w-4" />
              {th.copy.headerCta}
            </>
          )}
        </header>

        {th.hero === "center" ? (
          <div className="mx-auto max-w-3xl px-5 pb-20 pt-10 text-center sm:pb-28 sm:pt-16">
            <span
              className={`animate-fade-up inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold ${
                th.dark ? "glass" : `${th.surface}`
              }`}
            >
              <MapPin className="h-3.5 w-3.5" style={{ color: accentText }} />
              {th.copy.badge(tenant.category, tenant.city)}
            </span>

            {tenant.offer_text && (
              <p
                className="animate-pop-in mx-auto mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold"
                style={{ backgroundColor: color, color: onColor, animationDelay: "60ms" }}
              >
                <Gift className="h-4 w-4" />
                {tenant.offer_text}
              </p>
            )}

            <h1
              className={`animate-fade-up mt-6 text-4xl font-extrabold leading-[1.06] tracking-tight sm:text-6xl ${th.heading}`}
              style={{ animationDelay: "120ms" }}
            >
              {tenant.headline || `${tenant.category} em ${tenant.city}`}
            </h1>

            {tenant.description && (
              <p
                className={`animate-fade-up mx-auto mt-5 max-w-xl text-lg ${th.muted}`}
                style={{ animationDelay: "240ms" }}
              >
                {tenant.description}
              </p>
            )}

            <div
              className="animate-fade-up mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center"
              style={{ animationDelay: "360ms" }}
            >
              {contactActions}
            </div>

            <ul
              className={`animate-fade-up mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm ${th.muted}`}
              style={{ animationDelay: "480ms" }}
            >
              <li className="flex items-center gap-1.5">
                <Zap className="h-4 w-4" style={{ color: accentText }} />
                {th.copy.perk}
              </li>
              <li className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" style={{ color: accentText }} />
                {hours}
              </li>
            </ul>
          </div>
        ) : (
          <div className="mx-auto grid max-w-5xl items-center gap-10 px-5 pb-20 pt-8 sm:pb-24 sm:pt-12 md:grid-cols-[1.25fr_1fr]">
            <div>
              <span
                className={`animate-fade-up inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold ${th.surface}`}
              >
                <MapPin className="h-3.5 w-3.5" style={{ color: accentText }} />
                {th.copy.badge(tenant.category, tenant.city)}
              </span>
              <h1
                className={`animate-fade-up mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl ${th.heading}`}
                style={{ animationDelay: "100ms" }}
              >
                {tenant.headline || `${tenant.category} em ${tenant.city}`}
              </h1>
              {tenant.description && (
                <p
                  className={`animate-fade-up mt-5 max-w-xl text-lg ${th.muted}`}
                  style={{ animationDelay: "200ms" }}
                >
                  {tenant.description}
                </p>
              )}
              {tenant.offer_text && (
                <p
                  className="animate-pop-in mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold"
                  style={{ backgroundColor: color, color: onColor, animationDelay: "260ms" }}
                >
                  <Gift className="h-4 w-4" />
                  {tenant.offer_text}
                </p>
              )}
            </div>

            <div
              className={`animate-fade-up space-y-4 p-6 sm:p-7 ${th.radius} ${th.surface}`}
              style={{ animationDelay: "300ms" }}
            >
              <div className="flex flex-col gap-3">{contactActions}</div>
              <ul className={`space-y-2.5 border-t pt-4 text-sm ${th.line} ${th.muted}`}>
                <li className="flex items-start gap-2.5">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0" style={{ color: accentText }} />
                  {hours}
                </li>
                <li className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: accentText }} />
                  {tenant.address || tenant.city}
                </li>
                <li className="flex items-start gap-2.5">
                  <Zap className="mt-0.5 h-4 w-4 shrink-0" style={{ color: accentText }} />
                  {th.copy.perk}
                </li>
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* ===== SERVIÇOS ===== */}
      {services.length > 0 && (
        <section className={`mx-auto px-5 py-20 ${th.services === "menu" ? "max-w-3xl" : "max-w-5xl"}`}>
          <Reveal className="text-center">
            <h2 className={h2}>{th.copy.servicesTitle}</h2>
          </Reveal>

          {th.services === "cards" && (
            <div className="mt-12 grid gap-5 sm:grid-cols-2">
              {services.map((srv, idx) => (
                <Reveal key={`${srv.title}-${idx}`} delay={(idx % 2) * 120}>
                  <div
                    className={`group relative flex h-full flex-col overflow-hidden p-7 transition duration-300 hover:-translate-y-2 ${th.radius} ${th.surface}`}
                  >
                    <div
                      className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-2xl transition duration-500 group-hover:opacity-50"
                      style={{ backgroundColor: color }}
                    />
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className="flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-extrabold shadow-lg"
                        style={{ backgroundColor: color, color: onColor }}
                      >
                        {idx + 1}
                      </span>
                      {srv.price_optional && (
                        <span className={`rounded-full px-3 py-1 text-sm font-extrabold ${pricePill}`}>
                          {srv.price_optional}
                        </span>
                      )}
                    </div>
                    <h3 className={`mt-5 text-xl font-extrabold ${th.heading}`}>{srv.title}</h3>
                    {srv.description && (
                      <p className={`mt-2 flex-1 ${th.muted}`}>{srv.description}</p>
                    )}
                    {waLink(
                      "mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-[#128C4A] transition group-hover:gap-3 " +
                        (th.dark ? "!text-[#25D366]" : ""),
                      <>
                        {th.copy.serviceCta}
                        <ArrowRight className="h-4 w-4" />
                      </>,
                      serviceWaUrl(srv.title)
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
          )}

          {th.services === "menu" && (
            <div className="mt-12 space-y-6">
              {services.map((srv, idx) => (
                <Reveal key={`${srv.title}-${idx}`} delay={(idx % 3) * 80}>
                  <div className={`border-b pb-6 ${th.line}`}>
                    <div className="flex items-baseline gap-3">
                      <h3 className={`text-xl font-bold sm:text-2xl ${th.heading}`}>{srv.title}</h3>
                      <span
                        aria-hidden
                        className="mb-1 min-w-6 flex-1 self-end border-b-2 border-dotted opacity-30"
                        style={{ borderColor: "currentColor" }}
                      />
                      {srv.price_optional && (
                        <span className="shrink-0 text-lg font-extrabold" style={{ color: accentText }}>
                          {srv.price_optional}
                        </span>
                      )}
                    </div>
                    {srv.description && (
                      <p className={`mt-1.5 max-w-xl ${th.muted}`}>{srv.description}</p>
                    )}
                    {waLink(
                      "mt-3 inline-flex items-center gap-2 text-sm font-extrabold transition hover:gap-3",
                      <>
                        <span style={{ color: accentText }}>{th.copy.serviceCta}</span>
                        <ArrowRight className="h-4 w-4" style={{ color: accentText }} />
                      </>,
                      serviceWaUrl(srv.title)
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
          )}

          {th.services === "strips" && (
            <div className="mt-12 space-y-3">
              {services.map((srv, idx) => (
                <Reveal key={`${srv.title}-${idx}`} delay={(idx % 3) * 80}>
                  <div
                    className={`flex flex-col gap-4 border-l-8 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 ${th.radius} ${th.surface}`}
                    style={{ borderLeftColor: color }}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className={`text-lg font-extrabold sm:text-xl ${th.heading}`}>{srv.title}</h3>
                        {srv.price_optional && (
                          <span
                            className="rounded-md px-2.5 py-1 text-xs font-extrabold"
                            style={{ backgroundColor: color, color: onColor }}
                          >
                            {srv.price_optional}
                          </span>
                        )}
                      </div>
                      {srv.description && (
                        <p className={`mt-1.5 ${th.muted}`}>{srv.description}</p>
                      )}
                    </div>
                    {waLink(
                      "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-extrabold text-white transition hover:scale-105",
                      <>
                        {th.copy.serviceCta}
                        <ArrowRight className="h-4 w-4" />
                      </>,
                      serviceWaUrl(srv.title)
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ===== GALERIA ===== */}
      {gallery.length > 0 && (
        <section className="mx-auto max-w-5xl px-5 pb-20">
          <Reveal className="text-center">
            <h2 className={h2}>{th.copy.galleryTitle}</h2>
          </Reveal>
          <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {gallery.map((src, i) => (
              <li
                key={i}
                className={i === 0 && gallery.length > 2 ? "col-span-2 sm:col-span-2 sm:row-span-2" : ""}
              >
                <Reveal delay={(i % 3) * 100} className="h-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`Trabalho de ${tenant.business_name} — foto ${i + 1}`}
                    loading="lazy"
                    className={`h-full w-full object-cover aspect-[4/3] border transition duration-500 hover:scale-[1.02] ${th.line} ${th.radius === "rounded-3xl" ? "rounded-2xl" : th.radius}`}
                  />
                </Reveal>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ===== DEPOIMENTOS ===== */}
      {(testimonials.length > 0 || tenant.google_reviews_url) && (
        <section className="mx-auto max-w-5xl px-5 pb-20">
          <Reveal className="text-center">
            <h2 className={h2}>{th.copy.testimonialsTitle}</h2>
          </Reveal>
          {testimonials.length > 0 && (
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {testimonials.map((t, i) => (
                <Reveal key={i} delay={(i % 2) * 120}>
                  <figure className={`h-full p-7 ${th.radius} ${th.surface}`}>
                    <Quote className="h-6 w-6" style={{ color: accentText }} />
                    <blockquote className="mt-3 text-lg leading-relaxed">
                      {t.text}
                    </blockquote>
                    {t.name && (
                      <figcaption className={`mt-4 text-sm font-bold ${th.muted}`}>
                        — {t.name}
                      </figcaption>
                    )}
                  </figure>
                </Reveal>
              ))}
            </div>
          )}
          {tenant.google_reviews_url && (
            <div className="mt-8 text-center">
              <a
                href={tenant.google_reviews_url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-extrabold transition ${callBtn}`}
              >
                <Star className="h-4 w-4" style={{ color: accentText }} />
                Ver avaliações no Google
              </a>
            </div>
          )}
        </section>
      )}

      {/* ===== COMO É O ATENDIMENTO ===== */}
      <section className="mx-auto max-w-5xl px-5 pb-20">
        <Reveal>
          <div className={`p-8 sm:p-10 ${th.radius} ${th.surface}`}>
            <h2 className={`text-center text-2xl font-extrabold sm:text-3xl ${th.heading}`}>
              {th.copy.stepsTitle}
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {th.copy.steps.map((s, i) => {
                const Icon = [MessageSquare, Clock, CheckCircle2][i] || CheckCircle2;
                return (
                  <div key={s.t} className="text-center">
                    <span
                      className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
                      style={{ backgroundColor: color, color: onColor }}
                    >
                      <Icon className="h-6 w-6" />
                    </span>
                    <p className="mt-4 font-extrabold">
                      {i + 1}. {s.t}
                    </p>
                    <p className={`mt-1 text-sm ${th.muted}`}>{s.d(tenant.city)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ===== PERGUNTAS FREQUENTES ===== */}
      <section className="mx-auto max-w-3xl px-5 pb-20">
        <Reveal className="text-center">
          <h2 className={h2}>Perguntas frequentes</h2>
        </Reveal>
        <Reveal>
          <div className="mt-10 space-y-3">
            {faq.map((f, i) => (
              <details
                key={i}
                className={`group rounded-2xl px-6 py-4 ${th.surface} ${th.dark ? "open:bg-white/10" : "open:shadow-md"}`}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <ChevronDown className="h-5 w-5 shrink-0 transition group-open:rotate-180" />
                </summary>
                <p className={`mt-3 leading-relaxed ${th.muted}`}>{f.a}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ===== LOCALIZAÇÃO ===== */}
      <section className="mx-auto max-w-5xl px-5 pb-20">
        <Reveal>
          <div className={`relative overflow-hidden p-8 sm:p-10 ${th.radius} ${locCard}`}>
            <div
              className="absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-20 blur-3xl"
              style={{ backgroundColor: color }}
            />
            <div className="relative grid items-center gap-6 md:grid-cols-[1fr_auto]">
              <div>
                <h2 className={`text-2xl font-extrabold sm:text-3xl ${th.heading}`}>{th.copy.placeTitle}</h2>
                <p className="mt-4 flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0" style={{ color }} />
                  {tenant.address || tenant.city}
                </p>
                <p className="mt-2 flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0" style={{ color }} />
                  {hours}
                </p>
              </div>
              <TrackedLink
                tenantId={tenant.id}
                eventType="click_maps"
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center justify-center gap-2 rounded-2xl px-7 py-4 font-extrabold transition hover:scale-105 ${locBtn}`}
              >
                <Navigation className="h-5 w-5" />
                {th.copy.routeCta}
              </TrackedLink>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className={`border-t py-6 text-center text-sm opacity-70 ${th.line}`}>
        © {new Date().getFullYear()} {tenant.business_name} · {tenant.category} em{" "}
        {tenant.city}
      </footer>

      {/* Barra fixa no celular */}
      <div className={`sm:hidden fixed bottom-0 inset-x-0 z-40 border-t p-3 backdrop-blur ${th.bar}`}>
        {waLink(
          "animate-pulse-ring flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-3.5 font-extrabold text-zinc-950",
          <>
            <MessageSquare className="h-5 w-5" />
            {th.copy.primaryCta}
          </>
        )}
      </div>
    </div>
  );
}
