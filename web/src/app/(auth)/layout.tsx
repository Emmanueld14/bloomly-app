import { BrandLogo } from "@/components/BrandLogo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-gradient noise relative flex min-h-screen flex-col overflow-hidden">
      {/* Header with logo */}
      <header className="relative z-20 px-6 py-6 md:px-10 md:py-8">
        <BrandLogo imgClassName="h-10 w-auto max-w-[160px] object-contain md:h-11" />
      </header>

      {/* Main content area */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-5 pb-20 pt-4 md:pb-24">
        {children}
      </main>

      {/* Footer text */}
      <footer className="relative z-10 pb-6 text-center">
        <p className="text-xs text-[var(--fg-muted)] opacity-70">
          A calm space for mental wellness
        </p>
      </footer>
    </div>
  );
}
