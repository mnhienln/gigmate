import Link from "next/link";
import { Stripes } from "@/components/ui/stripes";

export default function Home() {
  return (
    <div data-theme="poster" className="min-h-dvh bg-bg text-ink">
      <main className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col justify-center gap-6 px-5 py-10">
        <div>
          <h1 className="font-logo text-[64px] font-black italic leading-none tracking-tight text-brick">GigMate</h1>
          <div className="mt-4">
            <Stripes />
          </div>
        </div>
        <p className="font-display text-[34px] uppercase leading-[1.05]">
          Fill the night. Find the gig.
        </p>
        <p className="text-lg text-ink-muted">
          Local musicians and venues in Dayton, connected. Venues post open nights. Musicians apply in one tap.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/signup"
            className="flex min-h-14 items-center justify-center rounded-full bg-gold px-8 font-display text-xl uppercase tracking-wide text-gold-ink"
          >
            Create an account
          </Link>
          <Link
            href="/login"
            className="flex min-h-14 items-center justify-center rounded-full border-2 border-ink px-8 font-display text-xl uppercase tracking-wide"
          >
            Log in
          </Link>
        </div>
      </main>
    </div>
  );
}
