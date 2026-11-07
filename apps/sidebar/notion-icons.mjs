import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { pageIcon } from './page-icons.mjs';

const limit = 64 * 1024;
const publicIPv4 = address => {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = parts;
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31
    || a === 192 && [0, 168].includes(b) || a === 100 && b >= 64 && b <= 127 || a === 198 && [18, 19, 51].includes(b)
    || a === 203 && b === 0);
};

// Images are fetched without Notion credentials, pinned to a validated public
// address. Never let a page-controlled URL reach localhost, private networks or
// a redirect destination. Signed URLs and bytes are not stored on disk.
export async function fetchIcon(url, { resolve = lookup, get = request } = {}) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port && parsed.port !== '443') throw new Error('Unsupported image');
  let timer;
  const addresses = await Promise.race([resolve(parsed.hostname, { family: 4, all: true }),
    new Promise((_resolve, reject) => { timer = setTimeout(() => reject(new Error('Image lookup timed out')), 5000); })]).finally(() => clearTimeout(timer));
  if (!addresses.length || addresses.some(item => !publicIPv4(item.address))) throw new Error('Unsupported image');
  return new Promise((resolveImage, reject) => {
    const req = get(parsed, { method: 'GET', family: 4, headers: { Accept: 'image/png,image/jpeg,image/webp,image/gif' },
      lookup: (_host, _options, cb) => cb(null, addresses[0].address, 4) }, res => {
      const mime = String(res.headers['content-type'] || '').split(';')[0];
      if (res.statusCode !== 200 || !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(mime)) {
        res.destroy(); reject(new Error('Unsupported image')); return;
      }
      let size = 0; const chunks = [];
      res.on('data', chunk => {
        size += chunk.length;
        if (size > limit) { res.destroy(); reject(new Error('Image too large')); } else chunks.push(chunk);
      });
      res.on('error', reject);
      res.on('end', () => resolveImage(`data:${mime};base64,${Buffer.concat(chunks).toString('base64')}`));
    });
    // A total bound, including slow trickle responses.
    const timer = setTimeout(() => req.destroy(new Error('Image timed out')), 5000);
    req.on('close', () => clearTimeout(timer));
    req.on('error', reject); req.end();
  });
}

export async function readPageIcon(value, fetchImage = fetchIcon) {
  const simple = pageIcon(value);
  if (simple) return simple;
  const url = value?.type === 'custom_emoji' ? value.custom_emoji?.url
    : value?.type === 'file' ? value.file?.url : value?.type === 'external' ? value.external?.url : null;
  if (typeof url !== 'string' || url.length > 4096) return null;
  try { return await fetchImage(url); } catch { return null; }
}
