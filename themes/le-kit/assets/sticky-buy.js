import { Component } from "@theme/component";

/**
 * Sticky add to cart bar. Appears once the buy buttons scroll out of view; its button runs the
 * main action, or scrolls back to the product when options or an inline form need input.
 */
class StickyBuyComponent extends Component {
  requiredRefs = ["trigger"];

  /** @type {IntersectionObserver | undefined} */
  #observer;

  connectedCallback() {
    super.connectedCallback();
    const buyButtons = this.closest(".buy-buttons");
    if (!buyButtons || this.closest("dialog")) return;

    this.refs.trigger.addEventListener("click", () => this.#trigger(), { signal: this.signal });

    this.#observer = new IntersectionObserver(([entry]) => {
      const visible = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      this.toggleAttribute("data-visible", visible);
      this.setAttribute("aria-hidden", String(!visible));
    });
    this.#observer.observe(buyButtons);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#observer?.disconnect();
  }

  #trigger() {
    const buyButtons = /** @type {HTMLElement} */ (this.closest(".buy-buttons"));
    const main = /** @type {HTMLButtonElement | null} */ (
      buyButtons.querySelector(".buy-buttons__row .shop-button button, .buy-buttons__row > .button, .express-checkout__actions button")
    );

    if (!main || main.disabled || buyButtons.querySelector(".express-checkout--inline")) {
      (this.closest("ui-product") ?? buyButtons).scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    main.click();
  }
}

if (!customElements.get("ui-sticky-buy")) customElements.define("ui-sticky-buy", StickyBuyComponent);
