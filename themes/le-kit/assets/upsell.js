import { Component } from "@theme/component";
import { readJson } from "@theme/utilities";

/**
 * Post-purchase upsell: answers the offer with youcanjs, then reloads (next upsell or thank you page).
 * Refs: `actions[]` (buttons named "yes" or "no"), `offers` (JSON of product id → variant id).
 */
class UpsellComponent extends Component {
  connectedCallback() {
    super.connectedCallback();
    (this.refs.actions ?? []).forEach((/** @type {HTMLButtonElement} */ button) =>
      button.addEventListener("click", () => this.answer(button), { signal: this.signal }),
    );
  }

  /** @param {HTMLButtonElement} button */
  async answer(button) {
    const answer = button.name;
    if (answer !== "yes" && answer !== "no") return;

    button.setAttribute("data-loading", "");
    this.refs.actions.forEach((/** @type {HTMLButtonElement} */ action) => (action.disabled = true));

    try {
      await youcanjs.upsell.answer({
        answer,
        product_offers: readJson(this.refs.offers, {}),
        order_id: this.getAttribute("order-id"),
        upsell_id: this.getAttribute("upsell-id"),
      });
      window.location.reload();
    } catch {
      window.location.href = "/checkout/thankyou";
    }
  }
}

if (!customElements.get("ui-upsell")) customElements.define("ui-upsell", UpsellComponent);
