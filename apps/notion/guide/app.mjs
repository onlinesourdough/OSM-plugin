import { App, applyDocumentTheme, applyHostStyleVariables } from '@modelcontextprotocol/ext-apps';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const app = new App({ name: 'osm-guide', version: __OSM_VERSION__ }, { availableDisplayModes: ['fullscreen'] });
const root = document.getElementById('article');
const back = document.getElementById('back');
const trail = document.getElementById('trail');
const linkBox = document.getElementById('source-link');
let guide = __OSM_PUBLIC_GUIDE__;
let current = guide.root;
const history = [];
const notionId = href => {
  try {
    const url = new URL(href);
    if (!/(^|\.)notion\.(site|so|com)$/.test(url.hostname)) return null;
    return url.pathname.replaceAll('-', '').match(/[0-9a-f]{32}/i)?.[0]?.toLowerCase() || null;
  } catch { return null; }
};

function readable(body, page) {
  return body
    .replace(/<embed source="[^"]*osm-architecture\.html"[^>]*\/>/g, '<div class="osm-architecture"></div>')
    .replace(/<mention\s+url="([^"]+)"[^>]*>([\s\S]*?)<\/mention>/g, (_, url, title) => '[' + title.trim() + '](' + url + ')')
    .replace(/<(page|database)\s+url="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g, (_, tag, url, title) => '\n\n[' + title.trim() + '](' + url + ')\n\n')
    .replace(/<date\s+start="([^"]+)"[^>]*\/>/g, (_, date) => date)
    .replace(/<image\s+source="[^"]+"[^>]*\/>/g, '\n\n[View this image in Notion](' + page.url + ')\n\n')
    .replace(/<file\s+source="[^"]+"[^>]*>([\s\S]*?)<\/file>|<file\s+source="[^"]+"[^>]*\/>/g, '\n\n[Supporting download in Notion](' + page.url + ')\n\n')
    .replace(/<\/?(columns|column|callout|synced-block)(?:\s[^>]*)?>/g, '\n\n')
    .replace(/<p\s*\/>/g, '\n\n');
}
function show(id, remember = true) {
  const page = guide.pages[id];
  if (!page) return;
  if (remember && current !== id) history.push(current);
  current = id;
  linkBox.hidden = true;
  document.getElementById('page-title').textContent = page.title;
  trail.textContent = id === guide.root ? '' : 'OSM';
  trail.hidden = id === guide.root;
  back.hidden = history.length === 0;
  const parsed = marked.parse(readable(page.body, page), { gfm: true });
  root.innerHTML = DOMPurify.sanitize(parsed, { FORBID_TAGS: ['style', 'iframe', 'form', 'input', 'button'], FORBID_ATTR: ['style'] });
  for (const slot of root.querySelectorAll('.osm-architecture')) {
    const shadow = slot.attachShadow({ mode: 'open' });
    // This fixed, script-free diagram is a bundled project asset, not remote page markup.
    shadow.innerHTML = __OSM_ARCHITECTURE__;
  }
  window.scrollTo(0, 0);
}
root.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (!link) return;
  event.preventDefault();
  const id = notionId(link.href);
  if (id && guide.pages[id]) { show(id); return; }
  document.getElementById('link-value').value = link.href;
  document.getElementById('link-caption').textContent = link.textContent;
  linkBox.hidden = false;
  linkBox.scrollIntoView({ block: 'nearest' });
});
back.addEventListener('click', () => show(history.pop(), false));
trail.addEventListener('click', () => show(guide.root));
document.getElementById('copy-link').addEventListener('click', async () => {
  const field = document.getElementById('link-value');
  try { await navigator.clipboard.writeText(field.value); document.getElementById('copy-result').textContent = 'Copied'; }
  catch { field.focus(); field.select(); document.getElementById('copy-result').textContent = 'Select and copy the link'; }
});
app.ontoolresult = result => {
  const next = result?._meta?.['osm/publicGuide'];
  if (next?.format === 'osm-public-guide/1' && next.pages?.[next.root]) {
    guide = next;
    show(guide.pages[current] ? current : guide.root, false);
  }
};
const theme = context => {
  if (context?.theme) applyDocumentTheme(context.theme);
  if (context?.styles?.variables) applyHostStyleVariables(context.styles.variables);
};
app.onhostcontextchanged = theme;
show(guide.root, false);
app.connect().then(() => theme(app.getHostContext())).catch(() => {
  // The bundled public guide stays readable without host callbacks.
});
