import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTenantBySlug, isPublished } from "@/lib/tenantStore";
import { PageviewBeacon, TrackedLink } from "@/components/TenantTracker";
import {
  ArrowUpRight,
  Globe,
  Link2,
  MapPin,
  MessageCircle,
  Phone,
  Star,
} from "lucide-react";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant || !isPublished(tenant)) return { title: "Página não encontrada" };
  return {
    title: `${tenant.business_name} — Links`,
    description: `Todos os contatos de ${tenant.business_name}: WhatsApp, site, localização e mais.`,
    robots: { index: false },
  };
}

export default async function LinksPage({ params }: Props) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  // Recurso do plano ativo: rascunho ou assinatura parada não publica.
  if (!tenant || !isPublished(tenant)) notFound();

  const color = /^#[0-9a-f]{6}$/i.test(tenant.primary_color) ? tenant.primary_color : "#3b82f6";
  const wa = `https://wa.me/${tenant.whatsapp_number}?text=${encodeURIComponent(
    `Olá! Vim pelo Instagram da ${tenant.business_name} e gostaria de um orçamento.`
  )}`;
  const mapsUrl = tenant.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${tenant.business_name} ${tenant.address}`
      )}`
    : null;
  const custom = Array.isArray(tenant.links) ? tenant.links : [];

  const itemClass =
    "group flex w-full items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.07] px-5 py-4 text-left font-bold backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15";

  return (
    <div className="relative isolate min-h-dvh overflow-x-clip bg-[#0a0e17] px-5 pb-12 pt-12 text-white">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="grid-bg absolute inset-0" />
        <div
          className="animate-blob absolute -top-28 left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full blur-[110px]"
          style={{ backgroundColor: `${color}66` }}
        />
      </div>
      <PageviewBeacon tenantId={tenant.id} />

      <main className="mx-auto max-w-md">
        <div className="animate-fade-up flex flex-col items-center text-center">
          {tenant.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tenant.logo_url}
              alt={tenant.business_name}
              className="h-24 w-24 rounded-full border-2 border-white/30 bg-white object-cover shadow-xl"
            />
          ) : (
            <span
              className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-white/30 text-4xl font-extrabold shadow-xl"
              style={{ backgroundColor: color }}
            >
              {tenant.business_name.trim().charAt(0).toUpperCase()}
            </span>
          )}
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{tenant.business_name}</h1>
          <p className="mt-1 text-sm text-slate-300">
            {tenant.category} · {tenant.city}
          </p>
          {tenant.offer_text && (
            <p className="mt-4 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold text-amber-200">
              🎁 {tenant.offer_text}
            </p>
          )}
        </div>

        <ul className="mt-8 space-y-3">
          <li className="animate-pop-in" style={{ animationDelay: "100ms" }}>
            <TrackedLink
              tenantId={tenant.id}
              eventType="click_whatsapp"
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="animate-pulse-ring flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-5 py-4 text-lg font-extrabold text-zinc-950 shadow-lg transition hover:brightness-105"
            >
              <MessageCircle className="h-6 w-6" /> Pedir orçamento no WhatsApp
            </TrackedLink>
          </li>

          <li className="animate-pop-in" style={{ animationDelay: "200ms" }}>
            <a href={`/${tenant.slug}`} className={itemClass}>
              <Globe className="h-5 w-5 shrink-0" style={{ color }} />
              <span className="flex-1">Ver nosso site</span>
              <ArrowUpRight className="h-4 w-4 opacity-50 transition group-hover:opacity-100" />
            </a>
          </li>

          <li className="animate-pop-in" style={{ animationDelay: "300ms" }}>
            <TrackedLink
              tenantId={tenant.id}
              eventType="click_call"
              href={`tel:+${tenant.whatsapp_number}`}
              className={itemClass}
            >
              <Phone className="h-5 w-5 shrink-0" style={{ color }} />
              <span className="flex-1">Ligar agora</span>
              <ArrowUpRight className="h-4 w-4 opacity-50 transition group-hover:opacity-100" />
            </TrackedLink>
          </li>

          {mapsUrl && (
            <li className="animate-pop-in" style={{ animationDelay: "400ms" }}>
              <TrackedLink
                tenantId={tenant.id}
                eventType="click_maps"
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={itemClass}
              >
                <MapPin className="h-5 w-5 shrink-0" style={{ color }} />
                <span className="flex-1">Como chegar</span>
                <ArrowUpRight className="h-4 w-4 opacity-50 transition group-hover:opacity-100" />
              </TrackedLink>
            </li>
          )}

          {tenant.google_reviews_url && (
            <li className="animate-pop-in" style={{ animationDelay: "500ms" }}>
              <a
                href={tenant.google_reviews_url}
                target="_blank"
                rel="noopener noreferrer"
                className={itemClass}
              >
                <Star className="h-5 w-5 shrink-0 fill-yellow-400 text-yellow-400" />
                <span className="flex-1">Avalie no Google</span>
                <ArrowUpRight className="h-4 w-4 opacity-50 transition group-hover:opacity-100" />
              </a>
            </li>
          )}

          {custom.map((l, i) => (
            <li
              key={`${l.url}-${i}`}
              className="animate-pop-in"
              style={{ animationDelay: `${600 + i * 80}ms` }}
            >
              <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className={itemClass}>
                <Link2 className="h-5 w-5 shrink-0" style={{ color }} />
                <span className="flex-1">{l.label}</span>
                <ArrowUpRight className="h-4 w-4 opacity-50 transition group-hover:opacity-100" />
              </a>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-center text-xs text-slate-500">
          Feito com{" "}
          <a href="/" className="font-bold text-slate-400 underline underline-offset-2">
            autonomIA
          </a>
        </p>
      </main>
    </div>
  );
}
