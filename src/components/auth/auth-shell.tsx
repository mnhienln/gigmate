import Link from "next/link";
import { Stripes } from "@/components/ui/stripes";

/** Shared frame for login, signup and onboarding: logo, stripes, one column. */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div data-theme="poster" className="min-h-dvh bg-bg text-ink">
      <main className="mx-auto flex w-full max-w-[520px] flex-col gap-6 px-5 pb-12 pt-5">
        <header>
          <Link href="/" className="flex min-h-11 items-center font-logo text-[40px] font-black italic leading-none tracking-tight text-brick">
            GiGmate
          </Link>
          <div className="mt-3">
            <Stripes />
          </div>
        </header>
        <div>
          <h1 className="font-display text-[40px] uppercase leading-none">{title}</h1>
          {subtitle && <p className="mt-2 text-base text-ink-muted">{subtitle}</p>}
        </div>
        {children}
      </main>
    </div>
  );
}
