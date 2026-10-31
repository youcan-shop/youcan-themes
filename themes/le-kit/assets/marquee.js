import { Component } from "@theme/component";

/**
 * Seamless marquee: copies the group to fill the width and moves the track by one group per loop,
 * at a constant speed (`--marquee-duration` is the time for 1800px).
 * Refs: `track`, `group`.
 */
class MarqueeComponent extends Component {
  requiredRefs = ["track", "group"];

  /** @type {ResizeObserver | undefined} */
  #observer;

  #frame = 0;

  connectedCallback() {
    super.connectedCallback();
    this.#observer = new ResizeObserver(() => this.#schedule());
    this.#observer.observe(this);
    this.#observer.observe(this.refs.group);
    document.fonts?.ready.then(() => this.#schedule());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#observer?.disconnect();
    cancelAnimationFrame(this.#frame);
  }

  #schedule() {
    cancelAnimationFrame(this.#frame);
    this.#frame = requestAnimationFrame(() => this.#update());
  }

  #update() {
    /** @type {{ track: HTMLElement, group: HTMLElement }} */
    const { track, group } = /** @type {any} */ (this.refs);
    const period = group.getBoundingClientRect().width;
    if (!period) return;

    track.querySelectorAll("[data-marquee-clone]").forEach((clone) => clone.remove());
    const copies = Math.max(1, Math.ceil(this.clientWidth / period));
    for (let i = 0; i < copies; i++) {
      const clone = /** @type {HTMLElement} */ (group.cloneNode(true));
      clone.setAttribute("aria-hidden", "true");
      clone.setAttribute("data-marquee-clone", "");
      clone.removeAttribute("ref");
      clone.querySelectorAll("[data-youcan-block-id], [id], a, button").forEach((element) => {
        element.removeAttribute("id");
        element.removeAttribute("data-youcan-block-id");
        if (element.matches("a, button")) element.setAttribute("tabindex", "-1");
      });
      track.append(clone);
    }

    const pixelsPerSecond = 1800 / (parseFloat(getComputedStyle(this).getPropertyValue("--marquee-duration")) || 30);
    const rtl = getComputedStyle(this).direction === "rtl";
    track.style.setProperty("--marquee-shift", `${rtl ? period : -period}px`);
    track.style.setProperty("--marquee-duration", `${period / pixelsPerSecond}s`);
  }
}

if (!customElements.get("ui-marquee")) customElements.define("ui-marquee", MarqueeComponent);
