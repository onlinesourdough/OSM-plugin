import { pathToFileURL } from 'node:url';

export const letters = value => value.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
const pageId = value => new URL(value).pathname.match(/([a-f0-9]{32})(?:\/|$)/i)?.[1]?.toLowerCase();
const invalid = 'URL or markers outside the explicit public page set';
const deadlineReason = 'Public browser run reached its time limit';
const defaultLaunch = async () => (await import('playwright')).chromium.launch({headless:true, timeout:30000});
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function publicUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && u.hostname === 'gustavanderson.notion.site' && !u.username && !u.password &&
      !u.port && Boolean(pageId(u.href));
  } catch { return false; }
}

export function allowed(input) {
  return Boolean(input && Array.isArray(input.allowedUrls) && input.allowedUrls.length > 0 && input.allowedUrls.length <= 32 &&
    new Set(input.allowedUrls).size === input.allowedUrls.length && input.allowedUrls.every(publicUrl) &&
    input.allowedUrls.includes(input.url) && Array.isArray(input.markers) && input.markers.length > 0 && input.markers.length <= 1000 &&
    input.markers.every(value => typeof value === 'string' && letters(value) && value.length <= 1000) &&
    (input.entries === undefined || (Array.isArray(input.entries) && input.entries.length <= 32 && input.entries.every(row =>
      row && /^[a-f0-9]{32}$/.test(row.page) && typeof row.title === 'string' && letters(row.title) && row.title.length <= 1000))));
}

function batchAllowed(input) {
  return Boolean(input && Array.isArray(input.requests) && input.requests.length > 0 && input.requests.length <= 32 &&
    new Set(input.requests.map(row => row?.url)).size === input.requests.length &&
    input.requests.every(row => allowed({...row, allowedUrls:input.allowedUrls})));
}

export function retryDelay(value, now) {
  if (value == null) return 30000;
  const ms = /^\d+$/.test(value) ? Number(value) * 1000 : Date.parse(value) - now;
  return Number.isFinite(ms) && ms >= 0 && ms <= 60000 ? Math.max(1000, ms) : null;
}

async function observe(page, input, timing) {
  let phase = 'navigation';
  const remaining = () => timing.deadline - timing.now();
  const budget = cap => {
    if (remaining() <= 0) throw Error('deadline');
    return Math.min(cap, remaining());
  };
  try {
    let response = await page.goto(input.url, {waitUntil:'domcontentloaded', timeout:budget(30000)});
    if (response?.status() === 429) {
      const pause = retryDelay(response.headers()?.['retry-after'], Date.now());
      if (pause === null || remaining() <= pause + 1000)
        return {ok:false, url:input.url, reason:'Public page was rate limited; retry later', httpStatus:429, stopNavigation:true};
      await timing.sleep(pause);
      response = await page.goto(input.url, {waitUntil:'domcontentloaded', timeout:budget(30000)});
    }
    if (response?.status() === 429) return {ok:false, url:input.url, reason:'Public page was rate limited; retry later', httpStatus:429, stopNavigation:true};
    if (response?.status() !== 200) return {ok:false, url:input.url, reason:'Public page did not return HTTP 200', httpStatus:response?.status()};
    const responseUrl = response.url();
    if (!publicUrl(responseUrl) || new URL(responseUrl).origin !== new URL(input.url).origin || pageId(responseUrl) !== pageId(input.url))
      return {ok:false, url:input.url, reason:'Public page changed host or page identity'};
    phase = 'content';
    await page.waitForFunction(markers => {
      const text = document.body?.innerText?.replace(/[^\p{L}\p{N}]/gu,'').toLowerCase() || '';
      return markers.every(marker => text.includes(marker.replace(/[^\p{L}\p{N}]/gu,'').toLowerCase()));
    }, input.markers, {timeout:budget(25000)});
    // One execution turn captures document identity and content together.
    const observation = await page.evaluate((selectedEntries = []) => ({
      url:window.location.href, text:document.body?.innerText || '',
      links:[...document.querySelectorAll('a[href]')].slice(0,1000).filter(a => a.checkVisibility({checkOpacity:true, checkVisibilityCSS:true}))
        .map(a => ({url:a.href, title:a.innerText})),
      nativeRows:[...document.querySelectorAll('[data-block-id]')].slice(0,1000)
        .filter(row => selectedEntries.some(entry => row.getAttribute('data-block-id')?.replace(/-/g,'') === entry.page))
        .map(row => ({page:row.getAttribute('data-block-id').replace(/-/g,''), tag:row.tagName, role:row.getAttribute('role'),
          className:typeof row.className === 'string' ? row.className.slice(0,300) : '',
          visible:row.checkVisibility({checkOpacity:true, checkVisibilityCSS:true}), title:row.innerText.slice(0,1000)})),
    }), input.entries || []);
    if (remaining() <= 0) throw Error('deadline');
    const finalUrl = observation.url, text = observation.text;
    if (!publicUrl(finalUrl) || new URL(finalUrl).origin !== new URL(input.url).origin || pageId(finalUrl) !== pageId(input.url))
      return {ok:false, url:input.url, reason:'Public page changed host or page identity'};
    if (Buffer.byteLength(text, 'utf8') > 2_000_000 || !input.markers.every(marker => letters(text).includes(letters(marker))))
      return {ok:false, url:input.url, reason:'Public page was oversized or missing its expected content'};
    const entries = (input.entries || []).filter(entry => observation.links.some(link => publicUrl(link.url) &&
      new URL(link.url).origin === new URL(input.url).origin && pageId(link.url) === entry.page && link.title.trim().replace(/\s+/gu,' ') === entry.title) ||
      // Qualified against the seven actual public collection rows in CI44748698317.
      // Notion renders these as DIV navigation rows, not HTML anchors.
      (observation.nativeRows || []).some(row => row.page === entry.page && row.visible === true && row.tag === 'DIV' &&
        ['notion-page-block','notion-collection-item'].every(name => row.className.split(/\s+/u).includes(name)) &&
        row.title.split(/\r?\n/u)[0].trim().replace(/\s+/gu,' ') === entry.title));
    if (entries.length !== (input.entries || []).length) {
      const failed = {ok:false, url:input.url, reason:'Public catalogue did not show every bound skill entry'};
      if (input.diagnostics === true) {
        failed.linkedEntries = entries;
        failed.observedNativeRows = observation.nativeRows;
        failed.observedLinks = observation.links.filter(link=>publicUrl(link.url)).map(link=>({page:pageId(link.url),title:link.title.slice(0,200)}));
      }
      return failed;
    }
    if (remaining() <= 0) throw Error('deadline');
    return {ok:true, url:input.url, finalUrl, observedAt:new Date().toISOString(), text, entries};
  } catch {
    const diagnostic = {ok:false, url:input.url, reason:remaining() <= 0 ? deadlineReason : `Public browser failed during ${phase}`};
    if (phase === 'content' && remaining() > 0) {
      try {
        const text = await page.locator('body').innerText({timeout:budget(1000)});
        if (Buffer.byteLength(text,'utf8') <= 2_000_000) {
          if (input.diagnostics === true) diagnostic.observedText = text;
          diagnostic.expectedMarkers = input.markers.length;
          diagnostic.missingMarkerIndexes = input.markers.flatMap((marker,index)=>letters(text).includes(letters(marker))?[]:[index]);
        }
      } catch { /* No raw exceptions or authenticated content enter diagnostics. */ }
    }
    return diagnostic;
  }
}

export async function readPublicBatch(input, launch = defaultLaunch, options = {}) {
  if (!batchAllowed(input)) return {ok:false, reason:invalid};
  const now = options.now || (()=>performance.now()), sleep = options.sleep || delay;
  const timing = {now, sleep, deadline:now() + 270000};
  let browser, phase = 'launch', shutdownTimer, runTimer;
  const work = async () => {
    const results = [];
    browser = await launch();
    const context = await browser.newContext({acceptDownloads:false, viewport:{width:1280,height:10000}});
    const page = await context.newPage();
    phase = 'navigation';
    let stopped = false;
    for (const request of input.requests) {
      if (!stopped && results.length) {
        if (timing.deadline - now() <= 15000) timing.deadline = now();
        else await sleep(15000);
      }
      const result = stopped
        ? {ok:false, url:request.url, reason:'Public page was rate limited; retry later'}
        : timing.deadline <= now() ? {ok:false, url:request.url, reason:deadlineReason}
        : await observe(page, {...request, diagnostics:input.diagnostics}, timing);
      if (result.stopNavigation) stopped = true;
      delete result.stopNavigation;
      results.push(result);
    }
    return {ok:results.every(row => row.ok), results};
  };
  let result;
  try {
    result = await Promise.race([work(), new Promise(resolve => {
      runTimer = setTimeout(() => resolve({ok:false,reason:deadlineReason}), 270000);
    })]);
  } catch { result = {ok:false, reason:`Public browser failed during ${phase}`}; }
  finally { clearTimeout(runTimer); }
  if (timing.deadline <= now() && result.ok) result = {ok:false,reason:deadlineReason};
  if (browser) {
    try {
      const closed = await Promise.race([browser.close().then(()=>true), new Promise(resolve => {
        shutdownTimer = setTimeout(()=>resolve(false), options.shutdownMs ?? 5000);
      })]);
      if (!closed) result = {ok:false,reason:'Public browser failed during shutdown'};
    } catch { result = {ok:false,reason:'Public browser failed during shutdown'}; }
    finally { clearTimeout(shutdownTimer); }
  }
  return result;
}

export async function readPublic(input, launch = defaultLaunch, options = {}) {
  if (!allowed(input)) return {ok:false, reason:invalid};
  const result = await readPublicBatch({allowedUrls:input.allowedUrls, requests:[input], diagnostics:input.diagnostics}, launch, options);
  return result.results?.[0] || result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let source = '';
  for await (const chunk of process.stdin) {
    source += chunk;
    if (Buffer.byteLength(source, 'utf8') > 256000) { console.log(JSON.stringify({ok:false,reason:'Oversized public read request'})); process.exit(1); }
  }
  let result;
  try {
    const input = JSON.parse(source);
    result = await (Object.hasOwn(input, 'requests') ? readPublicBatch(input) : readPublic(input));
  } catch { result = {ok:false,reason:'Invalid public read request'}; }
  await new Promise(resolve => process.stdout.write(JSON.stringify(result) + '\n', resolve));
  // Playwright's pinned exit hook kills its detached browser process groups.
  process.exit(result.ok ? 0 : 1);
}
