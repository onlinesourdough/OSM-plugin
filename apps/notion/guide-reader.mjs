const SOURCE = 'https://raw.githubusercontent.com/onlinesourdough/OSM-plugin/main/docs-publisher/public-guide.json';
const ROOT = '40d6d2e17f568124af82ceb93dabf77a';
const MAX_BYTES = 512 * 1024;

export function validPublicGuide(value) {
  return Boolean(value?.format === 'osm-public-guide/1' && value.root === ROOT &&
    value.pages && typeof value.pages === 'object' && !Array.isArray(value.pages) &&
    Object.keys(value.pages).length <= 80 && value.pages[ROOT] &&
    Object.entries(value.pages).every(([id, page]) => /^[a-f0-9]{32}$/.test(id) &&
      page && page.id === id && typeof page.title === 'string' && typeof page.body === 'string' &&
      page.url === 'https://gustavanderson.notion.site/' + id) &&
    Buffer.byteLength(JSON.stringify(value)) <= MAX_BYTES);
}

export function createPublicGuideReader(fallback) {
  if (!validPublicGuide(fallback)) throw new Error('Invalid bundled public guide');
  let cached;
  let checked = 0;
  return async function readPublicGuide({ fetcher = fetch, now = Date.now() } = {}) {
    if (cached && now - checked < 300000) return cached;
    checked = now;
    try {
      const response = await fetcher(SOURCE, { redirect: 'error', signal: AbortSignal.timeout(6000), headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Unavailable public guide');
      const length = Number(response.headers.get('content-length'));
      if (length && length > MAX_BYTES) throw new Error('Guide too large');
      let text = '';
      const decoder = new TextDecoder();
      for await (const part of response.body) {
        text += decoder.decode(part, { stream: true });
        if (Buffer.byteLength(text) > MAX_BYTES) throw new Error('Guide too large');
      }
      text += decoder.decode();
      const parsed = JSON.parse(text);
      if (!validPublicGuide(parsed)) throw new Error('Invalid public guide');
      cached = parsed;
    } catch { cached ||= fallback; }
    return cached;
  };
}
