"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/*
  After paying, a musician lands back here a moment BEFORE Stripe's confirmation reaches our server (the webhook).
  This quietly re-checks every two seconds for up to 40 seconds, so the page flips to "You are subscribed" by
  itself. It only refreshes the page; the plan is granted by the webhook, never by this component.
*/
export function ActivationWatcher() {
  const router = useRouter();
  useEffect(() => {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      router.refresh();
      if (tries >= 20) clearInterval(timer);
    }, 2000);
    return () => clearInterval(timer);
  }, [router]);
  return null;
}
