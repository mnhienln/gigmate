import "server-only";
import Stripe from "stripe";
import { need } from "@/lib/env";

/*
  The Stripe connection. Server only: the secret key must never reach the browser.
  We use the fetch-based HTTP client because it works the same on Vercel and inside the cloud
  container, where only fetch follows the network proxy.
*/
let client: Stripe | undefined;
export function getStripe(): Stripe {
  client ??= new Stripe(need(process.env.STRIPE_SECRET_KEY, "STRIPE_SECRET_KEY"), {
    httpClient: Stripe.createFetchHttpClient(),
    maxNetworkRetries: 2,
  });
  return client;
}
