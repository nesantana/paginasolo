import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { brand } from "@/config/brand";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0a0e17",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: `${brand.name} — ${brand.tagline}`,
  description:
    "Plataforma SaaS multitenant para geração instantânea de páginas de alta conversão com SEO local para prestadores de serviço e comércios. Crie seu site com um assistente e publique por menos de uma pizza por mês.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${jakarta.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#0a0e17] text-white selection:bg-[#3b82f6] selection:text-white">
        {children}
      </body>
    </html>
  );
}
