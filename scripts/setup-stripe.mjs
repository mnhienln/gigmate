// Creates the GigMate products in Stripe TEST MODE: the three musician plans and the billing portal
// settings. Safe to run again: it looks for what exists first and only creates what is missing.
//
//   NODE_USE_ENV_PROXY=1 npm run setup:stripe
//
// Uses STRIPE_SECRET_KEY (a placeholder in the cloud container, where the network proxy supplies the real
// test key). It refuses to run if the key turns out to be a LIVE key.

import Stripe from "stripe";
import { PLANS, TRIAL_DAYS } from "../src/lib/pricing.ts";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("Missing STRIPE_SECRET_KEY.");
  process.exit(1);
}
const stripe = new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });

const balance = await stripe.balance.retrieve();
if (balance.livemode) {
  console.error("This is a LIVE Stripe key. Refusing to continue. Use a test key.");
  process.exit(1);
}
console.log("Stripe test mode confirmed.");

// Product
const products = await stripe.products.list({ limit: 100, active: true });
let product = products.data.find((p) => p.metadata.gigmate === "musician-plan");
if (!product) {
  product = await stripe.products.create({
    name: "GigMate for musicians",
    description: "Apply to unlimited gigs near you.",
    metadata: { gigmate: "musician-plan" },
  });
  console.log("  created product", product.id);
} else {
  console.log("  product exists", product.id);
}

// Prices, found by lookup key
for (const plan of PLANS) {
  const found = await stripe.prices.list({ lookup_keys: [plan.lookupKey], active: true, limit: 1 });
  const existing = found.data[0];
  if (existing && existing.unit_amount === plan.cents && existing.recurring?.interval === plan.interval) {
    console.log(`  price exists: ${plan.label} $${plan.cents / 100}/${plan.interval} (${existing.id})`);
    continue;
  }
  const price = await stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: plan.cents,
    recurring: { interval: plan.interval },
    lookup_key: plan.lookupKey,
    transfer_lookup_key: true,
    nickname: plan.label,
  });
  console.log(`  created price: ${plan.label} $${plan.cents / 100}/${plan.interval} (${price.id})`);
}

// Billing portal: lets a musician update their card, see invoices and cancel
const configs = await stripe.billingPortal.configurations.list({ limit: 20 });
let config = configs.data.find((c) => c.metadata.gigmate === "portal");
if (!config) {
  config = await stripe.billingPortal.configurations.create({
    business_profile: { headline: "Manage your GigMate plan" },
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true, mode: "at_period_end" },
    },
    metadata: { gigmate: "portal" },
  });
  console.log("  created billing portal settings", config.id);
} else {
  console.log("  billing portal settings exist", config.id);
}

console.log(`Done. Free trial is ${TRIAL_DAYS} days, applied when a musician first subscribes.`);
