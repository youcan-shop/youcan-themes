if (!customElements.get("yc-quantity-control")) {
  class QuantityControl extends HTMLElement {
    constructor() {
      super();

      this.quantity = this.querySelector("[data-current-quantity]");
      this.plusButton = this.querySelector('button[name="plus"]');
      this.minusButton = this.querySelector('button[name="minus"]');
      this.changeEvent = new Event("change", { bubbles: true });
    }

    connectedCallback() {
      this._render();
    }

    _render() {
      this.plusButton.addEventListener("click", this.onButtonClick.bind(this));
      this.minusButton.addEventListener("click", this.onButtonClick.bind(this));
      this.updateButtonsForQuantity(this.quantityValue);
    }

    onButtonClick(event) {
      try {
        if (isNaN(this.quantityValue)) {
          this.quantityValue = 1;
          this.updateMinusButtonState();

          return;
        }

        const buttonName = event.target.name;
        const nextQuantityValue = this.calculateNextQuantity(buttonName);

        if (nextQuantityValue === null) return;

        this.quantityValue = nextQuantityValue;

        this.updateButtonsForQuantity(nextQuantityValue);
        this.dispatchEvent(this.changeEvent);
      } catch (error) {
        console.error(error);

        publish(PUB_SUB_EVENTS.cartError, {
          source: "quantity-control",
          error: error,
        });

        toast.show(error.message, "error");
      }
    }

    updateMinusButtonState(quantity) {
      this.minusButton.toggleAttribute("disabled", quantity <= 1);
    }

    updatePlusButtonState(quantity) {
      this.plusButton.toggleAttribute("disabled", quantity === this.inventoryValue);
    }

    calculateNextQuantity(buttonName) {
      if (buttonName === "plus") {
        if (this.inventoryValue < this.quantityValue) {
          const message = window.errorStrings.insufficient_inventory;
          toast.show(message.replace("[inventory]", this.inventoryValue), "error");

          return null;
        }

        return this.quantityValue + 1;
      }

      return this.quantityValue - 1;
    }

    updateButtonsForQuantity(quantity) {
      this.updateMinusButtonState(quantity);
      this.updatePlusButtonState(quantity);
    }

    get inventoryValue() {
      return parseInt(this.dataset.inventory, 10);
    }

    get quantityValue() {
      return parseInt(this.dataset.quantity, 10);
    }

    set quantityValue(value) {
      const parsed = parseInt(value, 10);
      if (isNaN(parsed)) {
        throw new Error("Invalid quantity value");
      }

      this.dataset.quantity = value;
      this.quantity.textContent = String(value);
    }
  }

  customElements.define("yc-quantity-control", QuantityControl);
}
