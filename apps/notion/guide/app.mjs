import { App, applyDocumentTheme, applyHostStyleVariables } from '@modelcontextprotocol/ext-apps';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { readable, linkedPage } from './readable.mjs';

const app = new App({ name: 'osm-guide', version: __OSM_VERSION__ }, { availableDisplayModes: ['fullscreen'] });
const root = document.getElementById('article');
const back = document.getElementById('back');
const trail = document.getElementById('trail');
const linkBox = document.getElementById('source-link');
let guide = __OSM_PUBLIC_GUIDE__;
let current = guide.root;
const history = [];
function show(id, remember = true, resetScroll = true) {
  const page = guide.pages[id];
  if (!page) return;
  if (remember && current !== id) history.push(current);
  current = id;
  linkBox.hidden = true;
  document.getElementById('page-title').textContent = page.title;
  const edition = document.getElementById('reading-edition');
  const readAt = new Date(page.source_read_at || '');
  edition.textContent = page.edition || (Number.isFinite(readAt.valueOf()) ? 'Guide snapshot · ' + new Intl.DateTimeFormat('en-GB', {dateStyle:'medium',timeZone:'UTC'}).format(readAt) : '');
  edition.hidden = !edition.textContent;
  trail.textContent = id === guide.root ? '' : 'OSM';
  trail.hidden = id === guide.root;
  back.hidden = history.length === 0;
  const parsed = marked.parse(readable(page.body, page), { gfm: true });
  root.innerHTML = DOMPurify.sanitize(parsed, { FORBID_TAGS: ['style', 'iframe', 'form', 'input', 'button'], FORBID_ATTR: ['style'] });
  for (const heading of root.querySelectorAll('h1')) {
    if (heading.textContent.trim() === page.title.trim()) heading.remove();
  }
  for (const slot of root.querySelectorAll('.osm-architecture')) {
    const shadow = slot.attachShadow({ mode: 'open' });
    // This fixed, script-free diagram is a bundled project asset, not remote page markup.
    shadow.innerHTML = __OSM_ARCHITECTURE__;
  }
  if (resetScroll) window.scrollTo(0, 0);
}
root.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (!link) return;
  event.preventDefault();
  const id = linkedPage(link.href, guide.pages, current);
  if (id) { show(id); return; }
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
    show(guide.pages[current] ? current : guide.root, false, !guide.pages[current]);
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
