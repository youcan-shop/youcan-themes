/* eslint-disable no-console */
if (!customElements.get("product-form")) {
  class ProductForm extends HTMLElement {
    constructor() {
      super();

      this.form = this.querySelector("form");
      this.submitButton = this.querySelector('[type="submit"]');
      // this.cart =
      //   document.querySelector("cart-notification") ||
      //   document.querySelector("cart-drawer");
      // this.submitButtonText = this.submitButton.querySelector("span");

      // this.hideErrors = this.dataset.hideErrors === "true";
    }

    connectedCallback() {
      this._render();
    }

    async onSubmitHandler(event) {
      event.preventDefault();

      this.setBuyButtonIsLoading(true);

      const formData = new FormData(this.form);
      const productVariantId = formData.get("productVariantId");
      const quantity = formData.get("quantity");

      try {
        const response = await youcanjs.cart.addItem({
          productVariantId,
          quantity,
        });

        console.log(response);
      } catch (error) {
        console.error(error);
      } finally {
        this.setBuyButtonIsLoading(false);
      }
      // try
      // send request
      // if error -> publish error event
      // if no error -> publish cart update event
    }

    setBuyButtonIsLoading(isLoading = true) {
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

    // onSubmitHandler(evt) {
    //   evt.preventDefault();
    //   if (this.submitButton.getAttribute("aria-disabled") === "true") return;

    //   this.handleErrorMessage();

    //   this.submitButton.setAttribute("aria-disabled", true);
    //   this.submitButton.classList.add("loading");
    //   this.querySelector(".loading__spinner").classList.remove("hidden");

    //   const config = fetchConfig("javascript");
    //   config.headers["X-Requested-With"] = "XMLHttpRequest";
    //   delete config.headers["Content-Type"];

    //   const formData = new FormData(this.form);
    //   if (this.cart) {
    //     formData.append(
    //       "sections",
    //       this.cart.getSectionsToRender().map((section) => section.id),
    //     );
    //     formData.append("sections_url", window.location.pathname);
    //     this.cart.setActiveElement(document.activeElement);
    //   }
    //   config.body = formData;

    //   fetch(`${routes.cart_add_url}`, config)
    //     .then((response) => response.json())
    //     .then((response) => {
    //       if (response.status) {
    //         publish(PUB_SUB_EVENTS.cartError, {
    //           source: "product-form",
    //           productVariantId: formData.get("id"),
    //           errors: response.errors || response.description,
    //           message: response.message,
    //         });
    //         this.handleErrorMessage(response.description);

    //         const soldOutMessage =
    //           this.submitButton.querySelector(".sold-out-message");
    //         if (!soldOutMessage) return;
    //         this.submitButton.setAttribute("aria-disabled", true);
    //         this.submitButtonText.classList.add("hidden");
    //         soldOutMessage.classList.remove("hidden");
    //         this.error = true;
    //         return;
    //       } else if (!this.cart) {
    //         window.location = window.routes.cart_url;
    //         return;
    //       }

    //       if (!this.error)
    //         publish(PUB_SUB_EVENTS.cartUpdate, {
    //           source: "product-form",
    //           productVariantId: formData.get("id"),
    //           cartData: response,
    //         });
    //       this.error = false;
    //       const quickAddModal = this.closest("quick-add-modal");
    //       if (quickAddModal) {
    //         document.body.addEventListener(
    //           "modalClosed",
    //           () => {
    //             setTimeout(() => {
    //               this.cart.renderContents(response);
    //             });
    //           },
    //           { once: true },
    //         );
    //         quickAddModal.hide(true);
    //       } else {
    //         this.cart.renderContents(response);
    //       }
    //     })
    //     .catch((e) => {
    //       console.error(e);
    //     })
    //     .finally(() => {
    //       this.submitButton.classList.remove("loading");
    //       if (this.cart && this.cart.classList.contains("is-empty"))
    //         this.cart.classList.remove("is-empty");
    //       if (!this.error) this.submitButton.removeAttribute("aria-disabled");
    //       this.querySelector(".loading__spinner").classList.add("hidden");
    //     });
    // }

    // handleErrorMessage(errorMessage = false) {
    //   if (this.hideErrors) return;

    //   this.errorMessageWrapper =
    //     this.errorMessageWrapper ||
    //     this.querySelector(".product-form__error-message-wrapper");
    //   if (!this.errorMessageWrapper) return;
    //   this.errorMessage =
    //     this.errorMessage ||
    //     this.errorMessageWrapper.querySelector(".product-form__error-message");

    //   this.errorMessageWrapper.toggleAttribute("hidden", !errorMessage);

    //   if (errorMessage) {
    //     this.errorMessage.textContent = errorMessage;
    //   }
    // }

    // toggleSubmitButton(disable = true, text) {
    //   if (disable) {
    //     this.submitButton.setAttribute("disabled", "disabled");
    //     if (text) this.submitButtonText.textContent = text;
    //   } else {
    //     this.submitButton.removeAttribute("disabled");
    //     this.submitButtonText.textContent = window.variantStrings.addToCart;
    //   }
    // }

    // get variantIdInput() {
    //   return this.form.querySelector("[name=id]");
    // }
  }

  customElements.define("product-form", ProductForm);
}
