if (!customElements.get("product-form")) {
  class ProductForm extends HTMLElement {
    constructor() {
      super();

      this.form = this.querySelector("form");
      this.submitButton = this.querySelector('[type="submit"]');
    }

    connectedCallback() {
      this._render();
    }

    async onSubmitHandler(event) {
      event.preventDefault();

      this.setIsBuyButtonLoading(true);

      const formData = new FormData(this.form);
      const productVariantId = formData.get("productVariantId");
      const quantity = formData.get("quantity") || 1;

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
      if (isLoading) {
        this.submitButton.setAttribute("data-loading", true);
        this.submitButton.setAttribute("disabled", true);
        this.querySelector(".loading-spinner").classList.remove("hidden");
      } else {
        this.submitButton.removeAttribute("data-loading");
        this.submitButton.removeAttribute("disabled");
        this.querySelector(".loading-spinner").classList.add("hidden");
      }
    }

    _render() {
      this.form.addEventListener("submit", this.onSubmitHandler.bind(this));
    }
  }

  customElements.define("product-form", ProductForm);
}
