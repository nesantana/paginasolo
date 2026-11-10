import { brand } from "@/config/brand";

/** Logo + wordmark "meu[site]novo", igual ao meusitenovo.ia.br. */
export function BrandLogo({
  size = 36,
  className = "",
  light = false,
}: {
  size?: number;
  className?: string;
  /** Para fundos escuros (ex.: rodapé escuro). */
  light?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 font-extrabold tracking-tight ${light ? "text-white" : "text-slate-900"} ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={brand.logo} width={size} height={size} alt="" className="shrink-0" />
      <span className="whitespace-nowrap" aria-label={brand.name}>
        meu<span className={light ? "text-cyan-300" : "text-blue-600"}>site</span>novo
      </span>
    </span>
  );
}
