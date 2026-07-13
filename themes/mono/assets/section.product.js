if (!customElements.get("ui-product")) {
  class Product extends HTMLElement {
    static observedAttributes = ["product-id"];
    static MAXIMUM_FILE_SIZE = 2;
    static BYTES_IN_KB = 1024;
    static KB_IN_MB = 1024;

    constructor() {
      super();

      this.variants = [...this.querySelectorAll("[ui-variant]")];
      this.productMedia = this.querySelector('[ui-product="media"]');
      this.productForms = this.querySelectorAll("ui-shop-button");
      this.productVariants = window.productsVariants[this.getAttribute("product-id")];
      this.addOns = this.querySelectorAll("[ui-add-on]");
      this.bundles = this.querySelectorAll("[data-bundle] input[type='checkbox']");
      this.quantityInput = this.querySelector("ui-quantity");
    }

    connectedCallback() {
      this.addOns.forEach((addOn) => addOn.addEventListener("change", () => this.updateAddOns()));
      this.bundles.forEach((bundle) => bundle.addEventListener("change", () => this.onBundleChanged(bundle)));

      if (!this.productVariants) return;

      this.onVariantChanged();
      this.variants.forEach((variant) => variant.addEventListener("change", () => this.onVariantChanged()));
    }

    onBundleChanged(changed) {
      this.bundles.forEach((bundle) => {
        if (bundle !== changed) bundle.checked = false;
      });

      const isChecked = changed.checked;
      const bundleId = isChecked ? changed.value : null;

      this.productForms.forEach((productForm) => {
        if (bundleId) {
          productForm.setAttribute("bundle-id", bundleId);
        } else {
          productForm.removeAttribute("bundle-id");
        }
      });

      if (this.quantityInput) {
        this.quantityInput.toggleAttribute("data-disabled", isChecked);
      }

      this.disableUnavailableOptions();
    }

    get selectedBundle() {
      return [...this.bundles].find((bundle) => bundle.checked) ?? null;
    }

    get selectedOptions() {
      return Object.fromEntries(
        this.variants.flatMap((variant) =>
          [...variant.querySelectorAll("input:checked, input[type='file'], select")].map((input) => [
            this.getBaseName(input.name),
            input.type === "file" ? "upload-zone" : input.value,
          ]),
        ),
      );
    }

    async onVariantChanged() {
      const matchedVariant = this.productVariants.find((variant) => JSON.stringify(variant.variations) === JSON.stringify(this.selectedOptions));

      if (matchedVariant) await this.updateVariant(matchedVariant);

      this.disableUnavailableOptions();
    }

    async updateVariant({ id, available, inventory, price, compare_at_price, image }) {
      this.productForms.forEach((productForm) => {
        productForm.setAttribute("variant-id", id);
        productForm.toggleAttribute("not-available", !available);
      });

      const attachedImage = await this.getAttachedImage();

      attachedImage && this.productForms.forEach((productForm) => productForm.setAttribute("attached-image", attachedImage));
      image && this.updateMainImage(image);

      this.updateProduct(price, compare_at_price);
      this.updateInventoryStatus(inventory);
      this.updateAddOns();
    }

    updateProduct(price, compare_at_price) {
      const priceElement = this.querySelector("[ui-product-item='price']");
      const compareAtPriceElement = this.querySelector("[ui-product-item='compare-at-price']");

      if (priceElement) {
        priceElement.textContent = formatCurrency(price);
      }

      if (compareAtPriceElement) {
        compareAtPriceElement.textContent = formatCurrency(compare_at_price);
        compareAtPriceElement.hidden = !compare_at_price;
      }
    }

    updateInventoryStatus(inventory) {
      const inventoryElements = this.querySelectorAll("[ui-product-item='inventory']");

      if (inventoryElements.length < 1) return;

      const threshold = Number(inventoryElements[0].getAttribute("data-threshold")) || 0;

      let status;

      if (inventory == null || inventory === 0) {
        status = "sold-out";
      } else if (inventory === 1) {
        status = "last-item";
      } else if (inventory <= threshold) {
        status = "low-stock";
      } else {
        status = "high-stock";
      }

      inventoryElements.forEach((element) => {
        element.hidden = element.dataset.status !== status;
      });
    }

    updateMainImage(image_src) {
      if (!this.productMedia) return;

      const images = this.productMedia.querySelectorAll("img");
      const index = [...images].findIndex((img) => img.src === image_src);

      if (index !== -1) {
        this.productMedia.swipe(index);
      }
    }

    updateAddOns() {
      const checkedAddOns = [...this.addOns].filter((addOn) => addOn.matches("input[type='checkbox']") && addOn.checked).map((addOn) => addOn.value);

      this.productForms.forEach((productForm) => {
        const variantId = productForm.getAttribute("variant-id");
        const ids = variantId ? [variantId.split(",")[0], ...checkedAddOns] : checkedAddOns;
        const uniqueIds = [...new Set(ids)];

        productForm.setAttribute("variant-id", uniqueIds.join(","));
        productForm.toggleAttribute("bulk", uniqueIds.length > 1);
      });
    }

    disableUnavailableOptions() {
      const lastVariant = this.variants.filter((variant) => variant.getAttribute("ui-variant") !== "upload_image_zone").at(-1);

      if (!lastVariant) return;

      const inputs = lastVariant.querySelectorAll("input, select");

      inputs.forEach((input) => {
        const compareOptions = {
          ...this.selectedOptions,
          [this.getBaseName(input.name)]: input.value,
        };
        const isUnavailable = this.productVariants.some(
          (variant) => JSON.stringify(variant.variations) === JSON.stringify(compareOptions) && !variant.available,
        );

        input.disabled = isUnavailable;

        if (isUnavailable) input.checked = false;
      });

      if (this.selectedBundle) {
        this.productForms.forEach((productForm) => {
          productForm.removeAttribute("not-available");
          productForm.querySelector('[ui-slot="button"]').disabled = false;
        });

        return;
      }

      this.productForms.forEach((productForm) =>
        productForm.toggleAttribute(
          "not-available",
          [...inputs].every((input) => input.disabled),
        ),
      );

      const hasCheckedInput = [...inputs].some((input) => input.checked || input.value);

      this.productForms.forEach((productForm) => (productForm.querySelector('[ui-slot="button"]').disabled = !hasCheckedInput));
    }

    async getAttachedImage() {
      const fileInput = this.variants
        .flatMap((variant) => [...variant.querySelectorAll("input[type='file']")].filter((input) => input.files.length > 0))
        .pop();

      if (!fileInput) return null;

      const file = fileInput.files[0];
      const fileSizeInKB = file.size / Product.BYTES_IN_KB;
      const fileSizeInMB = fileSizeInKB / Product.KB_IN_MB;

      if (fileSizeInMB > Product.MAXIMUM_FILE_SIZE) {
        const message = window.errorStrings.large_file;
        toast.show(message.replace("[file]", `"${file.name}"`), "error");

        return;
      }

      return fileInput
        ? new Promise((resolve) => {
            const reader = new FileReader();

            reader.onload = () => {
              const base64 = reader.result;

              const output = fileInput.parentElement.nextElementSibling;
              output.removeAttribute("hidden");

              output.querySelector("img").src = base64;
              output.querySelector("img").alt = file.name;

              output.querySelector("button").addEventListener("click", () => {
                this.productForms.forEach((productForm) => productForm.removeAttribute("attached-image"));
                output.setAttribute("hidden", "");
                fileInput.value = "";
              });
            };
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(fileInput.files[0]);
          })
        : null;
    }

    getBaseName(name) {
      return name.split("_")[0];
    }
  }

  customElements.define("ui-product", Product);
}
