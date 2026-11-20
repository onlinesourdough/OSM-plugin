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

function readableToggles(body, page) {
  const lines = body.split('\n');
  let fence = null;
  let depth = 0;
  return lines.map((line, index) => {
    const mark = line.match(/^\s*(`{3,}|~{3,})/);
    if (mark) {
      if (!fence) fence = mark[1];
      else if (mark[1][0] === fence[0] && mark[1].length >= fence.length && line.trim() === mark[1]) fence = null;
      return line;
    }
    if (fence) return line;
    if (/^\s*<toggle(?:\s[^>]*)?>\s*$/.test(line)) {
      const next = lines[index + 1]?.trim() || '';
      const hasTitle = next && !/^<\/toggle>/.test(next);
      const title = (hasTitle ? next : 'Details').replace(/[&<>"']/g,
        c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
      if (hasTitle) lines[index + 1] = '';
      depth++;
      return '<details><summary>' + title + '</summary>\n';
    }
    if (/^\s*<\/toggle>\s*$/.test(line)) {
      depth = Math.max(0, depth - 1);
      return '\n</details>';
    }
    if (depth && /<embed source="[^"\n]*osm-architecture\.html"[^>]*\/>/.test(line)) {
      return '\n[Open the responsive HTML source in Notion](' + page.url + ')\n';
    }
    return line;
  }).join('\n');
}

export function readable(body, page) {
  return readableToggles(body, page)
    .replace(/<image\s+source="notion-file-block:\/\/[^"\n]*[?&]name=osm-architecture(?:-mobile)?\.png"[^>]*\/>/g, '<div class="osm-architecture"></div>')
    .replace(/<embed source="[^"]*osm-architecture\.html"[^>]*\/>/g, '<div class="osm-architecture"></div>')
    .replace(/<mention\s+url="([^"]+)"[^>]*>([\s\S]*?)<\/mention>/g, (_, url, title) => '[' + title.trim() + '](' + url + ')')
    .replace(/<(page|database)\s+url="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g, (_, tag, url, title) => '\n\n[' + title.trim() + '](' + url + ')\n\n')
    .replace(/<date\s+start="([^"]+)"[^>]*\/>/g, (_, date) => date)
    .replace(/<image\s+source="[^"]+"[^>]*\/>/g, '\n\n[View this image in Notion](' + page.url + ')\n\n')
    .replace(/<file\s+source="[^"]+"[^>]*\/>|<file\s+source="[^"]+"[^>]*>([\s\S]*?)<\/file>/g, '\n\n[Supporting download in Notion](' + page.url + ')\n\n')
    .replace(/<\/?(columns|column|callout|synced-block)(?:\s[^>]*)?>/g, '\n\n')
    .replace(/<p\s*\/>/g, '\n\n');
}
