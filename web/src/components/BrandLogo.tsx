import Link from "next/link";

type BrandLogoProps = {
  href?: string;
  className?: string;
  imgClassName?: string;
};

export function BrandLogo({
  href = "/",
  className,
  imgClassName,
}: BrandLogoProps) {
  return (
    <Link href={href} className={className ?? "inline-flex items-center"}>
      {/* Static brand mark served from site root */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.svg"
        alt="Bloomly logo"
        className={imgClassName ?? "h-8 w-auto max-w-[150px] object-contain md:h-9"}
        decoding="async"
      />
    </Link>
  );
}
