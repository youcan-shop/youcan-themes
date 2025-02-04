if (!customElements.get("yc-quantity-control")) {
  class QuantityControl extends HTMLElement {
    constructor() {
      super();

      this.quantity = this.querySelector("[data-cart-item='quantity']");
      this.plusButton = this.querySelector('button[name="plus"]');
      this.minusButton = this.querySelector('button[name="minus"]');
    }

    connectedCallback() {
      this._render();
    }

    _render() {
      this.plusButton.addEventListener("click", this.onButtonClick.bind(this));
      this.minusButton.addEventListener("click", this.onButtonClick.bind(this));
      this.updateMinusButtonState();
      this.updatePlusButtonState();
    }

    async onButtonClick(event) {
      event.preventDefault();
      this.isLoading = true;

      try {
        if (isNaN(this.quantityValue)) {
          this.quantityValue = 1;
          this.updateMinusButtonState();

          return;
        }

        const buttonName = event.target.name;
        const nextValue = this.calculateNextQuantity(buttonName);

        if (nextValue === null) return;

        this.updateButtonsForQuantity(buttonName, nextValue);

        const newCart = await youcanjs.cart.updateItem({
          cartItemId: this.cartItemValue,
          productVariantId: this.productVariantValue,
          quantity: nextValue,
        });

        publish(PUB_SUB_EVENTS.cartUpdate, {
          source: "quantity-control",
          productVariantId: this.productVariantValue,
          cartData: newCart,
        });
      } catch (error) {
        console.error("reeeee", error);

        publish(PUB_SUB_EVENTS.cartError, {
          source: "quantity-control",
          productVariantId: this.productVariantValue,
          error: error,
        });

        toast.show(error.message, "error");
      } finally {
        this.isLoading = false;
      }
    }

    updateMinusButtonState() {
      this.minusButton.toggleAttribute("disabled", this.quantityValue <= 1);
    }

    updatePlusButtonState() {
      this.plusButton.toggleAttribute(
        "disabled",
        this.quantityValue === this.inventoryValue,
      );
    }

    calculateNextQuantity(buttonName) {
      if (buttonName === "plus") {
        if (this.inventoryValue < this.quantityValue) {
          toast.show("Desired quantity not available", "error");
          return null;
        }
        return this.quantityValue + 1;
      }

      return this.quantityValue - 1;
    }

    updateButtonsForQuantity(buttonName, quantity) {
      if (buttonName === "plus") {
        this.plusButton.toggleAttribute(
          "disabled",
          this.inventoryValue === quantity,
        );
      } else {
        this.updateMinusButtonState();
      }
    }

    async updateCartItem(quantity, cartItemId, productVariantId) {
      const response = await youcanjs.cart.updateItem({
        cartItemId,
        productVariantId,
        quantity,
      });

      publish(PUB_SUB_EVENTS.cartUpdate, {
        source: "quantity-control",
        productVariantId: this.productVariantValue,
        cartData: response,
      });
    }

    get cartItemValue() {
      return this.quantity.dataset.item;
    }

    get productVariantValue() {
      return this.quantity.dataset.productVariant;
    }

    get inventoryValue() {
      return parseInt(this.quantity.dataset.inventory, 10);
    }

    get quantityValue() {
      return parseInt(this.quantity.dataset.quantity, 10);
    }

    set quantityValue(value) {
      const parsed = parseInt(value, 10);
      if (isNaN(parsed)) {
        throw new Error("Invalid quantity value");
      }

      this.quantity.textContent = String(value);
    }

    get isLoading() {
      return this.quantity.dataset.loading;
    }

    set isLoading(isLoading) {
      this.toggleAttribute("data-loading", isLoading);
      this.quantity.toggleAttribute("data-loading", isLoading);
    }
  }

  customElements.define("yc-quantity-control", QuantityControl);
}
