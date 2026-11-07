import { pageIcon } from './page-icons.mjs';

export function sourceTitle(link) {
  const title = link?.title || '';
  const icon = pageIcon(link?.icon);
  // Older saved labels sometimes include the emoji. Keep one copy on screen.
  const duplicate = icon && !icon.startsWith('https:') && !icon.startsWith('data:') && title.startsWith(icon + ' ');
  return duplicate ? title.slice(icon.length + 1) : title;
}
export function sourceLabel(element, link) {
  const icon = pageIcon(link?.icon);
  const text = document.createElement('span');
  text.className = 'source-title'; text.textContent = sourceTitle(link);
  if (!icon) { element.replaceChildren(text); return; }
  const mark = document.createElement(icon.startsWith('https:') || icon.startsWith('data:') ? 'img' : 'span');
  mark.className = 'source-icon'; mark.setAttribute('aria-hidden', 'true');
  if (mark.tagName === 'IMG') {
    mark.alt = ''; mark.referrerPolicy = 'no-referrer'; mark.src = icon;
    mark.addEventListener('error', () => { mark.hidden = true; });
  } else mark.textContent = icon;
  element.replaceChildren(mark, text);
}
