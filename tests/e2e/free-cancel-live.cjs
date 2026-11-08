// One-off live check: a venue cancelling a confirmed gig 48+ hours away is free, and recorded as not late.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const H = 'https://wbekcrhqodrphehktutt.supabase.co', base = 'https://gigmate-delta.vercel.app';
const curl = (a) => execFileSync('curl', ['-s', '-m', '60', ...a]).toString();
const sb = (m, u, b) => { const a = ['-X', m, H + u, '-H', 'apikey: proxy-injected', '-H', 'Content-Type: application/json', '-H', 'Prefer: return=representation']; if (b) a.push('-d', JSON.stringify(b)); try { return JSON.parse(curl(a)); } catch { return null; } };
let pass = 0, fail = 0;
const ok = (n, c, x = '') => { (c ? pass++ : fail++); console.log((c ? '  ok   ' : '  FAIL ') + n + (c ? '' : '  ' + String(x).slice(0, 240))); };

(async () => {
  const venue = sb('GET', '/rest/v1/profiles?display_name=eq.Front%20Room%20Bar&select=id')[0].id;
  const act = sb('GET', '/rest/v1/profiles?display_name=eq.Tessellate&select=id')[0].id;
  const slot = sb('POST', '/rest/v1/gig_slots', { venue_id: venue, starts_at: new Date(Date.now() + 10 * 86400000).toISOString(), set_length_min: 90, pay_cents: 55500, genre: 'Hip hop', status: 'booked', is_urgent: false })[0].id;
  const booking = sb('POST', '/rest/v1/bookings', { slot_id: slot, musician_id: act, venue_id: venue, agreed_pay_cents: 55500 })[0].id;
  const b = await chromium.launch();
  try {
    const v = await (await b.newContext({ viewport: { width: 375, height: 812 } })).newPage();
    await v.goto(base + '/login'); await v.click('button[value=venue]'); await v.waitForURL('**/v/calendar', { timeout: 40000 });
    await v.goto(base + '/v/calendar/' + slot); await v.waitForSelector('summary:has-text("Cancel this gig")');
    await v.click('summary:has-text("Cancel this gig")');
    ok('the page says cancelling is free for a gig this far away', /free/i.test(await v.textContent('main')));
    await v.click('button[aria-label="Yes, cancel the gig"]');
    await v.waitForURL('**cancelled=free', { timeout: 40000 });
    ok('the venue sees the "cancelled at no charge" message', /no charge/.test(await v.textContent('main')));
    const row = sb('GET', `/rest/v1/bookings?id=eq.${booking}&select=cancelled_at,cancelled_late,cancel_fee_cents,cancelled_by`)[0];
    ok('REAL: booking cancelled, not late, no fee, by the venue', row.cancelled_at && row.cancelled_late === false && row.cancel_fee_cents === 0 && row.cancelled_by === venue, JSON.stringify(row));
    ok('REAL: the gig slot is now cancelled', sb('GET', `/rest/v1/gig_slots?id=eq.${slot}&select=status`)[0].status === 'cancelled');
    const rel = sb('GET', `/rest/v1/venue_reliability?venue_id=eq.${venue}&select=late_cancellations`);
    ok('a free cancellation does NOT count as a late cancellation', (rel[0]?.late_cancellations ?? 0) === 0, JSON.stringify(rel));
  } catch (e) { fail++; console.log('  FAIL script error: ' + String(e).split('\n')[0]); }
  finally {
    sb('DELETE', `/rest/v1/gig_slots?id=eq.${slot}`);
    console.log('  removed the test gig (and its booking)');
    console.log(`${pass} passed, ${fail} failed`);
    await b.close(); process.exit(fail ? 1 : 0);
  }
})();
