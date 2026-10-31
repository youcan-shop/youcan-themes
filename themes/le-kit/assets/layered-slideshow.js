import { Component } from "@theme/component";

/**
 * One panel expanded at a time, on click or hover (`data-trigger`), optionally on autoplay.
 * Refs: `layers[]`, `tabs[]`.
 */
class LayeredSlideshowComponent extends Component {
  index = 0;

  /** @type {number | undefined} */
  #timer;

  connectedCallback() {
    super.connectedCallback();

    /** @type {HTMLElement[]} */
    const layers = this.refs.layers ?? [];
    if (!layers.length) return;

    this.select(0);

    layers.forEach((layer, index) => {
      layer.addEventListener("click", () => this.select(index), { signal: this.signal });
      if (this.dataset.trigger === "hover") layer.addEventListener("mouseenter", () => this.select(index), { signal: this.signal });
    });

    if (this.hasAttribute("autoplay") && layers.length > 1) {
      this.play();
      this.addEventListener("mouseenter", () => this.pause(), { signal: this.signal });
      this.addEventListener("mouseleave", () => this.play(), { signal: this.signal });
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.pause();
  }

  /** @param {number} index */
  select(index) {
    this.index = index;
    (this.refs.layers ?? []).forEach((/** @type {HTMLElement} */ layer, /** @type {number} */ i) => layer.toggleAttribute("data-active", i === index));
    (this.refs.tabs ?? []).forEach((/** @type {HTMLElement} */ tab, /** @type {number} */ i) => tab.setAttribute("aria-expanded", String(i === index)));
  }

  play() {
    this.pause();
    const interval = Number(this.getAttribute("interval")) || 6000;
    this.#timer = setInterval(() => this.select((this.index + 1) % this.refs.layers.length), interval);
  }

  pause() {
    clearInterval(this.#timer);
  }
}

if (!customElements.get("ui-layered")) customElements.define("ui-layered", LayeredSlideshowComponent);
