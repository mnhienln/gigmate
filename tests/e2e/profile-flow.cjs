// End-to-end test for the Instagram-style MUSICIAN profile: photo and video posts, profile photo,
// the music buttons, no shop (shops belong to venues, see venue-profile-flow.cjs), and a venue's read-only view. Runs in a real browser at 375px.
//
// NEEDS migration 0004_profiles_media.sql applied to the project.
//
// HOW TO RUN (in the Claude cloud container):
//   npm run build && NODE_USE_ENV_PROXY=1 npm start -- -p 3100 &
//   cd /tmp && S=/some/dir NODE_PATH=$(npm root -g) node /home/user/gigmate/tests/e2e/profile-flow.cjs
// Against the live site: BASE=https://gigmate-delta.vercel.app REAL_KEYS=1 (storage rules then run for real).
//
// It makes its own test media with ffmpeg, uses the demo musician (Mara Quinn) and the demo venue,
// and removes every post, photo and file it created.
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
  const mara = sb('GET', "/rest/v1/profiles?display_name=eq.Mara%20Quinn&select=id")[0].id;
  const venue = sb('GET', "/rest/v1/profiles?display_name=eq.Front%20Room%20Bar&select=id")[0].id;
  const origLinks = sb('GET', `/rest/v1/musician_profiles?profile_id=eq.${mara}&select=media_links`)[0].media_links;
  const mine = () => sb('GET', `/rest/v1/posts?author_id=eq.${mara}&media_path=not.is.null&select=id,media_path,media_type,poster_path,body&order=created_at`);

  try {
    console.log('Setup');
    sb('DELETE', `/rest/v1/posts?author_id=eq.${mara}`);
    await p.goto(base + '/login'); await p.click('button[value=musician]'); await p.waitForURL('**/m/feed', { timeout: 30000 });
    ok('signed in as the demo musician', true);

    console.log('Empty profile');
    await p.goto(base + '/m/profile'); await p.waitForSelector('h1:has-text("Mara Quinn")');
    ok('empty posts tab explains what to do', /tap the \+ button/i.test(await p.textContent('main')));
    ok('the musician profile has exactly two tabs, Posts and Music, and no Shop', await p.locator('nav[aria-label="Profile sections"] a').count() === 2 && !/Shop/.test(await p.textContent('nav[aria-label="Profile sections"]')));
    await p.goto(base + '/m/profile?tab=shop'); await p.waitForSelector('h1:has-text("Mara Quinn")');
    ok('an old ?tab=shop link falls back to Posts instead of a shop', !/shop/i.test(await p.textContent('main')) && await p.locator('nav a[aria-current=page]').first().textContent().then(t => /Posts/.test(t)));

    console.log('New post: photo');
    await p.goto(base + '/m/post'); await p.waitForSelector('h1:has-text("New post")');
    await overflowAndTaps(p, 'new post page');
    await p.setInputFiles('#post-file', f('notes.txt', 'text/plain')); await p.click('button:has-text("Share")');
    await p.waitForSelector('main p[role=alert]'); ok('a non-photo file is refused plainly', /choose a photo/i.test(await p.textContent('main p[role=alert]')), await p.textContent('main p[role=alert]'));
    await p.setInputFiles('#post-file', f('big.webm', 'video/webm')); await p.click('button:has-text("Share")');
    await p.waitForFunction(() => /Trim it under 40 MB/.test(document.querySelector('main p[role=alert]')?.textContent || ''), null, { timeout: 15000 });
    ok('a 41 MB video is refused with advice', true);
    await p.setInputFiles('#post-file', f('long.webm', 'video/webm')); await p.click('button:has-text("Share")');
    await p.waitForFunction(() => /up to 60 seconds/.test(document.querySelector('main p[role=alert]')?.textContent || ''), null, { timeout: 15000 });
    ok('a 61 second video is refused with advice', true);
    ok('nothing was saved by the refused attempts', mine().length === 0);

    await p.setInputFiles('#post-file', f('photo.png', 'image/png')); await p.fill('textarea[name=caption]', 'Soundcheck at golden hour');
    await p.click('button:has-text("Share")'); await p.waitForURL('**/m/profile?tab=posts&posted=1', { timeout: 60000 });
    await p.waitForSelector('main ul li button[aria-label^="Open"]');
    ok('photo post lands on the profile grid with a confirmation', /Posted\./.test(await p.textContent('main')) && await p.locator('main ul li button[aria-label^="Open"]').count() === 1);
    const photo = mine()[0];
    ok('photo post saved under the musician folder as an image', photo.media_type === 'image' && photo.media_path.startsWith(mara + '/') && photo.media_path.endsWith('.jpg') && photo.body === 'Soundcheck at golden hour', JSON.stringify(photo));
    const purl = storageUrl('photos', photo.media_path);
    ok('the stored photo is publicly viewable', status(purl) === '200', status(purl));
    execFileSync('curl', ['-s', '-m', '60', '-o', path.join(dir, 'stored.jpg'), purl]);
    const dims = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', path.join(dir, 'stored.jpg')]).toString().trim().split(',').map(Number);
    const sizeKb = fs.statSync(path.join(dir, 'stored.jpg')).size / 1024;
    ok(`the 2400x1600 photo was shrunk before upload (${dims.join('x')}, ${sizeKb.toFixed(0)} KB)`, Math.max(...dims) <= 1600 && sizeKb < 900, `${dims} ${sizeKb}`);

    console.log('New post: video');
    await p.goto(base + '/m/post'); await p.waitForSelector('#post-file');
    await p.setInputFiles('#post-file', f('clip.webm', 'video/webm')); await p.fill('textarea[name=caption]', 'Two seconds of the opener');
    await p.click('button:has-text("Share")'); await p.waitForURL('**/m/profile?tab=posts&posted=1', { timeout: 90000 });
    await p.waitForFunction(() => document.querySelectorAll('main ul li button[aria-label^="Open"]').length === 2, null, { timeout: 15000 });
    const video = mine().find(x => x.media_type === 'video');
    ok('video post saved with a thumbnail', video && video.media_path.startsWith(mara + '/') && video.poster_path && video.poster_path.startsWith(mara + '/'), JSON.stringify(video));
    ok('video file and thumbnail are publicly viewable', status(storageUrl('videos', video.media_path)) === '200' && status(storageUrl('photos', video.poster_path)) === '200');
    ok('grid marks the video with a play badge', await p.locator('main ul li button[aria-label^="Open video"]').count() === 1 && await p.locator('main ul li button[aria-label^="Open photo"]').count() === 1);
    await p.screenshot({ path: S + '/p-grid.png', fullPage: true });
    await overflowAndTaps(p, 'profile with posts');

    console.log('Viewer');
    await p.click('main ul li button[aria-label^="Open photo"]'); await p.waitForSelector('dialog[open]');
    ok('tapping a photo opens it large with its caption', /Soundcheck at golden hour/.test(await p.textContent('dialog[open]')) && await p.locator('dialog[open] img').count() === 1);
    await p.screenshot({ path: S + '/p-viewer.png' });
    await p.click('dialog[open] button[aria-label="Next post"]');
    ok('next shows the video player and its caption', await p.locator('dialog[open] video').count() === 1 && /Two seconds/.test(await p.textContent('dialog[open]')));
    await p.click('dialog[open] button[aria-label="Close"]'); await p.waitForSelector('dialog:not([open])', { state: 'attached' });
    ok('close button closes the viewer', await p.locator('dialog[open]').count() === 0);

    console.log('Feed');
    await p.goto(base + '/m/feed'); await p.waitForSelector('text=From the scene');
    await p.waitForSelector('article img[src*="/storage/v1/object/public/photos/"]', { timeout: 15000 });
    ok('the new photo and video show up in the scene feed (look at Mara\'s own post, venues post media too)', await p.locator('article:has-text("Two seconds of the opener") video[src*="/storage/v1/object/public/videos/"]').count() === 1 && await p.locator('article:has-text("Soundcheck at golden hour") img[src*="/storage/v1/object/public/photos/"]').count() >= 1);
    await p.screenshot({ path: S + '/p-feed.png', fullPage: true });
    await overflowAndTaps(p, 'feed with media');

    console.log('Profile photo');
    await p.goto(base + '/m/profile/edit'); await p.waitForSelector('h1:has-text("Edit profile")');
    await p.setInputFiles('label:has-text("Add photo") input[type=file]', f('photo.png', 'image/png'));
    await p.waitForSelector('text=Profile photo updated', { timeout: 60000 });
    const av = sb('GET', `/rest/v1/profiles?id=eq.${mara}&select=avatar_url`)[0].avatar_url;
    ok('profile photo saved under the musician folder', av && av.startsWith(mara + '/') && status(storageUrl('photos', av)) === '200', av);
    await p.goto(base + '/m/profile'); await p.waitForSelector('header img[alt$="profile photo"]');
    ok('the header shows the photo instead of initials', true);

    console.log('Edit page');
    await p.goto(base + '/m/profile/edit'); await p.waitForSelector('h1:has-text("Edit profile")');
    await p.screenshot({ path: S + '/p-edit.png', fullPage: true });
    await overflowAndTaps(p, 'edit profile page');
    ok('the musician edit page has no Shop section and no add-to-shop form', await p.locator('section[aria-label="Shop"]').count() === 0 && await p.locator('button:has-text("Add to shop")').count() === 0);

    console.log('Venue view');
    const vctx = await b.newContext({ viewport: { width: 375, height: 812 } });
    const v = await vctx.newPage();
    await v.goto(base + '/login'); await v.click('button[value=venue]'); await v.waitForURL('**/v/calendar', { timeout: 30000 });
    await v.goto(base + '/v/musicians/' + mara); await v.waitForSelector('h1:has-text("Mara Quinn")');
    ok('a venue sees the full profile with no edit controls', await v.locator('a:has-text("Edit profile")').count() === 0 && await v.locator('input').count() === 0 && await v.locator('main ul li button[aria-label^="Open"]').count() === 2);
    await v.screenshot({ path: S + '/p-venue-view.png', fullPage: true });
    await overflowAndTaps(v, 'venue view of a musician');
    ok('the venue view of a musician has no Shop tab either', !/Shop/.test(await v.textContent('nav[aria-label="Profile sections"]')));
    await v.goto(base + '/v/musicians/' + mara + '?tab=music'); await v.waitForSelector('nav[aria-label="Profile sections"]');
    ok('the venue can open the Music tab', await v.locator('nav a[aria-current=page]').first().textContent().then(t => /Music/.test(t)));
    // The page streams, so the HTTP status is already 200 when notFound() runs; what matters is what the visitor sees.
    await v.goto(base + '/v/musicians/' + venue); await v.waitForLoadState('networkidle');
    ok('a venue id is not a musician profile (shows "not found")', /could not be found/.test(await v.innerText('body')));
    await v.goto(base + '/v/musicians/not-a-real-id'); await v.waitForLoadState('networkidle');
    ok('a malformed id shows "not found", not a crash', /could not be found/.test(await v.innerText('body')));
    await v.goto(base + '/m/profile/edit'); await v.waitForLoadState('networkidle');
    ok('a venue cannot open the musician edit page', new URL(v.url()).pathname === '/v/calendar', v.url());
    const slot = sb('POST', '/rest/v1/gig_slots', { venue_id: venue, starts_at: new Date(Date.now() + 3 * 86400000).toISOString(), set_length_min: 90, pay_cents: 12300, genre: 'Folk', is_urgent: false })[0].id;
    sb('POST', '/rest/v1/applications', { slot_id: slot, musician_id: mara });
    await v.goto(base + '/v/requests'); await v.waitForSelector('text=Mara Quinn');
    ok('a request links to the musician\'s full profile', await v.locator('a:has-text("View full profile")').count() === 1);
    await v.click('a:has-text("View full profile")'); await v.waitForURL('**/v/musicians/' + mara, { timeout: 20000 });
    ok('the link opens that profile', true);
    const mctx = await b.newContext({ viewport: { width: 375, height: 812 } });
    const m2 = await mctx.newPage();
    await m2.goto(base + '/login'); await m2.click('button[value=musician]'); await m2.waitForURL('**/m/feed', { timeout: 30000 });
    await m2.goto(base + '/v/musicians/' + mara); await m2.waitForLoadState('networkidle');
    ok('a musician cannot use the venue profile route', new URL(m2.url()).pathname === '/m/feed', m2.url());

    console.log('Delete');
    await p.goto(base + '/m/profile/edit'); await p.waitForSelector('h1:has-text("Edit profile")');
    const li = p.locator('section[aria-label="Posts"] ul li', { hasText: 'Soundcheck at golden hour' });
    await li.locator('summary:has-text("Delete")').click(); await li.locator('button:has-text("Yes, delete")').click();
    await p.waitForURL('**/m/profile/edit?removed=post', { timeout: 30000 });
    ok('deleting a post removes the row and its file', mine().length === 1 && gone(purl), `${mine().length} ${status(purl)}`);
  } catch (e) {
    fail++; console.log('  FAIL script error: ' + String(e).split('\n')[0]); console.log('  at url:', p.url());
    await p.screenshot({ path: S + '/p-error.png', fullPage: true }).catch(() => {});
  } finally {
    console.log('Cleanup');
    sb('DELETE', `/rest/v1/applications?musician_id=eq.${mara}`);
    sb('DELETE', `/rest/v1/gig_slots?venue_id=eq.${venue}`);
    sb('DELETE', `/rest/v1/posts?author_id=eq.${mara}`);
    sb('DELETE', `/rest/v1/products?owner_id=eq.${mara}`);
    sb('PATCH', `/rest/v1/profiles?id=eq.${mara}`, { avatar_url: null });
    sb('PATCH', `/rest/v1/musician_profiles?profile_id=eq.${mara}`, { media_links: origLinks });
    await cleanupStorage(mara);
    fs.rmSync(dir, { recursive: true, force: true });
    console.log('  removed test posts, photos and files; restored the demo musician');
    console.log('page errors:', JSON.stringify(errs));
    console.log(`\n${pass} passed, ${fail} failed`);
    await b.close(); process.exit(fail ? 1 : 0);
  }
})();
