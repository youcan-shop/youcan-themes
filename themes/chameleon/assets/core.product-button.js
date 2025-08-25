if (!customElements.get("ui-product-button")) {
  class ProductButton extends HTMLElement {
    static observedAttributes = ["variant-id", "quantity", "checkout-type", "attached-image", "source", "not-available", "skip-cart"];

    constructor() {
      super();

      this.form = this.closest("[ui-order-form]");
      this.buyButton = this.querySelector("button");
    }

    connectedCallback() {
      this._render();
    }

    attributeChangedCallback(name) {
      if (name === "not-available" && this.buyButton) this.handleAvailabilityChange();
    }

    _render() {
      if (!this.buyButton) return;

      this.checkoutType === "express" && this.form
        ? this.form.addEventListener("submit", this.onBuyClicked.bind(this))
        : this.buyButton.addEventListener("click", this.onBuyClicked.bind(this));

      this.previousElementSibling.addEventListener("change", this.handleQuantityChange.bind(this));
    }

    handleQuantityChange(event) {
      if (event.target.tagName !== "UI-QUANTITY") {
        return;
      }

      this.quantityValue = event.target.getAttribute("quantity");
    }

    handleAvailabilityChange() {
      this.buyButton.disabled = this.hasAttribute("not-available");
    }

    onBuyClicked(event) {
      event.preventDefault();

      this.setIsBuyButtonLoading(true);

      const productVariantId = this.productVariantId;
      const attachedImage = this.attachedImage || null;
      const quantity = this.quantityValue || 1;

      if (this.checkoutType === "express") {
        this.placeOrder(productVariantId, attachedImage, quantity);

        return;
      }

      this.addToCart(productVariantId, attachedImage, quantity);
    }

    async addToCart(productVariantId, attachedImage, quantity) {
      try {
        const newCart = await youcanjs.cart.addItem({
          attachedImage,
          productVariantId,
          quantity,
        });

        publish(PUB_SUB_EVENTS.cartUpdate, {
          source: this.getAttribute("source") ?? "product-form",
          skipCart: this.hasAttribute("skip-cart"),
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

    async placeOrder(productVariantId, attachedImage, quantity) {
      const formData = new FormData(this.form);
      const fields = Object.fromEntries(formData);

      try {
        const response = await youcanjs.checkout.placeExpressCheckoutOrder({
          productVariantId,
          attachedImage,
          quantity,
          fields,
        });

        response
          .onSuccess((_, redirectToThankyouPage) => {
            redirectToThankyouPage();
          })
          .onValidationErr((error) => {
            toast.show(error.message, "error");

            for (const [field, message] of Object.entries(error.meta.fields)) {
              const isCustomField = field.includes("extra_fields");

              this.form
                .querySelector(`input[name="${isCustomField ? field.replace(".", "[") + "]" : field}"]`)
                ?.parentElement?.setAttribute("error-message", message);
            }

            return;
          })
          .onSkipShippingStep((_, redirectToShippingPage) => {
            redirectToShippingPage();
          })
          .onSkipPaymentStep((_, redirectToPaymentPage) => {
            redirectToPaymentPage();
          });
      } catch (error) {
        console.error(error);

        toast.show(error.message, "error");
      } finally {
        this.setIsBuyButtonLoading(false);
      }
    }

    setIsBuyButtonLoading(isLoading = true) {
      this.buyButton.toggleAttribute("data-loading", isLoading);
    }

    get checkoutType() {
      return this.getAttribute("checkout-type");
    }

    get attachedImage() {
      return this.getAttribute("attached-image");
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

  customElements.define("ui-product-button", ProductButton);
}
