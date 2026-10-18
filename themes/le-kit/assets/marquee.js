import { Component } from "@theme/component";

/**
 * Repeats the item group until the track is wide enough to loop without a gap.
 * Refs: `track`, `group`.
 */
class MarqueeComponent extends Component {
  requiredRefs = ["track", "group"];

  connectedCallback() {
    super.connectedCallback();
    requestAnimationFrame(() => this.#fill());
  }

  #fill() {
    /** @type {{ track: HTMLElement, group: HTMLElement }} */
    const { track, group } = /** @type {any} */ (this.refs);
    const groupWidth = group.scrollWidth;
    if (!groupWidth) return;

    const copies = Math.max(1, Math.ceil((this.offsetWidth * 2) / groupWidth));

    for (let i = 0; i < copies; i++) {
      const clone = /** @type {HTMLElement} */ (group.cloneNode(true));
      clone.setAttribute("aria-hidden", "true");
      clone.removeAttribute("ref");
      clone.querySelectorAll("[data-youcan-block-id], [id]").forEach((element) => {
        element.removeAttribute("id");
        element.removeAttribute("data-youcan-block-id");
      });
      track.append(clone);
    }
  }
}

if (!customElements.get("ui-marquee")) customElements.define("ui-marquee", MarqueeComponent);
