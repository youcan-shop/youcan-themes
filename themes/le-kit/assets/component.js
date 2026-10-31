/**
 * Base class for the theme's custom elements.
 *
 * - `refs`: elements marked with `ref="name"` (or `ref="name[]"` for lists) inside the component,
 *   excluding the ones that belong to a nested custom element.
 * - `requiredRefs`: ref names the component can't work without; a missing one throws.
 * - `signal`: aborted when the element disconnects, pass it to `addEventListener` for automatic cleanup.
 *
 * Refs are refreshed when children change, so blocks re-rendered by the theme editor stay wired.
 */
export class Component extends HTMLElement {
  /** @type {Record<string, any>} */
  refs = {};

  /** @type {string[]} */
  requiredRefs = [];

  /** @type {AbortController | undefined} */
  #controller;

  #observer = new MutationObserver(() => this.updateRefs());

  get signal() {
    this.#controller ??= new AbortController();
    return this.#controller.signal;
  }

  connectedCallback() {
    this.updateRefs();
    this.#observer.observe(this, { childList: true, subtree: true });
  }

  disconnectedCallback() {
    this.#observer.disconnect();
    this.#controller?.abort();
    this.#controller = undefined;
  }

  updateRefs() {
    /** @type {Record<string, any>} */
    const refs = {};

    for (const element of this.querySelectorAll("[ref]")) {
      if (closestCustomElement(element) !== this) continue;

      const name = element.getAttribute("ref") ?? "";

      if (name.endsWith("[]")) {
        (refs[name.slice(0, -2)] ??= []).push(element);
      } else {
        refs[name] = element;
      }
    }

    const missing = this.requiredRefs.filter((name) => !(name in refs));
    if (missing.length) throw new Error(`<${this.localName}> is missing required refs: ${missing.join(", ")}`);

    this.refs = refs;
  }
}

/**
 * @param {Element} element
 * @returns {Element | null}
 */
function closestCustomElement(element) {
  let node = element.parentElement;
  while (node && !node.localName.includes("-")) node = node.parentElement;
  return node;
}
