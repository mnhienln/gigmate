import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PlanId } from "@/lib/pricing";

export type MySubscription = {
  /** Can apply to gigs right now. The database makes the final decision; this is for showing the right button. */
  active: boolean;
  plan: PlanId | null;
  status: string;
  renewsAt: string | null;
  inTrial: boolean;
  customerId: string | null;
  /** Has had a plan before (so no second free trial). */
  hadPlan: boolean;
};

/** The signed-in musician's own plan. Users can read their own row; only the server can write it. */
export async function getMySubscription(musicianId: string): Promise<MySubscription> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("plan, status, current_period_end, trial_end, stripe_customer_id, stripe_subscription_id")
    .eq("musician_id", musicianId)
    .maybeSingle();

  const end = data?.current_period_end ? new Date(data.current_period_end).getTime() : 0;
  const status = (data?.status as string | undefined) ?? "none";
  return {
    active: (status === "trialing" || status === "active") && end > Date.now(),
    plan: (data?.plan as PlanId | null | undefined) ?? null,
    status,
    renewsAt: data?.current_period_end ?? null,
    inTrial: status === "trialing",
    customerId: (data?.stripe_customer_id as string | null | undefined) ?? null,
    hadPlan: Boolean(data?.stripe_subscription_id),
  };
}
