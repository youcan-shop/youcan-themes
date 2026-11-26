import { Component } from "@theme/component";

/**
 * The hovered or focused link selects the matching spotlight image.
 * Refs: `links[]`, `images[]` (matched by position).
 */
class CollectionLinksComponent extends Component {
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener("mouseover", this.#onActivate, { signal: this.signal });
    this.addEventListener("focusin", this.#onActivate, { signal: this.signal });
  }

  /** @param {Event} event */
  #onActivate = (event) => {
    /** @type {HTMLElement[]} */
    const links = this.refs.links ?? [];
    const index = links.findIndex((link) => link.contains(/** @type {Node} */ (event.target)));
    if (index !== -1) this.select(index);
  };

  /** @param {number} index */
  select(index) {
    for (const elements of [this.refs.links ?? [], this.refs.images ?? []]) {
      elements.forEach((/** @type {HTMLElement} */ element, /** @type {number} */ i) => element.toggleAttribute("data-active", i === index));
    }
  }
}

if (!customElements.get("ui-collection-links")) customElements.define("ui-collection-links", CollectionLinksComponent);
