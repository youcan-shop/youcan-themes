if (!customElements.get("yc-quantity-control")) {
  class QuantityControl extends HTMLElement {
    constructor() {
      super();

      this.quantity = this.querySelector("[data-quantity]");
    }

    connectedCallback() {
      this._render();
    }

    onButtonClick(event) {
      event.preventDefault();
      const previousValue = parseInt(this.quantity.textContent, 10);

      if (isNaN(previousValue)) {
        this.quantity.textContent = 1;
        this.updateMinusButton();

        return;
      }

      if (event.target.name === "plus") {
        /**
         * TODO:
         * Check if variant inventory is active and variant inventory > quantity + 1
         *  Yes?:
         *    increase quantity
         *  No?:
         *    disable button
         */
        this.quantity.textContent = String(previousValue + 1);
      }
      if (event.target.name === "minus") {
        this.quantity.textContent = String(previousValue - 1);
      }

      this.updateMinusButton();
    }

    updateMinusButton() {
      const quantity = this.quantity.textContent;
      const buttonMinus = this.querySelector('button[name="minus"]');
      buttonMinus.toggleAttribute("disabled", quantity <= 1);
    }

    _render() {
      this.querySelectorAll("button").forEach((button) =>
        button.addEventListener("click", this.onButtonClick.bind(this)),
      );
      this.updateMinusButton();
    }
  }

  customElements.define("yc-quantity-control", QuantityControl);
}
