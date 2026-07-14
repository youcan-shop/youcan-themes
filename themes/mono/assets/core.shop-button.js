if (!customElements.get("ui-shop-button")) {
  class ShopButton extends HTMLElement {
    static observedAttributes = [
      "variant-id",
      "bundle-id",
      "quantity",
      "checkout-type",
      "attached-image",
      "source",
      "not-available",
      "skip-cart",
      "bulk",
      "skip-to-checkout",
    ];

    constructor() {
      super();

      this.form = this.closest("[ui-order-form]");
      this.buyButton = this.querySelector("button");
      this.buyButtonLabel = this.buyButton?.textContent;
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

      this.closest("ui-product")?.addEventListener("change", this.handleQuantityChange.bind(this));
    }

    handleQuantityChange(event) {
      if (event.target.tagName !== "UI-QUANTITY") {
        return;
      }

      this.quantityValue = event.target.getAttribute("quantity");
    }

    handleAvailabilityChange() {
      this.buyButton.setAttribute("aria-disabled", this.hasAttribute("not-available"));
      const label = this.buyButton.querySelector("span");

      if (label) {
        label.textContent = this.hasAttribute("not-available") ? window.actions.out_of_stock : this.buyButtonLabel;
      }
    }

    onBuyClicked(event) {
      event.preventDefault();

      const offer = document.querySelector("[ui-section='special-offer']");
      const hasOfferItems = offer?.querySelectorAll("[ui-special-offer='item']").length > 0;
      const isSkipping = this.hasAttribute("skip-offer");

      if (isSkipping) this.removeAttribute("skip-offer");

      if (offer && hasOfferItems && !this.hasAttribute("bulk") && !isSkipping) {
        offer.open(this);
        return;
      }

      this.setIsBuyButtonLoading(true);

      const productVariantId = this.productVariantId;
      const bundleId = this.bundleId;
      const attachedImage = this.attachedImage || null;
      const quantity = this.quantityValue || 1;

      if (this.checkoutType === "express") {
        if (this.isBulk) {
          const [mainId, ...addOnIds] = this.productVariantId.split(",");
          Promise.all([
            this.placeOrder(mainId, bundleId, attachedImage, quantity, true),
            ...addOnIds.map((variantId) => this.placeOrder(variantId, null, attachedImage, 1, true)),
          ])
            .then((redirectFns) => redirectFns.find(Boolean)?.())
            .finally(() => this.setIsBuyButtonLoading(false));
        } else {
          this.placeOrder(productVariantId, bundleId, attachedImage, quantity);
        }

        return;
      }

      if (this.isBulk) {
        const [mainId, ...addOnIds] = this.productVariantId.split(",");
        this.addToCart(mainId, bundleId, attachedImage, quantity);
        addOnIds.forEach((variantId) => this.addToCart(variantId, bundleId, attachedImage, 1));

        return;
      }

      this.addToCart(productVariantId, bundleId, attachedImage, quantity);
    }

    async addToCart(productVariantId, bundleId, attachedImage, quantity) {
      try {
        const newCart = await youcanjs.cart.addItem(
          bundleId ? { bundleId, isBundle: true, quantity: 1 } : { quantity, productVariantId, attachedImage },
        );

        publish(PUB_SUB_EVENTS.cartUpdate, {
          source: this.getAttribute("source") ?? "product-form",
          skipCart: this.hasAttribute("skip-cart"),
          skipToCheckout: this.hasAttribute("skip-to-checkout"),
          productVariantId,
          cartData: newCart,
        });

        const selectedVariant = newCart.items.find((variant) => variant.productVariant.id === productVariantId);

        window.Dotshop.pixels.publish("add-to-cart", selectedVariant);
        this.clearAddOns();
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

    async placeOrder(productVariantId, bundleId, attachedImage, quantity, deferRedirect = false) {
      const formData = new FormData(this.form);
      const fields = Object.fromEntries(formData);

      try {
        const response = await youcanjs.checkout.placeExpressCheckoutOrder({
          quantity,
          fields: { ...fields, ...(attachedImage && { attachedImage }) },
          ...(bundleId ? { bundleId, isBundle: true } : { productVariantId }),
        });

        return new Promise((resolve) => {
          response
            .onSuccess((_, redirectToThankyouPage) => {
              this.clearAddOns();
              deferRedirect ? resolve(redirectToThankyouPage) : redirectToThankyouPage();
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
              deferRedirect ? resolve(redirectToShippingPage) : redirectToShippingPage();
            })
            .onSkipPaymentStep((_, redirectToPaymentPage) => {
              deferRedirect ? resolve(redirectToPaymentPage) : redirectToPaymentPage();
            });
        });
      } catch (error) {
        console.error(error);

        toast.show(error.message, "error");
      } finally {
        if (!deferRedirect) this.setIsBuyButtonLoading(false);
      }
    }

    setIsBuyButtonLoading(isLoading = true) {
      this.buyButton.toggleAttribute("data-loading", isLoading);
    }

    get isBulk() {
      return this.hasAttribute("bulk");
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

    get bundleId() {
      return this.getAttribute("bundle-id");
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

    clearAddOns() {
      [...(this.closest("ui-product")?.querySelectorAll("[ui-add-on]") ?? [])]
        .filter((addOn) => addOn.matches("input[type='checkbox']"))
        .forEach((addOn) => {
          addOn.checked = false;
          addOn.dispatchEvent(new Event("change", { bubbles: true }));
        });
    }
  }

  customElements.define("ui-shop-button", ShopButton);
}
