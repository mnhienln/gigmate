// End-to-end test for the Instagram-style VENUE profile: Photos | Videos | Shop tabs, read-only until
// "Edit profile" is tapped, photo and video posts, merch shop (venues only), profile photo.
// Runs in a real browser at 375px.
//
// NEEDS migrations 0004 and 0006 applied.
//
// HOW TO RUN (in the Claude cloud container):
//   npm run build && NODE_USE_ENV_PROXY=1 npm start -- -p 3100 &
//   cd /tmp && S=/some/dir NODE_PATH=$(npm root -g) node /home/user/gigmate/tests/e2e/venue-profile-flow.cjs
// Against the live site: BASE=https://gigmate-delta.vercel.app REAL_KEYS=1 (storage and shop rules then run for real).
//
// It uses the demo venue (Front Room Bar) and the demo musician, makes its own test media with ffmpeg and
// removes every post, product, photo and file it created.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const S = process.env.S || os.tmpdir(), base = process.env.BASE || 'http://localhost:3100', H = 'https://wbekcrhqodrphehktutt.supabase.co';
let pass = 0, fail = 0;
const ok = (n, c, x = '') => { (c ? pass++ : fail++); console.log((c ? '  ok   ' : '  FAIL ') + n + (c ? '' : '  ' + String(x).slice(0, 240))); };
const curl = (args) => execFileSync('curl', ['-s', '-m', '60', ...args]).toString();
const sb = (method, url, body) => { const a = ['-X', method, H + url, '-H', 'apikey: proxy-injected', '-H', 'Content-Type: application/json', '-H', 'Prefer: return=representation']; if (body) a.push('-d', JSON.stringify(body)); const out = curl(a); try { return JSON.parse(out); } catch { return out; } };
const head = (url) => curl(['-I', '-o', '/dev/null', '-w', '%{http_code} %{content_type} %{size_download}', url]);
const status = (url) => curl(['-o', '/dev/null', '-w', '%{http_code}', '-I', url]).trim();
const gone = (url) => status(url) !== '200'; // Supabase storage answers HTTP 400 ("Object not found") for a missing file
const storageUrl = (bucket, p) => `${H}/storage/v1/object/public/${bucket}/${p}`;

// --- test media -------------------------------------------------------------------------------
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gigmate-media-'));
const ff = (...a) => execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...a]);
ff('-f', 'lavfi', '-i', 'testsrc2=size=2400x1600:rate=1', '-frames:v', '1', path.join(dir, 'photo.png'));
ff('-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=24', '-t', '2', '-c:v', 'libvpx', '-b:v', '400k', path.join(dir, 'clip.webm'));
ff('-f', 'lavfi', '-i', 'testsrc=size=64x64:rate=1', '-t', '61', '-c:v', 'libvpx', '-b:v', '20k', path.join(dir, 'long.webm'));
fs.writeFileSync(path.join(dir, 'big.webm'), Buffer.alloc(41 * 1024 * 1024));
fs.writeFileSync(path.join(dir, 'notes.txt'), 'not a picture');
const f = (name, mimeType) => ({ name, mimeType, buffer: fs.readFileSync(path.join(dir, name)) });

async function overflowAndTaps(p, name) {
  const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const small = await p.evaluate(() => [...document.querySelectorAll('a,button,summary,select,input:not(.sr-only):not([type=hidden]):not([type=checkbox]):not([type=file])')].map(e => { const r = e.getBoundingClientRect(); return { t: (e.getAttribute('aria-label') || e.textContent || e.name || '').trim().slice(0, 22), h: Math.round(r.height), w: Math.round(r.width) }; }).filter(x => x.h > 0 && (x.h < 44 || x.w < 44) && !/^Open (photo|video)/.test(x.t)));
  ok(`${name}: no sideways scroll`, o === 0, o);
  ok(`${name}: tap targets >= 44px`, small.length === 0, JSON.stringify(small));
}
async function cleanupStorage(userId) {
  for (const bucket of ['photos', 'videos']) {
    let names = [];
    try { names = JSON.parse(curl(['-X', 'POST', `${H}/storage/v1/object/list/${bucket}`, '-H', 'apikey: proxy-injected', '-H', 'Content-Type: application/json', '-d', JSON.stringify({ prefix: userId, limit: 200 })])).map(o => `${userId}/${o.name}`); } catch { /* nothing */ }
    if (names.length) curl(['-X', 'DELETE', `${H}/storage/v1/object/${bucket}`, '-H', 'apikey: proxy-injected', '-H', 'Content-Type: application/json', '-d', JSON.stringify({ prefixes: names })]);
  }
}


(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 375, height: 812 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const venue = sb('GET', "/rest/v1/profiles?display_name=eq.Front%20Room%20Bar&select=id")[0].id;
  const mine = () => sb('GET', `/rest/v1/posts?author_id=eq.${venue}&media_path=not.is.null&select=id,media_path,media_type,poster_path,body&order=created_at`);
  const tabs = async (pg) => (await pg.locator('nav[aria-label="Profile sections"] a').allTextContents()).map(t => t.replace(/\s+/g, '').trim());

  try {
    console.log('Setup');
    sb('DELETE', `/rest/v1/posts?author_id=eq.${venue}`);
    sb('DELETE', `/rest/v1/products?owner_id=eq.${venue}`);
    await p.goto(base + '/login'); await p.click('button[value=venue]'); await p.waitForURL('**/v/calendar', { timeout: 40000 });
    ok('signed in as the demo venue', true);

    console.log('Read-only profile');
    await p.goto(base + '/v/profile'); await p.waitForSelector('h1:has-text("Front Room Bar")');
    ok('tabs are Photos, Videos and Shop', JSON.stringify(await tabs(p)) === JSON.stringify(['Photos0', 'Videos0', 'Shop0']), JSON.stringify(await tabs(p)));
    ok('the venue profile is read-only: an Edit profile button, no form fields, no upload buttons', await p.locator('a:has-text("Edit profile")').count() === 1 && await p.locator('main input:not([type=hidden]), main textarea, main select').count() === 0 && await p.locator('button:has-text("Add to shop")').count() === 0);
    ok('the header shows the reliability line "Cancelled last minute"', /Cancelled last minute: \d+/.test(await p.textContent('header')));
    ok('the owner still sees the Reliability explanation', await p.locator('section[aria-label="Reliability"]').count() === 1);
    ok('empty photos tab explains the next step', /No photos yet/.test(await p.textContent('main')) && /Edit profile/.test(await p.textContent('main')));
    await p.goto(base + '/v/profile?tab=videos'); await p.waitForSelector('text=No videos yet');
    await p.goto(base + '/v/profile?tab=shop'); await p.waitForSelector('text=Your shop is empty');
    ok('empty shop suggests merch ideas', /shirts, glasses or gift cards/.test(await p.textContent('main')));
    await p.goto(base + '/v/profile?tab=bogus'); await p.waitForSelector('h1:has-text("Front Room Bar")');
    ok('an unknown tab falls back to Photos', /Photos/.test(await p.locator('nav a[aria-current=page]').first().textContent()));
    await p.screenshot({ path: S + '/vp-empty.png', fullPage: true });
    await overflowAndTaps(p, 'venue profile (empty)');

    console.log('Edit profile');
    await p.click('a:has-text("Edit profile")'); await p.waitForURL('**/v/profile/edit', { timeout: 20000 });
    await p.waitForSelector('h1:has-text("Edit profile")');
    ok('the edit page has the details form, photos and videos, and a shop form', await p.locator('input[name=capacity]').count() === 1 && await p.locator('section[aria-label="Photos and videos"]').count() === 1 && await p.locator('button:has-text("Add to shop")').count() === 1);
    await p.screenshot({ path: S + '/vp-edit.png', fullPage: true });
    await overflowAndTaps(p, 'venue edit page');

    console.log('New post: photo');
    await p.click('a:has-text("New post")'); await p.waitForURL('**/v/post', { timeout: 20000 });
    await p.waitForSelector('#post-file');
    await p.setInputFiles('#post-file', f('photo.png', 'image/png')); await p.fill('textarea[name=caption]', 'Patio is open');
    await p.click('button:has-text("Share")'); await p.waitForURL('**/v/profile?tab=photos&posted=1', { timeout: 60000 });
    await p.waitForSelector('main ul li button[aria-label^="Open"]');
    ok('a photo lands on the Photos tab with a confirmation', /Posted\./.test(await p.textContent('main')) && await p.locator('main ul li button[aria-label^="Open photo"]').count() === 1);
    const photo = mine()[0];
    ok('the photo is saved under the venue folder', photo.media_type === 'image' && photo.media_path.startsWith(venue + '/') && photo.body === 'Patio is open', JSON.stringify(photo));
    const purl = storageUrl('photos', photo.media_path);
    ok('the stored photo is publicly viewable', status(purl) === '200', status(purl));

    console.log('New post: video');
    await p.goto(base + '/v/post'); await p.waitForSelector('#post-file');
    await p.setInputFiles('#post-file', f('clip.webm', 'video/webm')); await p.fill('textarea[name=caption]', 'Room check before doors');
    await p.click('button:has-text("Share")'); await p.waitForURL('**/v/profile?tab=videos&posted=1', { timeout: 90000 });
    await p.waitForSelector('main ul li button[aria-label^="Open video"]');
    ok('a video lands on the Videos tab (not Photos)', await p.locator('main ul li button[aria-label^="Open video"]').count() === 1 && await p.locator('main ul li button[aria-label^="Open photo"]').count() === 0);
    ok('tab counts are Photos 1, Videos 1, Shop 0 (shown as Photos1 and so on)', JSON.stringify(await tabs(p)) === JSON.stringify(['Photos1', 'Videos1', 'Shop0']), JSON.stringify(await tabs(p)));
    const video = mine().find(x => x.media_type === 'video');
    ok('the video has a thumbnail and both files are viewable', video && video.poster_path && status(storageUrl('videos', video.media_path)) === '200' && status(storageUrl('photos', video.poster_path)) === '200', JSON.stringify(video));
    await p.goto(base + '/v/profile?tab=photos'); await p.waitForSelector('main ul li button');
    ok('the Photos tab shows only the photo', await p.locator('main ul li button[aria-label^="Open photo"]').count() === 1 && await p.locator('main ul li button[aria-label^="Open video"]').count() === 0);
    await p.click('main ul li button[aria-label^="Open photo"]'); await p.waitForSelector('dialog[open]');
    ok('tapping a photo opens it large with its caption', /Patio is open/.test(await p.textContent('dialog[open]')));
    await p.click('dialog[open] button[aria-label="Close"]');

    console.log('Shop');
    await p.goto(base + '/v/profile/edit'); await p.waitForSelector('button:has-text("Add to shop")');
    await p.fill('input[name=title]', 'House tee'); await p.fill('input[name=price]', '-5'); await p.click('button:has-text("Add to shop")');
    await p.waitForSelector('main p[role=alert]'); ok('a negative price is refused plainly', /cannot be negative/.test(await p.textContent('main p[role=alert]')), await p.textContent('main p[role=alert]'));
    await p.fill('input[name=price]', '25.50'); await p.fill('input[name=buyUrl]', 'javascript:alert(1)'); await p.click('button:has-text("Add to shop")');
    await p.waitForFunction(() => /https/.test([...document.querySelectorAll('p[role=alert]')].map(e => e.textContent).join(' ')), null, { timeout: 15000 });
    ok('a javascript: buy link is refused', true);
    await p.fill('input[name=buyUrl]', 'https://shop.example.com/tee'); await p.fill('textarea[name=description]', 'Black tee, sizes S to XL');
    await p.setInputFiles('#f-photo', f('photo.png', 'image/png')); await p.click('button:has-text("Add to shop")');
    await p.waitForSelector('text=Added to your shop', { timeout: 60000 });
    await p.fill('input[name=title]', 'Pint glass'); await p.fill('input[name=price]', '9'); await p.click('button:has-text("Add to shop")');
    await p.waitForFunction(() => document.querySelectorAll('main section[aria-label="Shop"] ul li').length === 2, null, { timeout: 30000 });
    const prods = sb('GET', `/rest/v1/products?owner_id=eq.${venue}&select=title,price_cents,buy_url,photo_path&order=created_at`);
    ok('items saved with prices in cents under the venue folder', prods.length === 2 && prods[0].price_cents === 2550 && prods[1].price_cents === 900 && prods[0].photo_path.startsWith(venue + '/'), JSON.stringify(prods));
    await p.goto(base + '/v/profile?tab=shop'); await p.waitForSelector('text=House tee');
    ok('the shop shows prices, a Buy link, and "Ask at the bar" when there is no link', /\$25\.50/.test(await p.textContent('main')) && await p.locator('a[aria-label="Buy House tee"][href="https://shop.example.com/tee"]').count() === 1 && /Ask at the bar/.test(await p.textContent('main')));
    ok('the Shop tab count is 2', (await tabs(p)).includes('Shop2'), JSON.stringify(await tabs(p)));
    await p.screenshot({ path: S + '/vp-shop.png', fullPage: true });
    await overflowAndTaps(p, 'venue shop tab');

    console.log('Profile photo');
    await p.goto(base + '/v/profile/edit'); await p.waitForSelector('h1:has-text("Edit profile")');
    await p.setInputFiles('label:has-text("Add photo") input[type=file]', f('photo.png', 'image/png'));
    await p.waitForSelector('text=Profile photo updated', { timeout: 60000 });
    const av = sb('GET', `/rest/v1/profiles?id=eq.${venue}&select=avatar_url`)[0].avatar_url;
    ok('the profile photo is saved under the venue folder', av && av.startsWith(venue + '/') && status(storageUrl('photos', av)) === '200', av);
    await p.goto(base + '/v/profile'); await p.waitForSelector('header img[alt$="profile photo"]');
    ok('the header shows the photo instead of initials', true);
    await p.screenshot({ path: S + '/vp-full.png', fullPage: true });
    await overflowAndTaps(p, 'venue profile (with posts)');

    console.log('Musicians cannot use the venue profile pages');
    const m = await (await b.newContext({ viewport: { width: 375, height: 812 } })).newPage();
    await m.goto(base + '/login'); await m.click('button[value=musician]'); await m.waitForURL('**/m/feed', { timeout: 40000 });
    for (const route of ['/v/profile', '/v/profile/edit', '/v/post']) {
      await m.goto(base + route); await m.waitForLoadState('networkidle');
      ok(`a musician opening ${route} is sent back to their own feed`, new URL(m.url()).pathname === '/m/feed', m.url());
    }

    console.log('Delete');
    await p.goto(base + '/v/profile/edit'); await p.waitForSelector('h1:has-text("Edit profile")');
    const li = p.locator('section[aria-label="Photos and videos"] ul li', { hasText: 'Patio is open' });
    await li.locator('summary:has-text("Delete")').click(); await li.locator('button:has-text("Yes, delete")').click();
    await p.waitForURL('**/v/profile/edit?removed=post', { timeout: 30000 });
    ok('deleting a post removes the row and its file', mine().length === 1 && gone(purl), `${mine().length} ${status(purl)}`);
    const pli = p.locator('section[aria-label="Shop"] ul li', { hasText: 'House tee' });
    const prodPhoto = prods[0].photo_path;
    await pli.locator('summary:has-text("Remove")').click(); await pli.locator('button:has-text("Yes, remove")').click();
    await p.waitForURL('**/v/profile/edit?removed=product', { timeout: 30000 });
    ok('removing an item deletes the row and its photo', sb('GET', `/rest/v1/products?owner_id=eq.${venue}&select=id`).length === 1 && gone(storageUrl('photos', prodPhoto)));
  } catch (e) {
    fail++; console.log('  FAIL script error: ' + String(e).split('\n')[0]); console.log('  at url:', p.url());
    await p.screenshot({ path: S + '/vp-error.png', fullPage: true }).catch(() => {});
  } finally {
    console.log('Cleanup');
    sb('DELETE', `/rest/v1/posts?author_id=eq.${venue}`);
    sb('DELETE', `/rest/v1/products?owner_id=eq.${venue}`);
    sb('PATCH', `/rest/v1/profiles?id=eq.${venue}`, { avatar_url: null });
    await cleanupStorage(venue);
    fs.rmSync(dir, { recursive: true, force: true });
    console.log('  removed test posts, products, photos and files; restored the demo venue');
    console.log('page errors:', JSON.stringify(errs));
    console.log(`\n${pass} passed, ${fail} failed`);
    await b.close(); process.exit(fail ? 1 : 0);
  }
})();
