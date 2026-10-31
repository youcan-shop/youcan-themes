import { Component } from "@theme/component";
import { showToast } from "@theme/toast";
import { translate } from "@theme/utilities";

/**
 * Plus / minus quantity selector. Dispatches a bubbling `change` event with the new value
 * in its `quantity` attribute. Cart lines also carry `item` and `product-variant`.
 */
export class QuantitySelectorComponent extends Component {
  requiredRefs = ["value", "increase", "decrease"];

  connectedCallback() {
    super.connectedCallback();
    this.refs.increase.addEventListener("click", () => this.step(1), { signal: this.signal });
    this.refs.decrease.addEventListener("click", () => this.step(-1), { signal: this.signal });
    this.updateButtons();
  }

  get inventory() {
    return parseInt(this.getAttribute("inventory") ?? "", 10) || null;
  }

  get quantity() {
    return parseInt(this.getAttribute("quantity") ?? "", 10) || 1;
  }

  set quantity(value) {
    this.setAttribute("quantity", String(value));
    this.refs.value.textContent = String(value);
    this.updateButtons();
  }

  /** @param {number} delta */
  step(delta) {
    const next = this.quantity + delta;

    if (delta > 0 && this.inventory && next > this.inventory) {
      showToast(translate("insufficientInventory", { inventory: this.inventory }), "error");
      return;
    }

    if (next < 1) return;

    this.quantity = next;
    this.dispatchEvent(new Event("change", { bubbles: true }));
  }

  updateButtons() {
    const disabled = this.hasAttribute("data-disabled");
    this.refs.decrease.disabled = disabled || this.quantity <= 1;
    this.refs.increase.disabled = disabled || Boolean(this.inventory && this.quantity >= this.inventory);
  }
}

if (!customElements.get("ui-quantity")) customElements.define("ui-quantity", QuantitySelectorComponent);
