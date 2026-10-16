/*
 * Product: <ui-product> (variants, price, inventory, media, add-ons, bundles),
 * <ui-shop-button> (add to cart / buy now / express checkout) and <ui-quick-add>.
 */

if (!customElements.get("ui-product")) {
  class Product extends HTMLElement {
    static MAXIMUM_FILE_SIZE_MB = 2;

    connectedCallback() {
      this.options = [...this.querySelectorAll("[data-variant-option]")];
      this.media = this.querySelector("[data-product-media]");
      this.addOns = [...this.querySelectorAll("[data-add-on]")];
      this.bundles = [...this.querySelectorAll("[data-bundle] input[type='checkbox']")];
      this.variants = this.readVariants();

      this.addEventListener("change", (event) => {
        if (event.target.closest("[data-variant-option]")) this.onVariantChange();
        if (event.target.matches("[data-add-on]")) this.updateAddOns();
        if (event.target.closest("[data-bundle]")) this.onBundleChange(event.target);
      });

      if (this.variants.length) this.onVariantChange();
    }

    get shopButtons() {
      return [...this.querySelectorAll("ui-shop-button")];
    }

    readVariants() {
      try {
        return JSON.parse(this.querySelector("[data-product-variants]")?.textContent ?? "[]") ?? [];
      } catch {
        return [];
      }
    }

    get selectedOptions() {
      return Object.fromEntries(
        this.options.map((option) => {
          const name = option.dataset.optionName;
          const input = option.querySelector("input:checked, select, input[type='file']");

          if (!input) return [name, undefined];
          if (input.type === "file") return [name, "upload-zone"];

          return [name, input.value];
        }),
      );
    }

    findVariant(options) {
      const key = JSON.stringify(options);
      return this.variants.find((variant) => JSON.stringify(variant.variations) === key);
    }

    async onVariantChange() {
      this.options.forEach((option) => {
        const label = option.querySelector("[data-selected-value]");
        const checked = option.querySelector("input:checked");
        if (label && checked) label.textContent = checked.value;
      });

      const variant = this.findVariant(this.selectedOptions);
      if (variant) await this.updateVariant(variant);

      this.disableUnavailableOptions();
    }

    async updateVariant({ id, available, inventory, price, compare_at_price, image, sku }) {
      this.querySelectorAll("[data-product-sku]").forEach((element) => {
        element.textContent = sku ?? "";
        element.parentElement.hidden = !sku;
      });

      this.shopButtons.forEach((button) => {
        button.setAttribute("variant-id", id);
        button.toggleAttribute("not-available", !available);
      });

      const attachedImage = await this.getAttachedImage();
      if (attachedImage) this.shopButtons.forEach((button) => button.setAttribute("attached-image", attachedImage));

      if (image) this.updateMedia(image);

      this.updatePrice(price, compare_at_price);
      this.updateInventory(inventory);
      this.updateAddOns();
    }

    updatePrice(price, compareAtPrice) {
      const onSale = Boolean(compareAtPrice && compareAtPrice > price);

      this.querySelectorAll("[data-price]").forEach((container) => {
        container.classList.toggle("price--on-sale", onSale);

        const current = container.querySelector("[data-product-price]");
        const compare = container.querySelector("[data-product-compare-price]");
        const save = container.querySelector("[data-product-save]");

        if (current) current.textContent = formatCurrency(price);
        if (compare) {
          compare.textContent = onSale ? formatCurrency(compareAtPrice) : "";
          compare.hidden = !onSale;
        }
        if (save) {
          save.hidden = !onSale;
          const value = save.querySelector("[data-product-save-value]");
          if (value && onSale) value.textContent = Math.round(((compareAtPrice - price) * 100) / compareAtPrice);
        }
      });
    }

    updateInventory(inventory) {
      this.querySelectorAll(".inventory").forEach((container) => {
        const threshold = Number(container.dataset.threshold) || 0;
        let status = "high-stock";

        if (inventory == null || inventory === 0) status = "sold-out";
        else if (inventory === 1) status = "last-item";
        else if (inventory <= threshold) status = "low-stock";

        container.querySelectorAll("[data-inventory-status]").forEach((element) => {
          element.hidden = element.dataset.inventoryStatus !== status;

          const text = element.querySelector("[data-template]");
          if (text) text.textContent = text.dataset.template.replace("[count]", inventory);
        });
      });
    }

    updateMedia(image) {
      if (!this.media?.goTo) return;

      const path = (url) => String(url).split("?")[0].replace(/^https?:\/\/[^/]+/, "");
      const items = [...this.media.querySelectorAll("[data-carousel-item]")];
      const index = items.findIndex((item) => {
        const a = path(item.dataset.image);
        const b = path(image);
        return a && b && (a.endsWith(b) || b.endsWith(a));
      });

      if (index !== -1) this.media.goTo(index);
    }

    updateAddOns() {
      const checked = this.addOns.filter((addOn) => addOn.checked).map((addOn) => addOn.value);

      this.shopButtons.forEach((button) => {
        const mainId = (button.getAttribute("variant-id") ?? "").split(",")[0];
        const ids = [...new Set([mainId, ...checked].filter(Boolean))];

        button.setAttribute("variant-id", ids.join(","));
        button.toggleAttribute("bulk", ids.length > 1);
      });
    }

    onBundleChange(changed) {
      this.bundles.forEach((bundle) => {
        if (bundle !== changed) bundle.checked = false;
      });

      const bundleId = changed.checked ? changed.value : null;

      this.shopButtons.forEach((button) => {
        bundleId ? button.setAttribute("bundle-id", bundleId) : button.removeAttribute("bundle-id");
      });

      this.querySelectorAll("ui-quantity:not([item])").forEach((quantity) => {
        quantity.toggleAttribute("data-disabled", Boolean(bundleId));
        quantity.updateButtons?.();
      });
      this.querySelectorAll("[data-bundle-selected]").forEach((note) => (note.hidden = !bundleId));

      this.disableUnavailableOptions();
    }

    disableUnavailableOptions() {
      const lastOption = this.options.filter((option) => option.dataset.variantOption !== "upload_image_zone").at(-1);
      if (!lastOption || !this.variants.length) return;

      const inputs = [...lastOption.querySelectorAll("input, option")];
      const name = lastOption.dataset.optionName;

      inputs.forEach((input) => {
        const variant = this.findVariant({ ...this.selectedOptions, [name]: input.value });
        const unavailable = Boolean(variant && !variant.available);

        input.disabled = unavailable;
        if (unavailable && input.checked) input.checked = false;
      });

      const hasBundle = this.bundles.some((bundle) => bundle.checked);
      const hasSelection = inputs.some((input) => (input.checked || input.selected) && !input.disabled);
      const allUnavailable = inputs.every((input) => input.disabled);

      this.shopButtons.forEach((button) => {
        if (hasBundle) {
          button.removeAttribute("not-available");
          return;
        }

        if (allUnavailable) button.setAttribute("not-available", "");
        button.querySelector("button")?.toggleAttribute("disabled", !hasSelection);
      });
    }

    async getAttachedImage() {
      const fileInput = this.options
        .flatMap((option) => [...option.querySelectorAll("input[type='file']")])
        .filter((input) => input.files.length > 0)
        .pop();

      if (!fileInput) return null;

      const file = fileInput.files[0];

      if (file.size / 1024 / 1024 > Product.MAXIMUM_FILE_SIZE_MB) {
        toast?.show(window.errorStrings.large_file.replace("[file]", `"${file.name}"`), "error");
        fileInput.value = "";
        return null;
      }

      return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = () => {
          const preview = fileInput.closest("[data-variant-option]")?.querySelector("[data-upload-preview]");

          if (preview) {
            preview.hidden = false;
            preview.querySelector("img").src = reader.result;
            preview.querySelector("img").alt = file.name;
            preview.querySelector("button").onclick = () => {
              this.shopButtons.forEach((button) => button.removeAttribute("attached-image"));
              preview.hidden = true;
              fileInput.value = "";
            };
          }

          resolve(reader.result);
        };

        reader.readAsDataURL(file);
      });
    }

    goToMedia(index) {
      this.media?.goTo?.(index);
    }
  }

  customElements.define("ui-product", Product);
}

if (!customElements.get("ui-shop-button")) {
  class ShopButton extends HTMLElement {
    static observedAttributes = ["not-available"];

    connectedCallback() {
      this.button = this.querySelector("button");
      this.label = this.querySelector("[data-label]");
      this.form = this.closest("[data-order-form]");

      if (!this.button) return;

      if (this.checkoutType === "express" && this.form) {
        this.form.addEventListener("submit", (event) => this.onBuy(event));
      } else {
        this.button.addEventListener("click", (event) => this.onBuy(event));
      }

      this.closest("ui-product, [data-order-form]")?.addEventListener("change", (event) => {
        if (event.target.matches("ui-quantity:not([item])") && this.contains(event.target) === false) {
          const scope = this.form ?? this.closest("ui-product");
          if (scope?.contains(event.target)) this.setAttribute("quantity", event.target.getAttribute("quantity"));
        }
      });
    }

    attributeChangedCallback() {
      if (!this.button) return;

      const unavailable = this.hasAttribute("not-available");
      this.button.setAttribute("aria-disabled", String(unavailable));
      if (this.label) this.label.textContent = unavailable ? window.actions.out_of_stock : this.label.dataset.label;
    }

    get checkoutType() {
      return this.getAttribute("checkout-type");
    }

    get quantity() {
      return parseInt(this.getAttribute("quantity"), 10) || 1;
    }

    get source() {
      return this.getAttribute("source") ?? "product-form";
    }

    onBuy(event) {
      event.preventDefault();

      if (this.hasAttribute("not-available") || this.button.hasAttribute("data-loading")) return;

      // Special offer: suggest related products once before adding the main product
      const offer = document.querySelector("ui-special-offer");
      const skipOffer = this.hasAttribute("skip-offer");
      this.removeAttribute("skip-offer");

      if (offer?.hasItems && !skipOffer && this.source === "product-form" && !this.hasAttribute("bulk")) {
        offer.open(this);
        return;
      }

      const variantIds = (this.getAttribute("variant-id") ?? "").split(",").filter(Boolean);
      const [mainId, ...addOnIds] = variantIds;

      // Products accepted from the special offer apply to this purchase only
      addOnIds.push(...(this.offerIds ?? []).filter((id) => !addOnIds.includes(id) && id !== mainId));
      this.offerIds = null;
      const bundleId = this.getAttribute("bundle-id");
      const attachedImage = this.getAttribute("attached-image");

      this.setLoading(true);

      if (this.checkoutType === "express") {
        if (addOnIds.length) {
          Promise.all([
            this.placeOrder(mainId, bundleId, attachedImage, this.quantity, true),
            ...addOnIds.map((id) => this.placeOrder(id, null, attachedImage, 1, true)),
          ])
            .then((redirects) => redirects.find(Boolean)?.())
            .finally(() => this.setLoading(false));
        } else {
          this.placeOrder(mainId, bundleId, attachedImage, this.quantity);
        }
        return;
      }

      this.addToCart(mainId, bundleId, attachedImage, this.quantity, addOnIds);
    }

    async addToCart(productVariantId, bundleId, attachedImage, quantity, addOnIds = []) {
      try {
        let cartData = await youcanjs.cart.addItem(
          bundleId ? { bundleId, isBundle: true, quantity: 1 } : { quantity, productVariantId, attachedImage },
        );

        for (const id of addOnIds) {
          cartData = await youcanjs.cart.addItem({ quantity: 1, productVariantId: id });
        }

        const addedItem = cartData.items?.find((item) => item.productVariant?.id === productVariantId);
        window.Dotshop?.pixels?.publish("add-to-cart", addedItem);

        publish(PUB_SUB_EVENTS.cartUpdate, {
          image: this.closest("ui-product, .product-card")?.querySelector("[data-carousel-item][data-active] img, .product-card__media img, .product-media img"),
          source: this.source,
          skipCart: this.hasAttribute("skip-cart"),
          skipToCheckout: this.hasAttribute("skip-to-checkout"),
          productVariantId,
          cartData,
        });

        this.clearAddOns();
      } catch (error) {
        console.error(error);
        publish(PUB_SUB_EVENTS.cartError, { source: this.source, productVariantId, error });
        toast?.show(error.message, "error");
      } finally {
        this.setLoading(false);
      }
    }

    async placeOrder(productVariantId, bundleId, attachedImage, quantity, deferRedirect = false) {
      const fields = Object.fromEntries(new FormData(this.form));

      this.form.querySelectorAll("[error-message]").forEach((field) => field.removeAttribute("error-message"));

      try {
        const response = await youcanjs.checkout.placeExpressCheckoutOrder({
          quantity,
          fields: { ...fields, ...(attachedImage && { attachedImage }) },
          ...(bundleId ? { bundleId, isBundle: true } : { productVariantId }),
        });

        return await new Promise((resolve) => {
          response
            .onSuccess((_, redirectToThankyouPage) => {
              this.clearAddOns();
              deferRedirect ? resolve(redirectToThankyouPage) : redirectToThankyouPage();
            })
            .onValidationErr((error) => {
              toast?.show(error.message, "error");

              for (const [field, message] of Object.entries(error.meta?.fields ?? {})) {
                const name = field.includes("extra_fields") ? `${field.replace(".", "[")}]` : field;
                this.form.querySelector(`[name="${name}"]`)?.closest(".field")?.setAttribute("error-message", message);
              }

              resolve(null);
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
        toast?.show(error.message, "error");
        return null;
      } finally {
        if (!deferRedirect) this.setLoading(false);
      }
    }

    setLoading(isLoading) {
      this.button.toggleAttribute("data-loading", isLoading);
    }

    clearAddOns() {
      this.closest("ui-product")
        ?.querySelectorAll("[data-add-on]:checked")
        .forEach((addOn) => {
          addOn.checked = false;
          addOn.dispatchEvent(new Event("change", { bubbles: true }));
        });
    }
  }

  customElements.define("ui-shop-button", ShopButton);
}

if (!customElements.get("ui-special-offer")) {
  class SpecialOffer extends HTMLElement {
    connectedCallback() {
      this.items = [...this.querySelectorAll("[data-offer-item]")];
      this.submit = this.querySelector("[data-offer-submit]");

      this.items.forEach((item) => item.addEventListener("change", () => this.updateSubmit()));
      this.submit?.addEventListener("click", () => this.accept());
      this.querySelectorAll("[data-offer-skip]").forEach((button) => button.addEventListener("click", () => this.skip()));
      this.addEventListener("toggle", (event) => {
        if (event.newState === "closed") this.reset();
      });
    }

    get hasItems() {
      return this.items?.some((item) => !item.disabled);
    }

    get checked() {
      return this.items.filter((item) => item.checked).map((item) => item.value);
    }

    open(shopButton) {
      this.shopButton = shopButton;
      this.showPopover();
    }

    updateSubmit() {
      if (this.submit) this.submit.disabled = this.checked.length === 0;
    }

    accept() {
      const button = this.shopButton;
      if (!button) return;

      button.offerIds = this.checked;
      this.continue(button);
    }

    skip() {
      if (this.shopButton) this.continue(this.shopButton);
      else this.hidePopover();
    }

    continue(button) {
      button.setAttribute("skip-offer", "");
      this.shopButton = null;
      this.hidePopover();
      button.onBuy(new Event("click"));
    }

    reset() {
      this.items.forEach((item) => (item.checked = false));
      this.updateSubmit();
    }
  }

  customElements.define("ui-special-offer", SpecialOffer);
}

if (!customElements.get("ui-quick-add")) {
  class QuickAdd extends HTMLElement {
    connectedCallback() {
      this.querySelector("button")?.addEventListener("click", () => this.open());
    }

    async open() {
      const dialog = document.getElementById("quick-add");
      const content = dialog?.querySelector("[data-quick-add-content]");
      const url = this.dataset.url;

      if (!dialog || !content || !url) {
        window.location.href = url;
        return;
      }

      content.replaceChildren();
      dialog.showModal();

      try {
        const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}section_id=main`);
        if (!response.ok) throw new Error(response.statusText);

        const html = new DOMParser().parseFromString(await response.text(), "text/html");
        const product = html.querySelector("[data-product-main]");

        if (!product) throw new Error("Product section not found");

        product.classList.add("product-main--quick-add");
        product.classList.remove("page-width");
        product.querySelectorAll(".product-media--grid, .product-media--stack").forEach((media) => {
          media.classList.remove("product-media--grid", "product-media--stack");
          media.classList.add("product-media--carousel");
        });
        product.querySelectorAll("[data-quick-add-hide]").forEach((element) => element.remove());
        content.replaceChildren(product);
      } catch (error) {
        console.error(error);
        window.location.href = url;
      }
    }
  }

  customElements.define("ui-quick-add", QuickAdd);
}

// Quick order list: add several variants of a product at once
if (!customElements.get("ui-quick-order")) {
  class QuickOrder extends HTMLElement {
    connectedCallback() {
      this.button = this.querySelector("[data-add-all]");
      this.total = this.querySelector("[data-total]");

      this.addEventListener("input", (event) => {
        if (event.target.matches("[data-quantity]")) this.update();
      });
      this.button?.addEventListener("click", () => this.addAll());
    }

    get lines() {
      return [...this.querySelectorAll("[data-variant-id]")]
        .map((row) => {
          const input = row.querySelector("[data-quantity]");
          const max = parseInt(input?.max, 10);
          let quantity = Math.max(0, parseInt(input?.value, 10) || 0);
          if (max && quantity > max) quantity = max;
          return { id: row.dataset.variantId, price: Number(row.dataset.price) || 0, quantity };
        })
        .filter((line) => line.quantity > 0);
    }

    update() {
      const lines = this.lines;
      this.total.textContent = formatCurrency(lines.reduce((sum, line) => sum + line.price * line.quantity, 0));
      this.button.disabled = lines.length === 0;
    }

    async addAll() {
      const lines = this.lines;
      if (!lines.length) return;

      this.button.setAttribute("data-loading", "");

      try {
        let cartData;
        for (const line of lines) {
          cartData = await youcanjs.cart.addItem({ productVariantId: line.id, quantity: line.quantity });
        }

        this.querySelectorAll("[data-quantity]").forEach((input) => (input.value = 0));
        this.update();
        publish(PUB_SUB_EVENTS.cartUpdate, { source: "product-form", cartData });
      } catch (error) {
        console.error(error);
        toast?.show(error.message, "error");
      } finally {
        this.button.removeAttribute("data-loading");
      }
    }
  }

  customElements.define("ui-quick-order", QuickOrder);
}
