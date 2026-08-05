import { BrandLogo } from "@/components/BrandLogo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-gradient noise flex min-h-screen flex-col">
      <div className="relative z-10 px-5 py-6 md:px-8">
        <BrandLogo />
      </div>
      <div className="relative z-10 flex flex-1 items-center justify-center px-5 pb-16">
        {children}
      </div>
    </div>
  );
}
