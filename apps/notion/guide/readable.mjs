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

function readableToggles(body) {
  const lines = body.split('\n');
  let fence = null;
  return lines.map((line, index) => {
    const mark = line.match(/^\s*(`{3,}|~{3,})/);
    if (mark) {
      if (!fence) fence = mark[1];
      else if (line.trim() === fence) fence = null;
      return line;
    }
    if (fence) return line;
    if (/^\s*<toggle(?:\s[^>]*)?>\s*$/.test(line) && lines[index + 1]?.trim()) {
      const title = lines[index + 1].trim().replace(/[&<>"']/g,
        c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
      lines[index + 1] = '';
      return '<details><summary>' + title + '</summary>\n';
    }
    return /^\s*<\/toggle>\s*$/.test(line) ? '\n</details>' : line;
  }).join('\n');
}

export function readable(body, page) {
  return readableToggles(body)
    .replace(/<image\s+source="notion-file-block:\/\/[^"\n]*[?&]name=osm-architecture\.png"[^>]*\/>/g, '<div class="osm-architecture"></div>')
    .replace(/<embed source="[^"]*osm-architecture\.html"[^>]*\/>/g, '<div class="osm-architecture"></div>')
    .replace(/<mention\s+url="([^"]+)"[^>]*>([\s\S]*?)<\/mention>/g, (_, url, title) => '[' + title.trim() + '](' + url + ')')
    .replace(/<(page|database)\s+url="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g, (_, tag, url, title) => '\n\n[' + title.trim() + '](' + url + ')\n\n')
    .replace(/<date\s+start="([^"]+)"[^>]*\/>/g, (_, date) => date)
    .replace(/<image\s+source="[^"]+"[^>]*\/>/g, '\n\n[View this image in Notion](' + page.url + ')\n\n')
    .replace(/<file\s+source="[^"]+"[^>]*\/>|<file\s+source="[^"]+"[^>]*>([\s\S]*?)<\/file>/g, '\n\n[Supporting download in Notion](' + page.url + ')\n\n')
    .replace(/<\/?(columns|column|callout|synced-block)(?:\s[^>]*)?>/g, '\n\n')
    .replace(/<p\s*\/>/g, '\n\n');
}
