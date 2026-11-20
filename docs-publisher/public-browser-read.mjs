import { pathToFileURL } from 'node:url';

export const letters = value => value.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
const pageId = value => new URL(value).pathname.match(/([a-f0-9]{32})(?:\/|$)/i)?.[1]?.toLowerCase();

export function allowed(input) {
  if (!input || !Array.isArray(input.allowedUrls) || input.allowedUrls.length > 32 ||
      !input.allowedUrls.includes(input.url) || !Array.isArray(input.markers) ||
      !input.markers.length || input.markers.some(value => typeof value !== 'string' || !letters(value) || value.length > 1000)) return false;
  try {
    const u = new URL(input.url);
    return u.protocol === 'https:' && u.hostname === 'gustavanderson.notion.site' && !u.username && !u.password &&
      !u.port && Boolean(pageId(u.href));
  } catch { return false; }
}

export async function readPublic(input, launch = async () => (await import('playwright')).chromium.launch({headless:true})) {
  if (!allowed(input)) return {ok:false, reason:'URL or markers outside the explicit public page set'};
  let browser;
  try {
    browser = await launch();
    const context = await browser.newContext({acceptDownloads:false});
    const page = await context.newPage();
    const response = await page.goto(input.url, {waitUntil:'domcontentloaded', timeout:30000});
    if (response?.status() !== 200) return {ok:false, reason:'Public page did not return HTTP 200'};
    await page.waitForFunction(markers => {
      const text = document.body?.innerText?.replace(/[^\p{L}\p{N}]/gu,'').toLowerCase() || '';
      return markers.every(marker => text.includes(marker.replace(/[^\p{L}\p{N}]/gu,'').toLowerCase()));
    }, input.markers, {timeout:30000});
    const finalUrl = page.url();
    if (new URL(finalUrl).origin !== new URL(input.url).origin || pageId(finalUrl) !== pageId(input.url))
      return {ok:false, reason:'Public page changed host or page identity'};
    const text = await page.locator('body').innerText({timeout:5000});
    if (Buffer.byteLength(text, 'utf8') > 2_000_000 || !input.markers.every(marker => letters(text).includes(letters(marker))))
      return {ok:false, reason:'Public page was oversized or missing its expected content'};
    return {ok:true, url:input.url, finalUrl, observedAt:new Date().toISOString(), text};
  } catch {
    return {ok:false, reason:'Public browser read failed or its expected content was not visible before timeout'};
  } finally { await browser?.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let source = '';
  for await (const chunk of process.stdin) {
    source += chunk;
    if (source.length > 32000) { console.log(JSON.stringify({ok:false,reason:'Oversized public read request'})); process.exit(1); }
  }
  let result;
  try { result = await readPublic(JSON.parse(source)); }
  catch { result = {ok:false,reason:'Invalid public read request'}; }
  console.log(JSON.stringify(result));
  process.exitCode = result.ok ? 0 : 1;
}
