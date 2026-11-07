import { classifyTarget } from './target.mjs';

export function notionPageId(target) {
  const route = classifyTarget(target);
  return route?.kind === 'notion' ? new URL(route.target).pathname.replace(/-/g, '').match(/[a-f0-9]{32}$/i)?.[0].toLowerCase() : undefined;
}

// Only emoji and Notion's built-in icon assets are loaded. Uploaded/custom icons
// keep their text label; arbitrary image hosts cannot track panel opens.
export function pageIcon(value) {
  if (value?.type === 'emoji') value = value.emoji;
  else if (value?.type === 'icon' && typeof value.icon?.name === 'string' && typeof value.icon?.color === 'string'
      && /^[a-z0-9_-]+$/.test(value.icon.name) && /^[a-z]+$/.test(value.icon.color)) value = `/icons/${value.icon.name}_${value.icon.color}.svg`;
  else if (value?.type === 'external') value = value.external?.url;
  if (typeof value !== 'string') return null;
  if (value.length <= 90000 && /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) return value;
  if (value.length > 512) return null;
  if (/^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\p{Emoji_Modifier}|[\u200d\ufe0f\u20e3]|[0-9#*])+$/u.test(value) && /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20e3/u.test(value)
      && [...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(value)].length === 1) return value;
  try {
    const url = new URL(value, 'https://www.notion.so');
    if (url.origin === 'https://www.notion.so' && !url.username && !url.password && !url.search && !url.hash && /^\/icons\/[a-z0-9_-]+\.svg$/.test(url.pathname)) return url.href;
  } catch { /* Invalid or unsupported icon. */ }
  return null;
}

export function fetchedPageIcon(data, target) {
  const id = notionPageId(target);
  const identities = [data?.id, data?.url].map(value => notionPageId(value) || (typeof value === 'string' && /^[a-f0-9-]{32,36}$/i.test(value) ? value.replace(/-/g, '').toLowerCase() : undefined)).filter(Boolean);
  if (!id || !identities.length || identities.some(value => value !== id)) throw new Error('Notion returned a different page.');
  // Database fetches expose the icon in the opening tag, while pages also have
  // structured icon metadata. Never inspect document content for a substitute.
  const header = typeof data.text === 'string' ? data.text.slice(0, 2048).match(/^<(?:page|database)\b[^>]*>/)?.[0] : '';
  const value = Object.hasOwn(data, 'icon') ? data.icon : header?.match(/\bicon="([^"]*)"/)?.[1];
  return { target, icon: pageIcon(value) };
}
