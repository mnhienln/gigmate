// End-to-end test for payments (phase 4), driven in a real browser at 375px against a LOCAL server.
//
// NEEDS: migration 0005_payments.sql applied, `npm run setup:stripe` run once, and the Stripe test key
// supplied by the cloud proxy. Everything uses Stripe TEST MODE; no real money can move.
//
// HOW TO RUN (in the Claude cloud container):
//   npm run build && NODE_USE_ENV_PROXY=1 npm start -- -p 3100 &
//   cd /tmp && NODE_USE_ENV_PROXY=1 S=/some/dir NODE_PATH=$(npm root -g) \
//     node --env-file=/home/user/gigmate/.env.local /home/user/gigmate/tests/e2e/payments-flow.cjs
//
// WHAT IS REAL AND WHAT IS SIMULATED
//  * Real: the app creates real Stripe Checkout Sessions. We read each one back FROM STRIPE and check the
//    amount, trial, mode and metadata. The test also makes a real test-mode subscription with Stripe's test card.
//  * Simulated: a headless browser cannot pay on Stripe's own page, so the confirmation message Stripe would send
//    to our webhook is built by the test and signed with the local webhook secret. We also check that forged,
//    unsigned and repeated messages do no harm.
//  * The free-cancellation success path needs the database to know who is calling, which the container cannot do
//    (see CLAUDE.md). It is checked for its error handling here and for real with REAL_KEYS=1 on the live site.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path');
const Stripe = require(path.join(__dirname, '..', '..', 'node_modules', 'stripe'));

const S = process.env.S || require('os').tmpdir(), base = process.env.BASE || 'http://localhost:3100', H = 'https://wbekcrhqodrphehktutt.supabase.co';
const REAL = process.env.REAL_KEYS === '1';
const SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', { httpClient: Stripe.createFetchHttpClient() });
let pass = 0, fail = 0;
const ok = (n, c, x = '') => { (c ? pass++ : fail++); console.log((c ? '  ok   ' : '  FAIL ') + n + (c ? '' : '  ' + String(x).slice(0, 260))); };
const curl = (args, input) => execFileSync('curl', ['-s', '-m', '60', ...args], input ? { input } : undefined).toString();
const sb = (method, url, body) => { const a = ['-X', method, H + url, '-H', 'apikey: proxy-injected', '-H', 'Content-Type: application/json', '-H', 'Prefer: return=representation']; if (body) a.push('-d', JSON.stringify(body)); const out = curl(a); try { return JSON.parse(out); } catch { return out; } };
const iso = (hours) => new Date(Date.now() + hours * 3600000).toISOString();
const stamp = Date.now();

/** Post a webhook message. With the right secret it is signed like Stripe signs it. Returns [status, body]. */
function postWebhook(event, { secret = SECRET, signed = true } = {}) {
  const payload = JSON.stringify(event);
  const headers = ['-H', 'Content-Type: application/json'];
  if (signed) headers.push('-H', 'Stripe-Signature: ' + stripe.webhooks.generateTestHeaderString({ payload, secret }));
  const out = curl(['-X', 'POST', base + '/api/stripe/webhook', ...headers, '-w', '\n%{http_code}', '--data-binary', '@-'], payload);
  const i = out.lastIndexOf('\n');
  return [Number(out.slice(i + 1)), out.slice(0, i)];
}
const evt = (type, object) => ({ id: 'evt_test_' + Math.random().toString(36).slice(2), object: 'event', type, created: Math.floor(Date.now() / 1000), livemode: false, data: { object } });
const sessionEvent = (o) => evt('checkout.session.completed', { object: 'checkout.session', id: 'cs_test_' + Math.random().toString(36).slice(2), payment_status: 'paid', ...o });

async function overflowAndTaps(p, name) {
  const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const small = await p.evaluate(() => [...document.querySelectorAll('a,button,summary,select,input:not(.sr-only):not([type=hidden]):not([type=checkbox])')].map(e => { const r = e.getBoundingClientRect(); return { t: (e.getAttribute('aria-label') || e.textContent || e.name || '').trim().slice(0, 22), h: Math.round(r.height), w: Math.round(r.width) }; }).filter(x => x.h > 0 && (x.h < 44 || x.w < 44)));
  ok(`${name}: no sideways scroll`, o === 0, o);
  ok(`${name}: tap targets >= 44px`, small.length === 0, JSON.stringify(small));
}

/** Click something that sends the browser to Stripe, and return the Stripe address it tried to open. */
async function clickToStripe(p, click, hostPattern) {
  let target = null;
  const onReq = (r) => { if (hostPattern.test(r.url())) target = target ?? r.url(); };
  p.on('request', onReq);
  await click();
  for (let i = 0; i < 40 && !target; i++) await p.waitForTimeout(500);
  p.off('request', onReq);
  return target;
}

(async () => {
  if (!SECRET) { console.error('Run with --env-file=.env.local so STRIPE_WEBHOOK_SECRET is set.'); process.exit(1); }
  const balance = await stripe.balance.retrieve();
  if (balance.livemode) { console.error('LIVE Stripe key detected. Refusing to run.'); process.exit(1); }

  const b = await chromium.launch();
  const created = { users: [], customers: [], slots: [] };
  const errs = [];
  try {
    const venue = sb('GET', "/rest/v1/profiles?display_name=eq.Front%20Room%20Bar&select=id")[0].id;

    // A fresh musician with NO plan
    const email = `e2e-pay-${stamp}@gigmate.test`;
    const u = JSON.parse(curl(['-X', 'POST', H + '/auth/v1/admin/users', '-H', 'apikey: proxy-injected', '-H', 'Content-Type: application/json', '-d', JSON.stringify({ email, password: 'testing-pass-123', email_confirm: true, user_metadata: { role: 'musician', display_name: 'E2E Pay Act' } })]));
    const mid = u.id; created.users.push(mid);
    sb('PATCH', `/rest/v1/musician_profiles?profile_id=eq.${mid}`, { genres: ['Folk'], rate_min_cents: 10000, rate_max_cents: 20000, bio: 'Payment test act' });
    sb('PATCH', `/rest/v1/profiles?id=eq.${mid}`, { neighborhood: 'Oregon District', onboarded_at: new Date().toISOString() });

    const mkSlot = (o) => { const r = sb('POST', '/rest/v1/gig_slots', { venue_id: venue, set_length_min: 90, pay_cents: 12000, genre: 'Folk', is_urgent: false, notes: 'e2e-pay', ...o })[0].id; created.slots.push(r); return r; };
    const soon = mkSlot({ starts_at: iso(48), pay_cents: 11100 });        // an ordinary open gig
    const far = mkSlot({ starts_at: iso(24 * 9), pay_cents: 22200 });     // will be boosted

    const mctx = await b.newContext({ viewport: { width: 375, height: 812 } });
    const m = await mctx.newPage(); m.on('pageerror', e => errs.push(String(e)));
    await m.goto(base + '/login'); await m.fill('input[name=email]', email); await m.fill('input[name=password]', 'testing-pass-123'); await m.click('button[type=submit]');
    await m.waitForURL('**/m/feed', { timeout: 30000 });

    console.log('No plan: browsing is free, applying is not');
    await m.goto(base + '/m/discover'); await m.waitForSelector('article');
    const tickets = m.locator('article', { hasText: 'Front Room Bar' });
    ok('tickets show "Subscribe to apply" instead of an Apply button', await tickets.first().locator('a:has-text("Subscribe to apply")').count() === 1 && await m.locator('button:has-text("Apply")').count() === 0);
    await m.goto(base + '/m/profile'); await m.waitForSelector('h1:has-text("E2E Pay Act")');
    ok('profile says there is no plan yet', /No plan yet/.test(await m.textContent('main')) && /Subscribe to apply for gigs/.test(await m.textContent('main')));
    await m.goto(base + '/m/subscribe'); await m.waitForSelector('h1:has-text("Your plan")');
    const subText = await m.textContent('main');
    ok('plans page shows all three prices and the free trial', /\$5/.test(subText) && /\$16/.test(subText) && /\$120/.test(subText) && /First 7 days free/.test(subText) && /save 37%/i.test(subText), subText.slice(0, 300));
    await m.screenshot({ path: S + '/pay-plans.png', fullPage: true });
    await overflowAndTaps(m, 'plans page');

    console.log('Subscribing: the checkout page Stripe is asked to show');
    const subUrl = await clickToStripe(m, () => m.click('button[aria-label="Choose the Monthly plan"]'), /checkout\.stripe\.com/);
    ok('choosing a plan sends the musician to a Stripe Checkout page', Boolean(subUrl && /cs_test_/.test(subUrl)), subUrl);
    const subSession = await stripe.checkout.sessions.retrieve(subUrl.match(/cs_test_[A-Za-z0-9]+/)[0], { expand: ['line_items'] });
    ok('the session is a subscription for the Monthly plan at $16', subSession.mode === 'subscription' && subSession.line_items.data[0].price.unit_amount === 1600 && subSession.line_items.data[0].price.recurring.interval === 'month' && subSession.line_items.data[0].price.lookup_key === 'gigmate_monthly');
    ok('it is tied to this musician and is in test mode', subSession.client_reference_id === mid && subSession.livemode === false);
    ok('it comes back to the plans page after paying', /\/m\/subscribe\?status=success/.test(subSession.success_url) && /\/m\/subscribe\?status=cancelled/.test(subSession.cancel_url));
    ok('nothing was granted just by starting checkout', sb('GET', `/rest/v1/subscriptions?musician_id=eq.${mid}&select=status`).length === 0);
    await m.goto(base + '/m/subscribe?status=success'); await m.waitForSelector('text=activating your plan');
    ok('coming back from Stripe without a webhook does NOT grant a plan', /activating your plan/.test(await m.textContent('main')) && sb('GET', `/rest/v1/subscriptions?musician_id=eq.${mid}&select=status`).length === 0);

    console.log('The webhook');
    const [noSig] = postWebhook(sessionEvent({ mode: 'subscription', client_reference_id: mid, subscription: 'sub_x' }), { signed: false });
    ok('a message with no signature is rejected', noSig === 400, noSig);
    const [badSig] = postWebhook(sessionEvent({ mode: 'subscription', client_reference_id: mid, subscription: 'sub_x' }), { secret: 'whsec_forged_by_someone_else' });
    ok('a message signed with the wrong secret is rejected', badSig === 400, badSig);
    ok('rejected messages changed nothing', sb('GET', `/rest/v1/subscriptions?musician_id=eq.${mid}&select=status`).length === 0);

    // A real test-mode subscription, built with Stripe's test card
    const customer = await stripe.customers.create({ email, metadata: { gigmate_test: '1', user_id: mid } }); created.customers.push(customer.id);
    const pm = await stripe.paymentMethods.attach('pm_card_visa', { customer: customer.id });
    await stripe.customers.update(customer.id, { invoice_settings: { default_payment_method: pm.id } });
    const monthly = (await stripe.prices.list({ lookup_keys: ['gigmate_monthly'], limit: 1 })).data[0];
    const sub = await stripe.subscriptions.create({ customer: customer.id, items: [{ price: monthly.id }], trial_period_days: 7, metadata: { user_id: mid } });
    ok('Stripe made a real test subscription that is trialing', sub.status === 'trialing');

    const completed = sessionEvent({ mode: 'subscription', client_reference_id: mid, customer: customer.id, subscription: sub.id });
    const [s1, body1] = postWebhook(completed);
    ok('a correctly signed "checkout completed" message is accepted', s1 === 200 && /subscription trialing/.test(body1), `${s1} ${body1}`);
    const row = sb('GET', `/rest/v1/subscriptions?musician_id=eq.${mid}&select=*`)[0];
    const daysLeft = (new Date(row.current_period_end).getTime() - Date.now()) / 86400000;
    ok('the plan was recorded: monthly, trialing, about 7 days left, linked to the Stripe customer', row.plan === 'monthly' && row.status === 'trialing' && daysLeft > 6 && daysLeft < 8 && row.stripe_customer_id === customer.id && row.stripe_subscription_id === sub.id, JSON.stringify(row));
    const [s2] = postWebhook(completed);
    const row2 = sb('GET', `/rest/v1/subscriptions?musician_id=eq.${mid}&select=*`)[0];
    ok('the same message sent again is harmless', s2 === 200 && row2.current_period_end === row.current_period_end && sb('GET', `/rest/v1/subscriptions?musician_id=eq.${mid}&select=musician_id`).length === 1);

    await m.goto(base + '/m/subscribe?status=success'); await m.waitForSelector('text=Free trial', { timeout: 20000 });
    ok('the plans page now shows the free trial and the plan', /Monthly plan/.test(await m.textContent('main')) && /trial ends/.test(await m.textContent('main')));
    await m.screenshot({ path: S + '/pay-active.png', fullPage: true });
    await overflowAndTaps(m, 'plans page with an active plan');
    const portal = await clickToStripe(m, () => m.click('button:has-text("Manage billing")'), /billing\.stripe\.com/);
    ok('"Manage billing" opens Stripe\'s billing page', Boolean(portal && /billing\.stripe\.com/.test(portal)), portal);
    await m.goto(base + '/m/profile'); await m.waitForSelector('h1:has-text("E2E Pay Act")');
    ok('the profile shows the plan', /Free trial/.test(await m.textContent('main')) && /Monthly/.test(await m.textContent('main')));
    await m.goto(base + '/m/discover'); await m.waitForSelector('article');
    ok('with a plan, tickets show Apply again', await tickets.first().locator('button:has-text("Apply")').count() === 1);
    await tickets.filter({ hasText: '$111' }).locator('button:has-text("Apply")').click();
    await m.waitForSelector('text=Applied. The venue can see', { timeout: 20000 });
    ok('the musician can now apply, and it is saved', sb('GET', `/rest/v1/applications?slot_id=eq.${soon}&musician_id=eq.${mid}&select=status`)[0]?.status === 'pending');

    console.log('Plan changes from Stripe');
    const cancelledSub = await stripe.subscriptions.cancel(sub.id);
    const [s3] = postWebhook(evt('customer.subscription.deleted', cancelledSub));
    ok('a cancelled plan message is accepted and recorded', s3 === 200 && sb('GET', `/rest/v1/subscriptions?musician_id=eq.${mid}&select=status`)[0].status === 'canceled');
    await m.goto(base + '/m/discover'); await m.waitForSelector('article');
    ok('after cancelling, Apply goes back to "Subscribe to apply"', await tickets.filter({ hasText: '$222' }).locator('a:has-text("Subscribe to apply")').count() === 1);
    await m.goto(base + '/m/subscribe'); await m.waitForSelector('h1:has-text("Your plan")');
    ok('a returning subscriber is not offered a second free trial', !/First 7 days free/.test(await m.textContent('main')) && /Choose plan/.test(await m.textContent('main')));

    console.log('Venue: boost a gig');
    const vctx = await b.newContext({ viewport: { width: 375, height: 812 } });
    const v = await vctx.newPage(); v.on('pageerror', e => errs.push(String(e)));
    await v.goto(base + '/login'); await v.click('button[value=venue]'); await v.waitForURL('**/v/calendar', { timeout: 30000 });
    await v.goto(base + '/v/calendar/' + far); await v.waitForSelector('section[aria-label="Boost this gig"]');
    ok('an open gig offers a $10 boost', /Boost this gig/.test(await v.textContent('main')) && await v.locator('button[aria-label="Boost this gig for $10"]').count() === 1);
    await v.screenshot({ path: S + '/pay-boost.png', fullPage: true });
    await overflowAndTaps(v, 'venue gig page with boost');
    const boostUrl = await clickToStripe(v, () => v.click('button[aria-label="Boost this gig for $10"]'), /checkout\.stripe\.com/);
    ok('"Boost" sends the venue to a Stripe Checkout page', Boolean(boostUrl && /cs_test_/.test(boostUrl)), boostUrl);
    const boostSession = await stripe.checkout.sessions.retrieve(boostUrl.match(/cs_test_[A-Za-z0-9]+/)[0]);
    ok('the session is a one-time $10 payment tied to this gig and venue', boostSession.mode === 'payment' && boostSession.amount_total === 1000 && boostSession.currency === 'usd' && boostSession.metadata.type === 'boost' && boostSession.metadata.slot_id === far && boostSession.metadata.venue_id === venue, JSON.stringify(boostSession.metadata));
    ok('starting the payment did not boost anything', sb('GET', `/rest/v1/gig_slots?id=eq.${far}&select=boosted_until`)[0].boosted_until === null);

    const boostEvent = sessionEvent({ mode: 'payment', metadata: { type: 'boost', slot_id: far, venue_id: venue }, amount_total: 1000 });
    const [b1, bb1] = postWebhook(boostEvent);
    const boosted1 = sb('GET', `/rest/v1/gig_slots?id=eq.${far}&select=boosted_until`)[0].boosted_until;
    const hours = (new Date(boosted1).getTime() - Date.now()) / 3600000;
    ok('a signed boost message boosts the gig for 24 hours', b1 === 200 && /gig boosted/.test(bb1) && hours > 23.9 && hours <= 24.01, `${b1} ${bb1} ${hours}`);
    const [b2, bb2] = postWebhook(boostEvent);
    ok('the same boost message sent again changes nothing', b2 === 200 && /already recorded/.test(bb2) && sb('GET', `/rest/v1/gig_slots?id=eq.${far}&select=boosted_until`)[0].boosted_until === boosted1 && sb('GET', `/rest/v1/boosts?slot_id=eq.${far}&select=id`).length === 1, bb2);
    const [b3] = postWebhook(sessionEvent({ mode: 'payment', metadata: { type: 'boost', slot_id: far, venue_id: venue }, amount_total: 1000 }));
    const stacked = (new Date(sb('GET', `/rest/v1/gig_slots?id=eq.${far}&select=boosted_until`)[0].boosted_until).getTime() - Date.now()) / 3600000;
    ok('a second paid boost adds another 24 hours', b3 === 200 && stacked > 47.9 && stacked <= 48.01, stacked);
    await v.goto(base + '/v/calendar/' + far); await v.waitForSelector('section[aria-label="Boost this gig"]');
    ok('the venue sees "Boosted" with the end time', /Boosted/.test(await v.textContent('section[aria-label="Boost this gig"]')) && /Showing first in Discover/.test(await v.textContent('main')));
    const [b4] = postWebhook(sessionEvent({ mode: 'payment', metadata: { type: 'boost', slot_id: '00000000-0000-4000-8000-000000000000', venue_id: venue }, amount_total: 1000 }));
    ok('a boost for a gig that no longer exists is acknowledged, not retried forever', b4 === 200);
    const [b5] = postWebhook(sessionEvent({ mode: 'payment', payment_status: 'unpaid', metadata: { type: 'boost', slot_id: soon, venue_id: venue } }));
    ok('an UNPAID boost message does nothing', b5 === 200 && sb('GET', `/rest/v1/gig_slots?id=eq.${soon}&select=boosted_until`)[0].boosted_until === null);

    await m.goto(base + '/m/discover'); await m.waitForSelector('article');
    const first = tickets.first();
    ok('Discover shows the boosted gig FIRST, marked Boosted, even though it is 9 days away', /Boosted/.test(await first.textContent()) && /\$222/.test(await first.textContent()), (await first.textContent()).slice(0, 120));
    await m.screenshot({ path: S + '/pay-discover-boosted.png' });

    console.log('Venue: cancel a confirmed gig');
    const lateSlot = mkSlot({ starts_at: iso(20), pay_cents: 33300 });
    sb('PATCH', `/rest/v1/gig_slots?id=eq.${lateSlot}`, { status: 'booked' });
    const lateBooking = sb('POST', '/rest/v1/bookings', { slot_id: lateSlot, musician_id: mid, venue_id: venue, agreed_pay_cents: 33300 })[0].id;
    await v.goto(base + '/v/calendar/' + lateSlot); await v.waitForSelector('text=Cancel this gig');
    await v.click('summary:has-text("Cancel this gig")');
    ok('a gig under 48 hours away warns about the $25 fee and the public record', /costs \$25/.test(await v.textContent('main')) && /late cancellation/.test(await v.textContent('main')) && await v.locator('button[aria-label="Pay $25 and cancel the gig"]').count() === 1);
    await v.screenshot({ path: S + '/pay-cancel-late.png', fullPage: true });
    await overflowAndTaps(v, 'venue gig page with cancel warning');
    const cancelUrl = await clickToStripe(v, () => v.click('button[aria-label="Pay $25 and cancel the gig"]'), /checkout\.stripe\.com/);
    ok('"Pay $25 and cancel" sends the venue to Stripe Checkout', Boolean(cancelUrl && /cs_test_/.test(cancelUrl)), cancelUrl);
    const cancelSession = await stripe.checkout.sessions.retrieve(cancelUrl.match(/cs_test_[A-Za-z0-9]+/)[0]);
    ok('the session is a one-time $25 payment tied to that booking', cancelSession.mode === 'payment' && cancelSession.amount_total === 2500 && cancelSession.metadata.type === 'late_cancellation' && cancelSession.metadata.booking_id === lateBooking && cancelSession.metadata.venue_id === venue, JSON.stringify(cancelSession.metadata));
    ok('the gig is NOT cancelled until the payment is confirmed', sb('GET', `/rest/v1/bookings?id=eq.${lateBooking}&select=cancelled_at`)[0].cancelled_at === null);
    await v.goto(base + '/v/calendar/' + lateSlot + '?cancelled=paid'); await v.waitForSelector('text=Payment received');
    ok('coming back from Stripe without the webhook still does not cancel', sb('GET', `/rest/v1/bookings?id=eq.${lateBooking}&select=cancelled_at`)[0].cancelled_at === null);

    const cancelEvent = sessionEvent({ mode: 'payment', metadata: { type: 'late_cancellation', booking_id: lateBooking, venue_id: venue, slot_id: lateSlot }, amount_total: 2500 });
    const [c1, cb1] = postWebhook(cancelEvent);
    const bk = sb('GET', `/rest/v1/bookings?id=eq.${lateBooking}&select=cancelled_at,cancelled_late,cancel_fee_cents,cancelled_by`)[0];
    ok('a signed message after payment cancels the gig and records the late fee', c1 === 200 && /cancelled/.test(cb1) && bk.cancelled_at && bk.cancelled_late === true && bk.cancel_fee_cents === 2500 && bk.cancelled_by === venue && sb('GET', `/rest/v1/gig_slots?id=eq.${lateSlot}&select=status`)[0].status === 'cancelled', `${c1} ${cb1} ${JSON.stringify(bk)}`);
    const [c2] = postWebhook(cancelEvent);
    ok('the same cancellation message sent again changes nothing', c2 === 200 && sb('GET', `/rest/v1/bookings?id=eq.${lateBooking}&select=cancelled_at`)[0].cancelled_at === bk.cancelled_at);

    await m.goto(base + '/m/bookings?tab=confirmed'); await m.waitForSelector('h1:has-text("Bookings")');
    await m.waitForSelector('text=Cancelled by the venue', { timeout: 15000 });
    ok('the musician sees the gig under "Cancelled by the venue" with the late note', /less than 48 hours/.test(await m.textContent('main')));
    await m.screenshot({ path: S + '/pay-musician-cancelled.png', fullPage: true });
    await v.goto(base + '/v/profile'); await v.waitForSelector('section[aria-label="Reliability"]');
    ok('the venue profile counts 1 late cancellation', /1\s*late cancellation(?!s)/.test(await v.textContent('section[aria-label="Reliability"]')), await v.textContent('section[aria-label="Reliability"]'));
    await v.screenshot({ path: S + '/pay-venue-reliability.png', fullPage: true });
    await m.goto(base + '/m/discover'); await m.waitForSelector('article');
    ok('musicians see the venue\'s record on its tickets ("Cancelled late 1 time")', /Cancelled late 1 time/.test(await tickets.first().textContent()), (await tickets.first().textContent()).slice(0, 220));
    await m.screenshot({ path: S + '/pay-discover-reliability.png' });
    await v.goto(base + '/v/calendar/' + lateSlot); await v.waitForSelector('h1');
    ok('a cancelled gig no longer offers Cancel or Gig happened', await v.locator('summary:has-text("Cancel this gig")').count() === 0 && await v.locator('button:has-text("Gig happened")').count() === 0);

    const freeSlot = mkSlot({ starts_at: iso(24 * 10), pay_cents: 44400 });
    sb('PATCH', `/rest/v1/gig_slots?id=eq.${freeSlot}`, { status: 'booked' });
    const freeBooking = sb('POST', '/rest/v1/bookings', { slot_id: freeSlot, musician_id: mid, venue_id: venue, agreed_pay_cents: 44400 })[0].id;
    await v.goto(base + '/v/calendar/' + freeSlot); await v.waitForSelector('text=Cancel this gig');
    await v.click('summary:has-text("Cancel this gig")');
    ok('a gig 48+ hours away says cancelling is free', /free/i.test(await v.textContent('main')) && await v.locator('button[aria-label="Yes, cancel the gig"]').count() === 1);
    await v.click('button[aria-label="Yes, cancel the gig"]');
    if (REAL) {
      await v.waitForURL('**cancelled=free', { timeout: 30000 });
      const fb = sb('GET', `/rest/v1/bookings?id=eq.${freeBooking}&select=cancelled_at,cancelled_late,cancel_fee_cents`)[0];
      ok('REAL: free cancellation works and records no fee, not late', fb.cancelled_at && fb.cancelled_late === false && fb.cancel_fee_cents === 0, JSON.stringify(fb));
    } else {
      await v.waitForURL('**cancelled=error', { timeout: 30000 });
      ok('(container limit) the refused free cancellation shows a plain message and charges nothing', /could not cancel/.test(await v.textContent('main')) && sb('GET', `/rest/v1/bookings?id=eq.${freeBooking}&select=cancelled_at`)[0].cancelled_at === null);
    }

    console.log('Role guards on the new pages');
    await v.goto(base + '/m/subscribe'); await v.waitForLoadState('networkidle');
    ok('a venue cannot open the musician plans page', new URL(v.url()).pathname === '/v/calendar', v.url());
    const [rp] = postWebhook(evt('payment_intent.succeeded', { object: 'payment_intent', id: 'pi_x' }));
    ok('events we do not use are accepted and ignored', rp === 200);
  } catch (e) {
    fail++; console.log('  FAIL script error: ' + String(e).split('\n')[0]);
  } finally {
    console.log('Cleanup');
    try {
      for (const id of created.slots) sb('DELETE', `/rest/v1/gig_slots?id=eq.${id}`);
      for (const id of created.users) curl(['-o', '/dev/null', '-X', 'DELETE', `${H}/auth/v1/admin/users/${id}`, '-H', 'apikey: proxy-injected']);
      for (const cid of created.customers) { try { await stripe.customers.del(cid); } catch { /* already gone */ } }
    } catch (e) { console.log('  cleanup problem: ' + String(e).split('\n')[0]); }
    console.log(`  removed ${created.slots.length} test gigs, ${created.users.length} test user, ${created.customers.length} Stripe test customer`);
    console.log('page errors:', JSON.stringify(errs));
    console.log(`\n${pass} passed, ${fail} failed`);
    await b.close(); process.exit(fail ? 1 : 0);
  }
})();
