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
    input.markers.every(value => typeof value === 'string' && letters(value) && value.length <= 1000));
}

function batchAllowed(input) {
  return Boolean(input && Array.isArray(input.requests) && input.requests.length > 0 && input.requests.length <= 32 &&
    new Set(input.requests.map(row => row?.url)).size === input.requests.length &&
    input.requests.every(row => allowed({...row, allowedUrls:input.allowedUrls})));
}

export function retryDelay(value, now) {
  if (value == null) return 10000;
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
      const pause = retryDelay(response.headers()?.['retry-after'], timing.now());
      if (pause === null || remaining() <= pause + 1000)
        return {ok:false, url:input.url, reason:'Public page was rate limited; retry later', httpStatus:429};
      await timing.sleep(pause);
      response = await page.goto(input.url, {waitUntil:'domcontentloaded', timeout:budget(30000)});
    }
    if (response?.status() !== 200) return {ok:false, url:input.url, reason:'Public page did not return HTTP 200', httpStatus:response?.status()};
    phase = 'content';
    await page.waitForFunction(markers => {
      const text = document.body?.innerText?.replace(/[^\p{L}\p{N}]/gu,'').toLowerCase() || '';
      return markers.every(marker => text.includes(marker.replace(/[^\p{L}\p{N}]/gu,'').toLowerCase()));
    }, input.markers, {timeout:budget(25000)});
    const finalUrl = page.url();
    if (new URL(finalUrl).origin !== new URL(input.url).origin || pageId(finalUrl) !== pageId(input.url))
      return {ok:false, url:input.url, reason:'Public page changed host or page identity'};
    const text = await page.locator('body').innerText({timeout:budget(5000)});
    if (Buffer.byteLength(text, 'utf8') > 2_000_000 || !input.markers.every(marker => letters(text).includes(letters(marker))))
      return {ok:false, url:input.url, reason:'Public page was oversized or missing its expected content'};
    return {ok:true, url:input.url, finalUrl, observedAt:new Date(timing.now()).toISOString(), text};
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
  const now = options.now || Date.now, sleep = options.sleep || delay;
  const timing = {now, sleep, deadline:now() + 270000};
  let browser, phase = 'launch';
  const results = [];
  try {
    browser = await launch();
    const context = await browser.newContext({acceptDownloads:false, viewport:{width:1280,height:10000}});
    const page = await context.newPage();
    phase = 'navigation';
    for (const request of input.requests) {
      if (results.length && timing.deadline - now() > 1500) await sleep(1500);
      results.push(timing.deadline <= now()
        ? {ok:false, url:request.url, reason:deadlineReason}
        : await observe(page, {...request, diagnostics:input.diagnostics}, timing));
    }
    return {ok:results.every(row => row.ok), results};
  } catch {
    return {ok:false, reason:`Public browser failed during ${phase}`};
  } finally {
    // Shutdown cannot hold the author job indefinitely after its observation deadline.
    if (browser) {
      let timer;
      try { await Promise.race([browser.close(), new Promise(resolve => {timer = setTimeout(resolve, 5000);})]); }
      catch { /* The result already records the bounded observation, never a raw browser exception. */ }
      finally { clearTimeout(timer); }
    }
  }
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
  console.log(JSON.stringify(result));
  process.exitCode = result.ok ? 0 : 1;
}
