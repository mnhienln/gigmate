// End-to-end test for the venue flow (phase 2), driven in a real browser at 375px.
//
// HOW TO RUN (in the Claude cloud container):
//   npm run build && NODE_USE_ENV_PROXY=1 npm start -- -p 3100 &
//   cd /tmp && S=/some/dir NODE_PATH=$(npm root -g) node /home/user/gigmate/tests/e2e/venue-flow.cjs
//
// ASSUMPTIONS (container only):
//  - the cloud proxy injects the Supabase secret key, so the "apikey: proxy-injected" curl calls work;
//  - demo accounts exist (npm run demo:users);
//  - because the proxy key hides the user's identity from the database, the accept and
//    "gig happened" success paths cannot run here. This script checks their error handling,
//    then emulates the result with direct writes. Verify those two on a deployment that uses
//    real keys. The database logic itself is covered by `npm run test:db`.
// The script creates 2 test musicians and some slots on the demo venue and deletes them at the end.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const S = process.env.S || require('os').tmpdir(), base = process.env.BASE || 'http://localhost:3100', H = 'https://wbekcrhqodrphehktutt.supabase.co';
let pass = 0, fail = 0;
const ok = (n, c, x = '') => { (c ? pass++ : fail++); console.log((c ? '  ok   ' : '  FAIL ') + n + (c ? '' : '  ' + String(x).slice(0, 220))); };
const path = (p) => new URL(p.url()).pathname + new URL(p.url()).search;
const sb = (method, url, body) => { const a = ['-s', '-m', '30', '-X', method, H + url, '-H', 'apikey: proxy-injected', '-H', 'Content-Type: application/json', '-H', 'Prefer: return=representation']; if (body) a.push('-d', JSON.stringify(body)); const out = execFileSync('curl', a).toString(); try { return JSON.parse(out); } catch { return out; } };
const nyDate = (offset = 0) => { const d = new Date(Date.now() + offset * 86400000); return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(d); };
const stamp = Date.now();
const created = { users: [] };

async function overflowAndTaps(p, name) {
  const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const small = await p.evaluate(() => [...document.querySelectorAll('a,button,summary,select,input:not(.sr-only):not([type=hidden]):not([type=checkbox])')].map(e => { const r = e.getBoundingClientRect(); return { t: (e.getAttribute('aria-label') || e.textContent || e.name || '').trim().slice(0, 22), h: Math.round(r.height), w: Math.round(r.width) }; }).filter(x => x.h > 0 && (x.h < 44 || x.w < 44)));
  ok(`${name}: no sideways scroll`, o === 0, o);
  ok(`${name}: tap targets >= 44px`, small.length === 0, JSON.stringify(small));
}

(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 375, height: 812 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));

  try {
    console.log('Calendar and posting');
    await p.goto(base + '/login'); await p.click('button[value=venue]'); await p.waitForURL('**/v/calendar', { timeout: 25000 });
    await p.waitForSelector('text=Your calendar');
    ok('calendar loads with the primary action', await p.locator('a:has-text("Post a gig")').count() === 1);
    ok('urgent flow is prominent', await p.locator('text=Need an act tonight?').count() === 1);
    await p.screenshot({ path: S + '/v-calendar-empty.png', fullPage: true });
    await overflowAndTaps(p, 'calendar');

    const gigDay = nyDate(3);
    await p.click('a:has-text("Post a gig")'); await p.waitForURL('**/v/calendar/new**');
    await p.fill('input[name=date]', gigDay); await p.fill('input[name=time]', '20:00');
    await p.selectOption('select[name=set_length_min]', '120'); await p.fill('input[name=pay]', '150');
    await p.selectOption('select[name=genre]', 'Folk'); await p.click('text=PA system'); await p.click('text=Mics');
    await p.fill('textarea[name=notes]', 'Load in at 7');
    await p.screenshot({ path: S + '/v-new.png', fullPage: true });
    await overflowAndTaps(p, 'post-a-gig form');
    await p.click('button[type=submit]'); await p.waitForURL('**/v/calendar?day=' + gigDay, { timeout: 20000 });
    await p.waitForSelector('text=$150');
    ok('posted gig appears on its day', await p.locator('a:has-text("$150")').count() === 1);
    ok('card shows 8:00 PM', (await p.locator('a:has-text("$150")').textContent()).includes('8:00'), await p.locator('a:has-text("$150")').textContent());

    await p.goto(base + '/v/calendar/new'); await p.fill('input[name=date]', nyDate(-1)); await p.fill('input[name=time]', '20:00'); await p.fill('input[name=pay]', '100');
    await p.click('button[type=submit]'); await p.waitForSelector('form p[role=alert]');
    ok('a date in the past is rejected', /past/.test(await p.textContent('form p[role=alert]')), await p.textContent('form p[role=alert]'));

    console.log('Need an act tonight');
    await p.goto(base + '/v/calendar/tonight'); await p.waitForSelector('text=Need an act tonight');
    await p.screenshot({ path: S + '/v-tonight.png', fullPage: true });
    ok('urgent form hides the date', await p.locator('input[type=date]').count() === 0);
    await p.fill('input[name=time]', '00:01'); await p.fill('input[name=pay]', '90');
    await p.click('button[type=submit]'); await p.waitForSelector('form p[role=alert]');
    ok('a start time already passed tonight is rejected', /already passed/.test(await p.textContent('form p[role=alert]')), await p.textContent('form p[role=alert]'));
    await p.fill('input[name=time]', '23:55'); await p.fill('input[name=pay]', '90'); await p.selectOption('select[name=genre]', 'Rock');
    await p.click('button[type=submit]'); await p.waitForURL('**/v/calendar?day=*', { timeout: 20000 });
    await p.waitForSelector('text=$90');
    ok('tonight slot shows the Tonight badge', await p.locator('a:has-text("$90") >> text=Tonight').count() === 1);
    await p.screenshot({ path: S + '/v-calendar-tonight.png', fullPage: true });

    console.log('Requests, compare, accept');
    const venueId = sb('GET', "/rest/v1/profiles?display_name=eq.Front%20Room%20Bar&select=id")[0].id;
    const slots = sb('GET', `/rest/v1/gig_slots?venue_id=eq.${venueId}&select=id,pay_cents,is_urgent&order=created_at`);
    const gigSlot = slots.find(s => s.pay_cents === 15000).id, tonightSlot = slots.find(s => s.pay_cents === 9000).id;
    const mkMusician = (name, genres, min, max, link, tonight) => {
      const u = sb('POST', '/auth/v1/admin/users', { email: `e2e-${name.replace(/\W/g, '').toLowerCase()}-${stamp}@gigmate.test`, password: 'testing-pass-123', email_confirm: true, user_metadata: { role: 'musician', display_name: name } });
      created.users.push(u.id);
      sb('PATCH', `/rest/v1/musician_profiles?profile_id=eq.${u.id}`, { genres, rate_min_cents: min, rate_max_cents: max, bio: `${name} bio text`, media_links: link ? [{ label: 'Listen', url: link }] : [], available_tonight: tonight });
      sb('PATCH', `/rest/v1/profiles?id=eq.${u.id}`, { neighborhood: 'Oregon District', onboarded_at: new Date().toISOString() });
      return u.id;
    };
    const A = mkMusician('E2E Alto Quartet', ['Jazz', 'Soul and R&B'], 20000, 40000, 'https://example.com/alto', false);
    const B = mkMusician('E2E Solo Sam', ['Folk'], 10000, 15000, null, true);
    sb('POST', '/rest/v1/applications', [{ slot_id: gigSlot, musician_id: A }, { slot_id: gigSlot, musician_id: B }]);

    await p.goto(base + '/v/requests'); await p.waitForSelector('text=E2E Alto Quartet');
    ok('both applicants are listed', await p.locator('article').count() === 2);
    ok('rate is shown', (await p.textContent('main')).includes('$200 to $400') && (await p.textContent('main')).includes('$100 to $150'));
    ok('new musicians show "New" instead of a rating', (await p.textContent('main')).includes('New, no reviews yet'));
    await p.screenshot({ path: S + '/v-requests.png', fullPage: true });
    await overflowAndTaps(p, 'requests');

    await p.click('button:has-text("Compare 2 side by side")'); await p.waitForURL('**/v/requests?error=pick');
    await p.waitForSelector('main p[role=alert]', { timeout: 15000 });
    ok('comparing with nothing ticked explains what to do', /exactly two/.test(await p.textContent('main p[role=alert]')), await p.textContent('main'));
    for (const t of await p.locator('input[name=c]').all()) await t.check();
    await p.click('button:has-text("Compare 2 side by side")'); await p.waitForURL('**/v/requests/compare**');
    ok('compare page shows both names', (await p.locator('h2').allTextContents()).join('|').includes('E2E Alto Quartet') && (await p.locator('h2').allTextContents()).join('|').includes('E2E Solo Sam'));
    await p.waitForSelector('h2:has-text("E2E Alto Quartet")'); await p.screenshot({ path: S + '/v-compare.png', fullPage: true });
    await overflowAndTaps(p, 'compare');

    // CONTAINER LIMITATION: the proxy injects the secret key, so the database cannot see who is
    // calling and accept_application() correctly refuses. We verify the app shows the right message,
    // then emulate the outcome with direct writes so the rest of the screens can be checked.
    await p.locator('button:has-text("Accept")').first().click(); await p.waitForURL('**/v/requests?error=notyours', { timeout: 20000 });
    await p.waitForSelector('main p[role=alert]', { timeout: 15000 });
    ok('(container limit) refused accept shows a plain message', /only answer applications for your own|only accept applicants for your own/i.test(await p.textContent('main p[role=alert]')) || /own gigs/.test(await p.textContent('main p[role=alert]')), await p.textContent('main p[role=alert]'));
    sb('PATCH', `/rest/v1/applications?slot_id=eq.${gigSlot}&musician_id=eq.${A}`, { status: 'accepted' });
    sb('PATCH', `/rest/v1/applications?slot_id=eq.${gigSlot}&musician_id=eq.${B}`, { status: 'declined' });
    sb('PATCH', `/rest/v1/gig_slots?id=eq.${gigSlot}`, { status: 'booked' });
    sb('POST', '/rest/v1/bookings', { slot_id: gigSlot, musician_id: A, venue_id: venueId, agreed_pay_cents: 15000 });
    await p.goto(base + '/v/calendar/' + gigSlot); await p.waitForSelector('text=Booked act');
    ok('booked gig page shows the act and the Gig happened action', (await p.textContent('main')).includes('E2E Alto Quartet') && await p.locator('button:has-text("Gig happened")').count() === 1);
    await p.screenshot({ path: S + '/v-slot-booked.png', fullPage: true });
    await overflowAndTaps(p, 'booked gig page');
    await p.goto(base + '/v/calendar?day=' + gigDay); await p.waitForSelector('text=E2E Alto Quartet');
    ok('calendar card for a booked gig shows the act name', await p.locator('a:has-text("E2E Alto Quartet")').count() === 1);
    await p.goto(base + '/v/requests'); await p.waitForSelector('text=Requests');
    ok('requests page no longer lists answered applications', await p.locator('article').count() === 0);

    console.log('Gig happened');
    await p.goto(base + '/v/calendar/' + gigSlot); await p.waitForSelector('button:has-text("Gig happened")');
    await p.click('button:has-text("Gig happened")'); await p.waitForURL('**/v/calendar/' + gigSlot + '?error=complete', { timeout: 20000 });
    await p.waitForSelector('main p[role=alert]', { timeout: 15000 });
    ok('(container limit) refused completion shows a plain message', /could not mark/.test(await p.textContent('main p[role=alert]')), await p.textContent('main p[role=alert]'));
    sb('PATCH', `/rest/v1/bookings?slot_id=eq.${gigSlot}`, { completed_at: new Date().toISOString() });
    sb('PATCH', `/rest/v1/gig_slots?id=eq.${gigSlot}`, { status: 'completed' });
    await p.goto(base + '/v/calendar/' + gigSlot); await p.waitForSelector('text=played this night');
    ok('completed gig page reads correctly', true);

    console.log('Cancel an open slot');
    await p.goto(base + '/v/calendar/' + tonightSlot); await p.waitForSelector('text=Cancel this slot');
    await p.click('summary:has-text("Cancel this slot")'); await p.click('button:has-text("Yes, cancel the slot")'); await p.waitForURL('**/v/calendar', { timeout: 20000 });
    ok('cancelled slot is gone', sb('GET', `/rest/v1/gig_slots?id=eq.${tonightSlot}&select=id`).length === 0);
    ok('a booked gig cannot be cancelled from the page', (await (async () => { await p.goto(base + '/v/calendar/' + gigSlot); return p.locator('text=Cancel this slot').count(); })()) === 0);

    console.log('Venue profile');
    await p.goto(base + '/v/profile'); await p.waitForSelector('text=Details');
    await p.screenshot({ path: S + '/v-profile.png', fullPage: true });
    await overflowAndTaps(p, 'venue profile');
    await p.fill('input[name=capacity]', '130'); await p.click('button:has-text("Save changes")'); await p.waitForSelector('form p[role=status]', { timeout: 15000 });
    ok('profile saves', sb('GET', `/rest/v1/venue_profiles?profile_id=eq.${venueId}&select=capacity`)[0].capacity === 130);
    await p.fill('input[name=capacity]', '120'); await p.click('button:has-text("Save changes")'); await p.waitForTimeout(2500);
    ok('capacity restored to 120', sb('GET', `/rest/v1/venue_profiles?profile_id=eq.${venueId}&select=capacity`)[0].capacity === 120);
    await p.fill('input[name=capacity]', '-4'); await p.click('button:has-text("Save changes")'); await p.waitForSelector('form p[role=alert]');
    ok('bad capacity gets a plain message', /at least 1/.test(await p.textContent('form p[role=alert]')), await p.textContent('form p[role=alert]'));

    console.log('Musician cannot touch venue pages');
    const mp = await (await b.newContext({ viewport: { width: 375, height: 812 } })).newPage();
    await mp.goto(base + '/login'); await mp.click('button[value=musician]'); await mp.waitForURL('**/m/feed', { timeout: 25000 });
    await mp.goto(base + '/v/requests'); await mp.waitForLoadState('networkidle');
    ok('musician is bounced from /v/requests', new URL(mp.url()).pathname === '/m/feed', mp.url());
    await mp.goto(base + '/v/calendar/' + gigSlot); await mp.waitForLoadState('networkidle');
    ok('musician is bounced from a venue gig page', new URL(mp.url()).pathname === '/m/feed', mp.url());
  } catch (e) {
    fail++; console.log('  FAIL script error: ' + String(e).split('\n')[0]); await p.screenshot({ path: S + '/v-error.png', fullPage: true }).catch(() => {});
    console.log('  at url:', p.url());
  } finally {
    console.log('Cleanup');
    const venue = sb('GET', "/rest/v1/profiles?display_name=eq.Front%20Room%20Bar&select=id")[0];
    if (venue) sb('DELETE', `/rest/v1/gig_slots?venue_id=eq.${venue.id}`);
    for (const id of created.users) execFileSync('curl', ['-s', '-m', '30', '-o', '/dev/null', '-X', 'DELETE', `${H}/auth/v1/admin/users/${id}`, '-H', 'apikey: proxy-injected']);
    console.log('  removed test slots and ' + created.users.length + ' test users');
    console.log('page errors:', JSON.stringify(errs));
    console.log(`\n${pass} passed, ${fail} failed`);
    await b.close(); process.exit(fail ? 1 : 0);
  }
})();
