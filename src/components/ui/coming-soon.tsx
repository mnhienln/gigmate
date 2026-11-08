import Link from "next/link";

/*
  Empty-state placeholder. The design rule is "empty states suggest a next
  step", so every one of these carries a button that leads somewhere useful.
*/
export function ComingSoon({
  title,
  body,
  nextHref,
  nextLabel,
}: {
  title: string;
  body: string;
  nextHref: string;
  nextLabel: string;
}) {
  return (
    <section className="flex flex-col items-start gap-4 px-5 py-10">
      <h1 className="font-display text-4xl uppercase leading-none">{title}</h1>
      <p className="max-w-sm text-base text-ink-muted">{body}</p>
      <Link
        href={nextHref}
        className="flex min-h-12 items-center rounded-full bg-gold px-6 font-display text-lg uppercase tracking-wide text-gold-ink"
      >
        {nextLabel}
      </Link>
    </section>
  );
}
