import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono, Fraunces } from "next/font/google";
import { brand } from "@/config/brand";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
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
    "A autonomIA é a assistente do dia a dia do autônomo: anota a visita técnica, monta orçamento, gera contrato, marca a agenda e cobra por Pix, tudo por mensagem no celular. Inclui um site profissional para o seu negócio.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${jakarta.variable} ${jetbrainsMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#0a0e17] text-white selection:bg-[#3b82f6] selection:text-white">
        {children}
      </body>
    </html>
  );
}
