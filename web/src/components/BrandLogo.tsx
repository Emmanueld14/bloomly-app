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
        src="/images/bloomly-wordmark-v2.svg"
        alt="Bloomly logo"
        className={imgClassName ?? "h-9 w-auto max-w-[180px] object-contain md:h-10"}
        decoding="async"
      />
    </Link>
  );
}
