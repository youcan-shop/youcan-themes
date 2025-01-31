if (!customElements.get("yc-product-form")) {
  class ProductForm extends HTMLElement {
    static observedAttributes = ["variant-id", "quantity"];

    constructor() {
      super();

      this.buyButton = this.querySelector("[data-buy-button]");
    }

    connectedCallback() {
      this._render();
    }

    _render() {
      this.buyButton.addEventListener("click", this.onBuyClicked.bind(this));
    }

    async onBuyClicked(event) {
      event.preventDefault();

      this.setIsBuyButtonLoading(true);

      const productVariantId = this.getAttribute("variant-id");
      const quantity = this.getAttribute("quantity") || 1;

      try {
        const response = await youcanjs.cart.addItem({
          productVariantId,
          quantity,
        });

        if (response) {
          publish(PUB_SUB_EVENTS.cartUpdate, {
            source: "product-form",
            productVariantId,
            cartData: response,
          });
        }
      } catch (error) {
        console.error(error);

        publish(PUB_SUB_EVENTS.cartError, {
          source: "product-form",
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
  }

  customElements.define("yc-product-form", ProductForm);
}
