import { Component } from "@theme/component";
import { CartUpdateEvent } from "@theme/events";
import { showToast } from "@theme/toast";
import { formatMoney } from "@theme/utilities";

/** Adds several variants of a product to the cart at once. */
class QuickOrderComponent extends Component {
  requiredRefs = ["addButton", "total"];

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener("input", (event) => /** @type {HTMLElement} */ (event.target).matches("[ref='quantities[]']") && this.#update(), {
      signal: this.signal,
    });
    this.refs.addButton.addEventListener("click", () => this.#addAll(), { signal: this.signal });
  }

  get #lines() {
    return (this.refs.quantities ?? [])
      .map((/** @type {HTMLInputElement} */ input) => {
        const row = /** @type {HTMLElement} */ (input.closest("[data-variant-id]"));
        const max = parseInt(input.max, 10);
        const quantity = Math.min(Math.max(0, parseInt(input.value, 10) || 0), max || Infinity);
        return { id: row.dataset.variantId ?? "", price: Number(row.dataset.price) || 0, quantity };
      })
      .filter((/** @type {{ quantity: number }} */ line) => line.quantity > 0);
  }

  #update() {
    const lines = this.#lines;
    this.refs.total.textContent = formatMoney(lines.reduce((/** @type {number} */ sum, /** @type {any} */ line) => sum + line.price * line.quantity, 0));
    this.refs.addButton.disabled = lines.length === 0;
  }

  async #addAll() {
    const lines = this.#lines;
    if (!lines.length) return;

    this.refs.addButton.setAttribute("data-loading", "");
    try {
      let cart;
      for (const line of lines) cart = await youcanjs.cart.addItem({ productVariantId: line.id, quantity: line.quantity });

      (this.refs.quantities ?? []).forEach((/** @type {HTMLInputElement} */ input) => (input.value = "0"));
      this.#update();
      document.dispatchEvent(new CartUpdateEvent({ cart, source: "product-form" }));
    } catch (error) {
      showToast(/** @type {Error} */ (error).message, "error");
    } finally {
      this.refs.addButton.removeAttribute("data-loading");
    }
  }
}

if (!customElements.get("ui-quick-order")) customElements.define("ui-quick-order", QuickOrderComponent);
