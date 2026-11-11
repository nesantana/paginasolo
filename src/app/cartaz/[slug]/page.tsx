import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getTenantBySlug } from "@/lib/tenantStore";
import { PrintButton } from "@/components/PrintButton";
import { SITE_URL } from "@/lib/siteUrl";

export const metadata: Metadata = {
  title: "Cartaz com QR Code",
  robots: { index: false, follow: false },
};

const BASE = SITE_URL;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ para?: string }>;
};

export default async function CartazPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { para } = await searchParams;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const toWhatsapp = para === "whatsapp";
  const digits = tenant.whatsapp_number.replace(/\D/g, "");
  const ddi = digits.startsWith("55") ? digits : `55${digits}`;
  const target = toWhatsapp
    ? `https://wa.me/${ddi}?text=${encodeURIComponent(
        `Olá! Vi o cartaz da ${tenant.business_name} e gostaria de um orçamento.`
      )}`
    : `${BASE}/${tenant.slug}`;

  const svg = await QRCode.toString(target, {
    type: "svg",
    margin: 1,
    width: 360,
    errorCorrectionLevel: "M",
    color: { dark: "#0f172a", light: "#ffffff" },
  });

  const color = tenant.primary_color || "#3b82f6";

  return (
    <div className="min-h-screen bg-slate-200 print:bg-white py-6 print:py-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] items-center justify-between gap-3 px-4 print:hidden">
        <p className="text-sm text-slate-700">
          QR Code para:{" "}
          <strong>{toWhatsapp ? "WhatsApp direto" : "o seu site"}</strong>
        </p>
        <PrintButton />
      </div>

      <main
        className="mx-auto flex min-h-[297mm] w-full max-w-[210mm] flex-col items-center justify-between bg-white px-10 py-14 text-center text-slate-900 shadow-xl print:shadow-none"
        style={{ borderTop: `18px solid ${color}` }}
      >
        <div>
          <p className="text-lg font-bold uppercase tracking-widest text-slate-500">
            {tenant.category}
          </p>
          <h1 className="mt-3 text-5xl font-extrabold leading-tight">
            {tenant.business_name}
          </h1>
        </div>

        <div>
          <p className="text-3xl font-extrabold" style={{ color }}>
            {toWhatsapp ? "Peça seu orçamento agora" : "Conheça nosso site"}
          </p>
          <div
            className="mx-auto mt-6 h-[360px] w-[360px] rounded-3xl border-8 p-2 [&>svg]:h-full [&>svg]:w-full"
            style={{ borderColor: color }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <p className="mt-6 text-2xl font-bold">
            Aponte a câmera do celular para o QR Code
          </p>
        </div>

        <div className="text-lg text-slate-600">
          <p>{tenant.city}</p>
          {tenant.address && <p>{tenant.address}</p>}
          {tenant.opening_hours && <p>{tenant.opening_hours}</p>}
        </div>
      </main>
    </div>
  );
}
