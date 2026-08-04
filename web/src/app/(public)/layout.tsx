import { SiteFooter } from "@/components/public/SiteFooter";
import { SiteHeader } from "@/components/public/SiteHeader";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-gradient noise flex min-h-screen flex-col">
      <SiteHeader />
      <main className="relative z-10 flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
