import type { Metadata, Viewport } from "next";
import { Montserrat, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
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
  themeColor: "#07111a",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "PáginaSolo — Landing Pages Ultra-Rápidas com SEO Local em 3 Passos",
  description:
    "Plataforma SaaS multitenant para geração instantânea de páginas de alta conversão com SEO local para prestadores de serviço e comércios. Um produto MSSolo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${montserrat.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#07111a] text-white selection:bg-[#FF6600] selection:text-white">
        {children}
      </body>
    </html>
  );
}
