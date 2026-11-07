// End-to-end test for the musician flow (phase 3), driven in a real browser at 375px.
//
// HOW TO RUN (in the Claude cloud container):
//   npm run build && NODE_USE_ENV_PROXY=1 npm start -- -p 3100 &
//   cd /tmp && S=/some/dir NODE_PATH=$(npm root -g) node /home/user/gigmate/tests/e2e/musician-flow.cjs
//
// ASSUMPTIONS (container only): the cloud proxy injects the Supabase secret key ("apikey: proxy-injected"),
// and the demo accounts exist (npm run demo:users). Because that key hides the user's identity from the
// database, RLS refusals (applying to a closed gig) cannot be exercised here; those rules are covered by
// `npm run test:db`. The script creates gigs on the demo venue and restores/deletes everything at the end.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const S = process.env.S || require('os').tmpdir(), base = process.env.BASE || 'http://localhost:3100', H = 'https://wbekcrhqodrphehktutt.supabase.co';
let pass = 0, fail = 0;
const ok = (n, c, x = '') => { (c ? pass++ : fail++); console.log((c ? '  ok   ' : '  FAIL ') + n + (c ? '' : '  ' + String(x).slice(0, 240))); };
const sb = (method, url, body) => { const a = ['-s', '-m', '30', '-X', method, H + url, '-H', 'apikey: proxy-injected', '-H', 'Content-Type: application/json', '-H', 'Prefer: return=representation']; if (body) a.push('-d', JSON.stringify(body)); const out = execFileSync('curl', a).toString(); try { return JSON.parse(out); } catch { return out; } };
const iso = (minutesFromNow) => new Date(Date.now() + minutesFromNow * 60000).toISOString();
const DAY = 1440;

async function overflowAndTaps(p, name) {
  const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const small = await p.evaluate(() => [...document.querySelectorAll('a,button,summary,select,input:not(.sr-only):not([type=hidden]):not([type=checkbox])')].map(e => { const r = e.getBoundingClientRect(); return { t: (e.getAttribute('aria-label') || e.textContent || e.name || '').trim().slice(0, 22), h: Math.round(r.height), w: Math.round(r.width) }; }).filter(x => x.h > 0 && (x.h < 44 || x.w < 44)));
  ok(`${name}: no sideways scroll`, o === 0, o);
  ok(`${name}: tap targets >= 44px`, small.length === 0, JSON.stringify(small));
}
const card = (p, re) => p.locator('article', { hasText: re });

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 375, height: 812 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const venue = sb('GET', "/rest/v1/profiles?display_name=eq.Front%20Room%20Bar&select=id")[0].id;
  const mara = sb('GET', "/rest/v1/profiles?display_name=eq.Mara%20Quinn&select=id")[0].id;
  const orig = sb('GET', `/rest/v1/musician_profiles?profile_id=eq.${mara}&select=genres,rate_min_cents,rate_max_cents,bio,media_links,available_tonight`)[0];

  try {
    console.log('Setup: five open gigs on the demo venue');
    sb('DELETE', `/rest/v1/gig_slots?venue_id=eq.${venue}`);
    const mk = (o) => sb('POST', '/rest/v1/gig_slots', { venue_id: venue, set_length_min: 90, is_urgent: false, ...o })[0].id;
    const S1 = mk({ starts_at: iso(30), pay_cents: 9000, genre: 'Indie', is_urgent: true });
    const S2 = mk({ starts_at: iso(3 * DAY), pay_cents: 15000, genre: 'Folk', gear_provided: ['PA system', 'Mics'] });
    const S3 = mk({ starts_at: iso(5 * DAY), pay_cents: 30000, genre: 'Rock' });
    const S4 = mk({ starts_at: iso(4 * DAY), pay_cents: 8000, genre: null });
    const S5 = mk({ starts_at: iso(10 * DAY), pay_cents: 20000, genre: 'Jazz' });
    ok('five slots created', [S1, S2, S3, S4, S5].every(Boolean));

    console.log('Feed');
    await p.goto(base + '/login'); await p.click('button[value=musician]'); await p.waitForURL('**/m/feed', { timeout: 25000 });
    await p.waitForSelector('text=Tonight, urgent', { timeout: 20000 });
    ok('feed features the urgent gig', (await p.locator('article').first().textContent()).includes('Front Room Bar'));
    ok('feed header shows 0 pending', (await p.textContent('header')).includes('0 pending'));
    ok('fake sample post is gone, empty-state shown instead', !(await p.textContent('main')).includes('New song first take') && (await p.textContent('main')).includes('No posts yet'));
    await p.screenshot({ path: S + '/m-feed.png', fullPage: true });
    await overflowAndTaps(p, 'feed');

    console.log('Discover and filters');
    await p.goto(base + '/m/discover'); await p.waitForSelector('article');
    ok('discover lists all five open gigs', await p.locator('article').count() === 5, await p.locator('article').count());
    ok('urgent gig is first', /Indie act wanted/i.test(await p.locator('article').first().textContent()));
    ok('ticket shows venue, pay and gear', /Front Room Bar/.test(await card(p, /Folk act wanted/i).textContent()) && /\$150/.test(await card(p, /Folk act wanted/i).textContent()) && /PA system, Mics/.test(await card(p, /Folk act wanted/i).textContent()));
    await p.screenshot({ path: S + '/m-discover.png', fullPage: true });
    await overflowAndTaps(p, 'discover');

    await p.goto(base + '/m/discover?genre=Folk'); await p.waitForSelector('article');
    ok('genre Folk shows Folk gig plus any-genre gig', await p.locator('article').count() === 2, await p.locator('article').count());
    await p.goto(base + '/m/discover?pay=200'); await p.waitForSelector('article');
    ok('minimum pay $200 shows the two big gigs', await p.locator('article').count() === 2, await p.locator('article').count());
    await p.goto(base + '/m/discover?when=week'); await p.waitForSelector('article');
    ok('next 7 days hides the gig 10 days out', await p.locator('article').count() === 4, await p.locator('article').count());
    await p.goto(base + '/m/discover?genre=Rock&pay=300'); await p.waitForSelector('article');
    ok('combined filters narrow to one gig', await p.locator('article').count() === 1 && /Rock act wanted/i.test(await p.locator('article').first().textContent()));
    await p.goto(base + '/m/discover?genre=Hip%20hop&pay=300'); await p.waitForSelector('text=Nothing fits those filters');
    ok('no match shows a helpful empty state with a clear action', await p.locator('a:has-text("Clear filters")').count() === 1);
    await p.goto(base + '/m/discover?genre=%3Cscript%3E&pay=999&when=zzz'); await p.waitForSelector('article');
    ok('junk filter values are ignored, not crashing', await p.locator('article').count() === 5);
    await p.goto(base + '/m/discover'); await p.click('summary:has-text("Filters")');
    await p.selectOption('select[name=genre]', 'Folk'); await p.click('button:has-text("Show gigs")'); await p.waitForURL('**genre=Folk**');
    await p.waitForSelector('article');
    ok('using the filter form updates the list', await p.locator('article').count() === 2);
    await p.screenshot({ path: S + '/m-discover-filtered.png', fullPage: true });
    await overflowAndTaps(p, 'discover with filters open');

    console.log('One-tap apply');
    await p.goto(base + '/m/discover'); await p.waitForSelector('article');
    const stale = await ctx.newPage(); await stale.goto(base + '/m/discover'); await stale.waitForSelector('article');
    await card(p, /Folk act wanted/i).locator('button:has-text("Apply")').click();
    await p.waitForSelector('text=Applied. The venue can see your profile', { timeout: 20000 });
    ok('apply shows a plain confirmation', true);
    ok('card now shows Applied instead of a button', await card(p, /Folk act wanted/i).locator('button:has-text("Apply")').count() === 0 && (await card(p, /Folk act wanted/i).textContent()).includes('Applied'));
    ok('application saved as pending', sb('GET', `/rest/v1/applications?slot_id=eq.${S2}&musician_id=eq.${mara}&select=status`)[0]?.status === 'pending');
    await card(stale, /Folk act wanted/i).locator('button:has-text("Apply")').click();
    await stale.waitForSelector('text=You already applied', { timeout: 20000 });
    ok('applying twice from a stale tab says "already applied"', sb('GET', `/rest/v1/applications?slot_id=eq.${S2}&select=id`).length === 1);
    await stale.close();
    // Wait on each card's own "Applied" pill, not the banner (the banner text is the same each time).
    await card(p, /Rock act wanted/i).locator('button:has-text("Apply")').click(); await card(p, /Rock act wanted/i).locator('text=Applied').waitFor({ timeout: 20000 });
    await card(p, /\$80/).locator('button:has-text("Apply")').click(); await card(p, /\$80/).locator('text=Applied').waitFor({ timeout: 20000 });
    await p.goto(base + '/m/feed'); await p.waitForSelector('text=pending');
    ok('feed header counts pending applications', (await p.textContent('header')).includes('3 pending'), await p.textContent('header'));
    await p.goto(base + '/m/discover?genre=Folk'); await p.waitForSelector('article');

    console.log('Bookings');
    await p.goto(base + '/m/bookings'); await p.waitForSelector('text=Waiting');
    ok('with nothing confirmed the Applied tab opens first', await p.locator('a[aria-current=page]:has-text("Applied")').count() === 1);
    ok('three waiting applications listed', await p.locator('article').count() === 3);
    await p.screenshot({ path: S + '/m-bookings-applied.png', fullPage: true });
    await overflowAndTaps(p, 'bookings (applied)');
    await card(p, /\$150/).locator('summary:has-text("Withdraw")').click();
    await card(p, /\$150/).locator('button:has-text("Yes, withdraw")').click();
    await p.waitForSelector('text=Application withdrawn', { timeout: 20000 });
    ok('withdrawing is saved', sb('GET', `/rest/v1/applications?slot_id=eq.${S2}&musician_id=eq.${mara}&select=status`)[0]?.status === 'withdrawn');
    ok('withdrawn gig shows a Withdrawn badge and no further action', (await card(p, /\$150/).textContent()).includes('Withdrawn') && await card(p, /\$150/).locator('summary').count() === 0);

    // Emulate the venue's answers (container limit: the accept function cannot run here)
    sb('PATCH', `/rest/v1/applications?slot_id=eq.${S3}&musician_id=eq.${mara}`, { status: 'accepted' });
    sb('PATCH', `/rest/v1/gig_slots?id=eq.${S3}`, { status: 'booked' });
    sb('POST', '/rest/v1/bookings', { slot_id: S3, musician_id: mara, venue_id: venue, agreed_pay_cents: 30000 });
    sb('PATCH', `/rest/v1/applications?slot_id=eq.${S4}&musician_id=eq.${mara}`, { status: 'declined' });
    sb('PATCH', `/rest/v1/gig_slots?id=eq.${S5}`, { status: 'completed' });
    sb('POST', '/rest/v1/bookings', { slot_id: S5, musician_id: mara, venue_id: venue, agreed_pay_cents: 20000, completed_at: new Date().toISOString() });

    await p.goto(base + '/m/bookings'); await p.waitForSelector('text=Confirmed');
    ok('with a confirmed gig the Confirmed tab opens first', await p.locator('a[aria-current=page]:has-text("Confirmed")').count() === 1);
    const conf = await p.locator('article').first().textContent();
    ok('confirmed gig shows the address and the direct-pay note', /100 Example Street/.test(conf) && /\$300 is settled directly with the venue/.test(conf), conf);
    await p.screenshot({ path: S + '/m-bookings-confirmed.png', fullPage: true });
    await overflowAndTaps(p, 'bookings (confirmed)');
    await p.goto(base + '/m/bookings?tab=applied'); await p.waitForSelector('text=Not chosen');
    ok('declined application shows closure message', (await p.textContent('main')).includes('picked another act'));
    await p.goto(base + '/m/bookings?tab=completed'); await p.waitForSelector('text=Played');
    ok('finished gig appears under Played', await p.locator('article').count() === 1);
    await p.goto(base + '/m/discover'); await p.waitForSelector('article');
    ok('discover hides booked and finished gigs, keeps open ones with their status', await p.locator('article').count() === 3, await p.locator('article').count()); // S1, S2 (withdrawn), S4 (declined)
    ok('declined and withdrawn gigs cannot be applied to again', await card(p, /\$80/).locator('button:has-text("Apply")').count() === 0 && (await card(p, /\$80/).textContent()).includes('Not chosen') && (await card(p, /\$150/).textContent()).includes('Withdrawn'));
    
    console.log('Press kit');
    await p.goto(base + '/m/profile'); await p.waitForSelector('text=Edit press kit');
    ok('profile shows what venues see', (await p.textContent('main')).includes('$100 to $250') && (await p.textContent('main')).includes('New, no reviews yet'));
    await p.screenshot({ path: S + '/m-profile.png', fullPage: true });
    await overflowAndTaps(p, 'profile');
    await p.fill('input[name=rate_min]', '300'); await p.fill('input[name=rate_max]', '100'); await p.click('button:has-text("Save press kit")'); await p.waitForSelector('form p[role=alert]');
    ok('reversed rates are rejected plainly', /top rate/i.test(await p.textContent('form p[role=alert]')));
    await p.reload(); await p.waitForSelector('text=Edit press kit');
    await p.fill('input[name=link1]', 'javascript:alert(1)'); await p.click('button:has-text("Save press kit")'); await p.waitForSelector('form p[role=alert]');
    ok('a javascript: link is rejected', /https/.test(await p.textContent('form p[role=alert]')));
    await p.reload(); await p.waitForSelector('text=Edit press kit');
    await p.evaluate(() => document.querySelectorAll('input[name=genres]:checked').forEach((i) => i.click())); // the boxes are visually hidden, so click them in the page
    await p.click('button:has-text("Save press kit")'); await p.waitForSelector('form p[role=alert]');
    ok('no genres is rejected plainly', /at least one genre/i.test(await p.textContent('form p[role=alert]')));
    await p.reload(); await p.waitForSelector('text=Edit press kit');
    await p.click('label:has-text("Jazz")'); await p.fill('input[name=rate_min]', '120'); await p.fill('input[name=rate_max]', '260');
    await p.fill('input[name=link1]', 'https://youtube.com/watch?v=abc'); await p.fill('input[name=link2]', 'https://open.spotify.com/artist/x');
    await p.uncheck('input[name=available_tonight]');
    await p.click('button:has-text("Save press kit")'); await p.waitForSelector('form p[role=status]', { timeout: 15000 });
    const saved = sb('GET', `/rest/v1/musician_profiles?profile_id=eq.${mara}&select=genres,rate_min_cents,rate_max_cents,media_links,available_tonight`)[0];
    ok('press kit saved: rates in cents, genres, links with friendly labels, availability', saved.rate_min_cents === 12000 && saved.rate_max_cents === 26000 && saved.genres.includes('Jazz') && saved.media_links.map(l => l.label).join() === 'YouTube,Spotify' && saved.available_tonight === false, JSON.stringify(saved));
    await p.reload(); await p.waitForSelector('text=What venues see');
    ok('profile page reflects the change', (await p.textContent('main')).includes('$120 to $260') && (await p.textContent('main')).includes('Not available tonight'));

    console.log('Role guard');
    const vp = await (await b.newContext({ viewport: { width: 375, height: 812 } })).newPage();
    await vp.goto(base + '/login'); await vp.click('button[value=venue]'); await vp.waitForURL('**/v/calendar', { timeout: 25000 });
    await vp.goto(base + '/m/discover'); await vp.waitForLoadState('networkidle');
    ok('a venue cannot open /m/discover', new URL(vp.url()).pathname === '/v/calendar', vp.url());
  } catch (e) {
    fail++; console.log('  FAIL script error: ' + String(e).split('\n')[0]); console.log('  at url:', p.url());
    await p.screenshot({ path: S + '/m-error.png', fullPage: true }).catch(() => {});
  } finally {
    console.log('Cleanup');
    sb('DELETE', `/rest/v1/gig_slots?venue_id=eq.${venue}`);
    sb('PATCH', `/rest/v1/musician_profiles?profile_id=eq.${mara}`, orig);
    console.log('  removed test gigs, restored the demo musician profile');
    console.log('page errors:', JSON.stringify(errs));
    console.log(`\n${pass} passed, ${fail} failed`);
    await b.close(); process.exit(fail ? 1 : 0);
  }
})();
