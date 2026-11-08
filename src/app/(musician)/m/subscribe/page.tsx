import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { formatDay, dayOf } from "@/lib/dates";
import { formatUsd } from "@/lib/money";
import { PLANS, TRIAL_DAYS } from "@/lib/pricing";
import { getMySubscription } from "@/lib/musician/subscription";
import { openBillingPortal, startSubscription } from "@/app/(musician)/m/payments-actions";
import { ActivationWatcher } from "@/components/musician/activation-watcher";
import { FormMessage } from "@/components/ui/form-message";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata = { title: "Your plan | GiGmate" };

const ERRORS: Record<string, string> = {
  plan: "Pick one of the plans below.",
  setup: "Plans are not set up yet. Please tell the team.",
  checkout: "We could not open the payment page. You were not charged. Please try again.",
  portal: "We could not open billing settings. Please try again in a moment.",
};

async function Content({ searchParams }: { searchParams: PageProps<"/m/subscribe">["searchParams"] }) {
  const profile = await requireRole("musician");
  const sp = await searchParams;
  const mine = await getMySubscription(profile.id);
  const waiting = sp.status === "success" && !mine.active;
  const error = typeof sp.error === "string" ? (ERRORS[sp.error] ?? ERRORS.checkout) : undefined;

  return (
    <div className="flex flex-col gap-5 px-5 pt-5">
      {waiting && <ActivationWatcher />}
      <Link href="/m/profile" className="-ml-2 flex min-h-11 w-fit items-center gap-1 px-2 font-mono text-[12px] font-bold uppercase tracking-wide">
        <ChevronLeft size={18} aria-hidden /> Profile
      </Link>

      <header>
        <h1 className="font-display text-[40px] uppercase leading-none">Your plan</h1>
        <p className="mt-2 text-base text-ink-muted">Browsing gigs is always free. A plan lets you apply to as many gigs as you like.</p>
      </header>

      <FormMessage error={error} />
      {sp.status === "cancelled" && <FormMessage message="No problem. You were not charged." />}
      {waiting && <FormMessage message="Thank you. We are activating your plan now. This takes a few seconds." />}
      {sp.status === "success" && mine.active && <FormMessage message="You are all set. Go find a gig!" />}

      {mine.active ? (
        <section aria-label="Your current plan" className="flex flex-col gap-4 rounded-2xl bg-panel p-5 text-panel-ink">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold">{mine.inTrial ? "Free trial" : "Subscribed"}</p>
          <p className="font-display text-3xl uppercase leading-none">{PLANS.find((p) => p.id === mine.plan)?.label ?? "Your"} plan</p>
          {mine.renewsAt && (
            <p className="text-base">
              {mine.inTrial ? "Your trial ends and billing starts " : "Renews "}
              <span className="font-bold">{formatDay(dayOf(mine.renewsAt))}</span>.
            </p>
          )}
          <form action={openBillingPortal}>
            <SubmitButton pendingText="Opening...">Manage billing</SubmitButton>
          </form>
          <Link href="/m/discover" className="flex min-h-12 items-center justify-center rounded-full border-2 border-panel-ink px-6 font-display text-lg uppercase tracking-wide">
            Find a gig
          </Link>
        </section>
      ) : (
        <section aria-label="Choose a plan" className="flex flex-col gap-4">
          {!mine.hadPlan && (
            <p className="rounded-2xl bg-gold px-4 py-3 font-mono text-[12px] font-bold uppercase tracking-wide text-gold-ink">
              First {TRIAL_DAYS} days free. Cancel any time.
            </p>
          )}
          {PLANS.map((plan) => (
            <form key={plan.id} action={startSubscription} className="flex flex-col gap-3 rounded-2xl border-2 border-ink p-5">
              <input type="hidden" name="plan" value={plan.id} />
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-3xl uppercase leading-none">{plan.label}</h2>
                <p className="font-display text-3xl leading-none">
                  {formatUsd(plan.cents)}
                  <span className="font-mono text-[12px] uppercase text-ink-muted"> / {plan.interval}</span>
                </p>
              </div>
              <p className="font-mono text-[12px] uppercase tracking-wide text-ink-muted">{plan.blurb}</p>
              <SubmitButton pendingText="Opening payment..." label={`Choose the ${plan.label} plan`}>
                {mine.hadPlan ? "Choose plan" : `Start ${TRIAL_DAYS} days free`}
              </SubmitButton>
            </form>
          ))}
          <p className="rounded-2xl border-2 border-dashed border-line p-4 text-sm text-ink-muted">
            Demo mode: payments use Stripe&apos;s test cards, so no real money moves. Try card 4242 4242 4242 4242, any future date and any 3 digits.
          </p>
        </section>
      )}
    </div>
  );
}

export default function SubscribePage(props: PageProps<"/m/subscribe">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}
