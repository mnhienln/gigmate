import { getStripe } from "@/lib/stripe";
import { handleStripeEvent } from "@/lib/stripe/events";

/*
  Stripe calls this address after a payment or a plan change. Anyone on the internet can send a
  request here, so the first job is to check the signature: Stripe signs each message with a secret
  only we and Stripe know. A request without a valid signature is rejected before anything is read.
  The raw text of the body is needed for that check, so it is read with request.text(), not as JSON.

  Returning an error status makes Stripe retry later, which is what we want if our database was
  briefly unavailable. Every handler is safe to run twice.
*/
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook is not configured.", { status: 500 });

  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature.", { status: 400 });

  const body = await request.text();
  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return new Response("Invalid signature.", { status: 400 });
  }

  try {
    const result = await handleStripeEvent(event);
    return Response.json({ received: true, result });
  } catch (error) {
    console.error("Stripe webhook failed", event.type, event.id, error instanceof Error ? error.message : error);
    return new Response("Could not process the event.", { status: 500 });
  }
}
