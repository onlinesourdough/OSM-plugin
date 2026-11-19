export function classifyTarget(value) {
  if (typeof value !== 'string' || value.length > 2048 || /[\x00-\x1f\x7f]/.test(value)) return null;
  const target = value.trim();
  if (target.startsWith('/') || /^[A-Za-z]:[\\/]/.test(target)) return { target, kind: 'path' };
  try {
    const url = new URL(target);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    const notion = url.hostname === 'notion.so' || url.hostname.endsWith('.notion.so') ||
      url.hostname === 'notion.site' || url.hostname.endsWith('.notion.site') || url.hostname === 'app.notion.com';
    return { target: url.href, kind: notion ? 'notion' : 'url' };
  } catch { return null; }
}
