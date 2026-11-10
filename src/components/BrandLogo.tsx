import { brand } from "@/config/brand";

/** Logo + wordmark "meu[site]novo", igual ao meusitenovo.ia.br. */
export function BrandLogo({
  size = 36,
  className = "",
  light = true,
}: {
  size?: number;
  className?: string;
  /** Texto claro (padrão: o site usa fundo escuro). */
  light?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 font-extrabold tracking-tight ${light ? "text-white" : "text-slate-900"} ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={brand.logo} width={size} height={size} alt="" className="shrink-0" />
      <span className="whitespace-nowrap" aria-label={brand.name}>
        meu<span className="bg-gradient-to-r from-[#06b6d4] via-[#3b82f6] to-[#6366f1] bg-clip-text px-0.5 text-transparent">site</span>novo
      </span>
    </span>
  );
}
