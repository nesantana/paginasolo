import { brand } from "@/config/brand";

/** Logo + wordmark "meu[site]novo", igual ao meusitenovo.ia.br. */
export function BrandLogo({
  size = 36,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 font-extrabold tracking-tight text-white ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={brand.logo} width={size} height={size} alt="" className="shrink-0" />
      <span className="whitespace-nowrap" aria-label={brand.name}>
        meu
        <span className="bg-gradient-to-r from-[#06b6d4] via-[#3b82f6] to-[#6366f1] bg-clip-text px-0.5 text-transparent">
          site
        </span>
        novo
      </span>
    </span>
  );
}
