import { Component } from "@theme/component";

/**
 * Drawer offering related products before the main product is added to the cart.
 * Opened by `<ui-shop-button>`; accepted products are added with that purchase only.
 */
class SpecialOfferComponent extends Component {
  /** @type {any} */
  #shopButton = null;

  connectedCallback() {
    super.connectedCallback();
    const { signal } = this;

    this.items.forEach((item) => item.addEventListener("change", () => this.#updateSubmit(), { signal }));
    this.refs.submitButton?.addEventListener("click", () => this.#continue(this.#checked), { signal });
    (this.refs.skipButtons ?? []).forEach((/** @type {HTMLElement} */ button) => button.addEventListener("click", () => this.#continue([]), { signal }));
    this.addEventListener("toggle", (event) => /** @type {ToggleEvent} */ (event).newState === "closed" && this.#reset(), { signal });
  }

  /** @returns {HTMLInputElement[]} */
  get items() {
    return this.refs.items ?? [];
  }

  get hasItems() {
    return this.items.some((item) => !item.disabled);
  }

  get #checked() {
    return this.items.filter((item) => item.checked).map((item) => item.value);
  }

  /** @param {any} shopButton */
  open(shopButton) {
    this.#shopButton = shopButton;
    this.showPopover();
  }

  /** @param {string[]} ids */
  #continue(ids) {
    const button = this.#shopButton;
    this.#shopButton = null;
    this.hidePopover();
    if (!button) return;

    button.offerIds = ids;
    button.setAttribute("skip-offer", "");
    button.buy();
  }

  #updateSubmit() {
    if (this.refs.submitButton) this.refs.submitButton.disabled = this.#checked.length === 0;
  }

  #reset() {
    this.items.forEach((item) => (item.checked = false));
    this.#updateSubmit();
  }
}

if (!customElements.get("ui-special-offer")) customElements.define("ui-special-offer", SpecialOfferComponent);
