import Link from "next/link";

// Temporary entry point. In phase 1 this becomes the login / role-choice screen.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-6">
      <h1 className="font-logo text-6xl italic text-brick">GigMate</h1>
      <p className="text-lg">
        Local musicians and venues, connected. Preview the two apps:
      </p>
      <Link
        href="/m/feed"
        className="flex min-h-12 items-center justify-center rounded-full bg-gold px-6 font-display text-xl uppercase tracking-wide text-gold-ink"
      >
        I am a musician
      </Link>
      <Link
        href="/v/calendar"
        className="flex min-h-12 items-center justify-center rounded-full border-2 border-ink px-6 font-display text-xl uppercase tracking-wide"
      >
        I run a venue
      </Link>
    </main>
  );
}
