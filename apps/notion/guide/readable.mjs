export function notionId(href) {
  try {
    const url = new URL(href);
    if (!/(^|\.)notion\.(site|so|com)$/.test(url.hostname)) return null;
    const path = url.pathname.replace(/([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})(?=\/|$)/ig, '$1$2$3$4$5');
    return path.match(/([0-9a-f]{32})(?=\/|$)/i)?.[1].toLowerCase() || null;
  } catch { return null; }
}

export function linkedPage(href, pages, current) {
  const id = notionId(href);
  return id && id !== current && pages[id] ? id : null;
}

export function readable(body, page) {
  return body
    .replace(/<embed source="[^"]*osm-architecture\.html"[^>]*\/>/g, '<div class="osm-architecture"></div>')
    .replace(/<mention\s+url="([^"]+)"[^>]*>([\s\S]*?)<\/mention>/g, (_, url, title) => '[' + title.trim() + '](' + url + ')')
    .replace(/<(page|database)\s+url="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g, (_, tag, url, title) => '\n\n[' + title.trim() + '](' + url + ')\n\n')
    .replace(/<date\s+start="([^"]+)"[^>]*\/>/g, (_, date) => date)
    .replace(/<image\s+source="[^"]+"[^>]*\/>/g, '\n\n[View this image in Notion](' + page.url + ')\n\n')
    .replace(/<file\s+source="[^"]+"[^>]*\/>|<file\s+source="[^"]+"[^>]*>([\s\S]*?)<\/file>/g, '\n\n[Supporting download in Notion](' + page.url + ')\n\n')
    .replace(/<\/?(columns|column|callout|synced-block)(?:\s[^>]*)?>/g, '\n\n')
    .replace(/<p\s*\/>/g, '\n\n');
}
