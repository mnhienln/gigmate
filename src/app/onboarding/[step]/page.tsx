import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { StepForm } from "@/components/onboarding/step-form";
import { ChipGroup, Field, Select, TextArea, Toggle } from "@/components/ui/field";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { getCurrentProfile, homeFor } from "@/lib/auth";
import { GENRES, NEIGHBORHOODS, VENUE_TYPES } from "@/lib/options";

export const metadata = { title: "Set up your profile | GiGmate" };

const TITLES = {
  musician: ["Your sound", "Your rate", "Show your work"],
  venue: ["Your venue", "Your stage", "Where to find you"],
} as const;

function Progress({ step }: { step: number }) {
  return (
    <div aria-label={`Step ${step} of 3`} role="img" className="flex gap-2">
      {[1, 2, 3].map((n) => (
        <span key={n} className={`h-2 flex-1 rounded-full ${n <= step ? "bg-brick" : "bg-line"}`} />
      ))}
    </div>
  );
}

async function Step({ params }: { params: PageProps<"/onboarding/[step]">["params"] }) {
  const { step: raw } = await params;
  const step = Number(raw);
  if (![1, 2, 3].includes(step)) redirect("/onboarding/1");

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.onboarded_at) redirect(homeFor(profile.role));

  const title = TITLES[profile.role][step - 1];

  return (
    <AuthShell title={title} subtitle={`Step ${step} of 3`}>
      <Progress step={step} />
      <StepForm step={step} last={step === 3}>
        {profile.role === "musician" && step === 1 && (
          <>
            <ChipGroup legend="Your genres (pick up to 5)" name="genres" options={GENRES} />
            <Select label="Your neighborhood" name="neighborhood" options={NEIGHBORHOODS} />
          </>
        )}
        {profile.role === "musician" && step === 2 && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Lowest rate ($)" name="rate_min" type="number" inputMode="numeric" min={0} required />
              <Field label="Top rate ($)" name="rate_max" type="number" inputMode="numeric" min={0} required />
            </div>
            <TextArea label="Short bio" name="bio" maxLength={300} hint="Optional. Up to 300 characters." />
          </>
        )}
        {profile.role === "musician" && step === 3 && (
          <>
            <Field label="Link to your music" name="media_url" type="url" inputMode="url" placeholder="https://" hint="Optional. A YouTube, Spotify or SoundCloud link." />
            <Toggle label="I am available to play tonight" name="available_tonight" />
          </>
        )}
        {profile.role === "venue" && step === 1 && (
          <>
            <Select label="Venue type" name="venue_type" options={VENUE_TYPES} />
            <Select label="Neighborhood" name="neighborhood" options={NEIGHBORHOODS} />
          </>
        )}
        {profile.role === "venue" && step === 2 && (
          <>
            <Field label="Capacity" name="capacity" type="number" inputMode="numeric" min={1} required />
            <Toggle label="We have a PA system" name="has_pa" />
            <TextArea label="Stage notes" name="stage_notes" maxLength={300} hint="Optional. Stage size, power, load-in." />
          </>
        )}
        {profile.role === "venue" && step === 3 && (
          <Field label="Street address" name="address" autoComplete="street-address" required />
        )}
      </StepForm>
    </AuthShell>
  );
}

export default function OnboardingPage(props: PageProps<"/onboarding/[step]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Step params={props.params} />
    </Suspense>
  );
}
