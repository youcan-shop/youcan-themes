if (!customElements.get("yc-product-form")) {
  class ProductForm extends HTMLElement {
    static observedAttributes = ["variant-id", "quantity", "source", "not-available"];

    constructor() {
      super();

      this.buyButton = this.querySelector("[data-buy-button]");
    }

    connectedCallback() {
      this._render();
    }

    attributeChangedCallback(name) {
      if (name === "not-available") {
        this.handleAvailabilityChange();
      }
    }

    _render() {
      this.buyButton.addEventListener("click", this.onBuyClicked.bind(this));
      this.addEventListener("change", this.handleQuantityChange.bind(this));
    }

    handleQuantityChange(event) {
      if (event.target.tagName !== "YC-QUANTITY-CONTROL") {
        return;
      }

      const { quantity } = event.target.dataset;
      this.quantityValue = quantity;
    }

    handleAvailabilityChange() {
      this.buyButton.disabled = this.hasAttribute("not-available");
    }

    async onBuyClicked(event) {
      event.preventDefault();

      this.setIsBuyButtonLoading(true);

      const productVariantId = this.productVariantId;
      const quantity = this.quantityValue || 1;

      try {
        const newCart = await youcanjs.cart.addItem({
          productVariantId,
          quantity,
        });

        publish(PUB_SUB_EVENTS.cartUpdate, {
          source: this.getAttribute("source") ?? "product-form",
          productVariantId,
          cartData: newCart,
        });
      } catch (error) {
        console.error(error);

        publish(PUB_SUB_EVENTS.cartError, {
          source: this.getAttribute("source") ?? "product-form",
          productVariantId,
          error: error,
        });

        toast.show(error.message, "error");
      } finally {
        this.setIsBuyButtonLoading(false);
      }
    }

    setIsBuyButtonLoading(isLoading = true) {
      this.buyButton.toggleAttribute("data-loading", isLoading);
    }

    get productVariantId() {
      return this.getAttribute("variant-id");
    }

    get quantityValue() {
      return parseInt(this.getAttribute("quantity"), 10);
    }

    set quantityValue(value) {
      const parsed = parseInt(value, 10);
      if (isNaN(parsed)) {
        throw new Error("Invalid quantity value");
      }

      this.setAttribute("quantity", value);
    }
  }

  customElements.define("yc-product-form", ProductForm);
}
