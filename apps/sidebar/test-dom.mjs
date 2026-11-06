// A minimal DOM for app.test.mjs: element tree, ids, bubbling events, focus,
// dialogs, text nodes and simple tag/class queries. It parses tags, attributes
// and trimmed non-blank text from index.html.
const voidTags = new Set(['meta', 'input', 'br', 'img', 'hr', 'link']);

export function createDocument(html) {
  const ids = new Map(), listeners = {};
  let active = null;
  class Element {
    constructor(tag) {
      Object.assign(this, { tagName: tag.toUpperCase(), children: [], parentNode: null, attributes: {}, listeners: {}, dataset: {},
        hidden: false, disabled: false, value: '', open: false, text: '' });
    }
    get id() { return this.attributes.id ?? ''; }
    set id(value) { this.attributes.id = value; ids.set(value, this); }
    get textContent() { return this.text + this.children.map(child => child.textContent).join(''); }
    set textContent(value) { this.replaceChildren(); this.text = String(value); }
    append(...nodes) {
      for (const value of nodes) {
        const child = typeof value === 'string' ? Object.assign(new Element('#text'), { text: value }) : value;
        if (child.parentNode) child.parentNode.children.splice(child.parentNode.children.indexOf(child), 1);
        child.parentNode = this; this.children.push(child);
      }
    }
    replaceChildren(...nodes) { for (const child of this.children) child.parentNode = null; this.children = []; this.text = ''; this.append(...nodes); }
    setAttribute(name, value) { if (name === 'id') this.id = value; else this.attributes[name] = String(value); }
    getAttribute(name) { return this.attributes[name] ?? null; }
    removeAttribute(name) { delete this.attributes[name]; }
    addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
    focus() { active = this; }
    contains(node) { for (; node; node = node.parentNode) if (node === this) return true; return false; }
    descendants() { return this.children.flatMap(child => [child, ...child.descendants()]); }
    // Only the simple selectors the app uses: one tag name or one class. Classes
    // come from parsed class attributes or a script-assigned className.
    querySelectorAll(selector) {
      const match = selector.startsWith('.')
        ? node => String(node.className ?? node.attributes.class ?? '').split(/\s+/).includes(selector.slice(1))
        : node => node.tagName === selector.toUpperCase();
      return this.descendants().filter(match);
    }
    showModal() { this.open = true; }
    close() { this.open = false; this.dispatch('close'); }
    async dispatch(type, init = {}) {
      let stopped = false;
      const event = { type, target: this, defaultPrevented: false, ...init,
        preventDefault() { event.defaultPrevented = true; }, stopPropagation() { stopped = true; } };
      const results = [];
      for (let node = this; node && !stopped; node = node.parentNode) for (const handler of node.listeners[type] || []) results.push(handler(event));
      if (!stopped) for (const handler of listeners[type] || []) results.push(handler(event));
      await Promise.all(results);
      return event;
    }
  }
  const document = {
    get activeElement() { return active; },
    getElementById: id => ids.get(id) ?? null,
    createElement: tag => new Element(tag),
    createTextNode: text => Object.assign(new Element('#text'), { text: String(text) }),
    addEventListener(type, handler) { (listeners[type] ||= new Set()).add(handler); },
    removeEventListener(type, handler) { listeners[type]?.delete(handler); },
  };
  const root = new Element('#document'), stack = [root];
  let end = 0;
  for (const { 0: match, 1: closing, 2: tag, 3: rest, index } of html.matchAll(/<(\/?)(\w+)([^>]*)>/g)) {
    const text = html.slice(end, index).trim(); end = index + match.length;
    if (text) stack.at(-1).append(text);
    if (closing) { const index = stack.findLastIndex(node => node.tagName === tag.toUpperCase()); if (index > 0) stack.length = index; continue; }
    const element = new Element(tag);
    for (const [, name, value = ''] of rest.matchAll(/([\w-]+)(?:="([^"]*)")?/g)) {
      if (['hidden', 'disabled'].includes(name)) element[name] = true; else element.setAttribute(name, value);
    }
    stack.at(-1).append(element);
    if (!voidTags.has(tag) && !rest.endsWith('/')) stack.push(element);
  }
  return document;
}
