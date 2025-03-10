if (!customElements.get("yc-product")) {
  class Product extends HTMLElement {
    static observedAttributes = ["product-id"];
    static INVENTORY_STATUSES = {
      OUT_OF_STOCK: 0,
      UNAVAILABLE: null,
    };

    constructor() {
      super();
      this.variants = [...this.querySelectorAll("yc-variant")];
      this.productForm = this.querySelector("yc-product-form");
      this.productVariants = window.productsVariants[this.getAttribute("product-id")];
    }

    connectedCallback() {
      if (!this.productVariants) return;
      this.syncOptionAvailability();
      this.variants.forEach((variant) => variant.addEventListener("change", () => this.onVariantChanged()));
    }

    get selectedOptions() {
      return Object.fromEntries(
        this.variants.flatMap((variant) =>
          [...variant.querySelectorAll("input:checked, input[type='file']")].map((input) => [
            this.getBaseName(input.name),
            input.type === "file" ? "upload-zone" : input.value,
          ]),
        ),
      );
    }

    async onVariantChanged() {
      const matchedVariant = this.productVariants.find((variant) => JSON.stringify(variant.variations) === JSON.stringify(this.selectedOptions));

      this.syncOptionAvailability();
      this.syncInventoryStatus();

      if (matchedVariant) {
        await this.updateVariant(matchedVariant);
      }
    }

    async updateVariant({ id, available, inventory, price, compare_at_price }) {
      this.productForm.setAttribute("variant-id", id);
      this.productForm.toggleAttribute("not-available", !available);

      const attachedImage = await this.getAttachedImage();
      if (attachedImage) {
        this.productForm.setAttribute("attached-image", attachedImage);
      }

      this.updateProduct(price, compare_at_price);
      this.updateInventoryStatus(inventory);
    }

    updateProduct(price, compare_at_price) {
      const priceElement = this.querySelector("[data-product-item='price']");
      const compareAtPriceElement = this.querySelector("[data-product-item='compare-at-price']");

      if (!priceElement) return;

      priceElement.textContent = formatCurrency(price);
      compareAtPriceElement.textContent = formatCurrency(compare_at_price);
      compareAtPriceElement.hidden = !compare_at_price;
    }

    updateInventoryStatus(inventory) {
      const inventoryElement = this.querySelector("[data-product-item='inventory']");
      if (!inventoryElement) return;

      const statuses = window.inventoryStatuses;
      const inventoryStatus = this.querySelector("[data-status]");

      if (inventory === Product.INVENTORY_STATUSES.UNAVAILABLE) {
        inventoryStatus.textContent = "--";
        return;
      }

      const showCount = inventoryElement.getAttribute("data-show-count");
      const threshold = Number(inventoryElement.getAttribute("data-threshold")) || 0;

      const statusKey =
        inventory === Product.INVENTORY_STATUSES.OUT_OF_STOCK
          ? "out_of_stock"
          : inventory > threshold
            ? showCount
              ? "in_stock_show_count"
              : "in_stock"
            : showCount
              ? "low_stock_show_count"
              : "low_stock";

      inventoryStatus.textContent = statuses[statusKey].replace("%", inventory);
      inventoryElement.setAttribute("data-inventory", statusKey.replace("_show_count", "").replaceAll("_", "-"));
    }

    syncOptionAvailability() {
      const inputs = this.lastVariantInputs;
      if (!inputs.length) return;

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

      const allDisabled = inputs.every((input) => input.disabled);
      const hasCheckedInput = inputs.some((input) => input.checked);

      this.productForm.toggleAttribute("not-available", allDisabled);
      this.productForm.querySelector("[data-buy-button]").disabled = !hasCheckedInput;
    }

    syncInventoryStatus() {
      const inputs = this.lastVariantInputs;
      if (!inputs.length) return;

      inputs.every((input) => input.disabled)
        ? this.updateInventoryStatus(Product.INVENTORY_STATUSES.OUT_OF_STOCK)
        : this.updateInventoryStatus(Product.INVENTORY_STATUSES.UNAVAILABLE);
    }

    getBaseName(name) {
      return name.split("_")[0];
    }

    async getAttachedImage() {
      const fileInput = this.variants
        .flatMap((variant) => [...variant.querySelectorAll("input[type='file']")].filter((input) => input.files.length > 0))
        .pop();

      return fileInput
        ? new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(fileInput.files[0]);
          })
        : null;
    }

    get lastVariantInputs() {
      const lastVariant = this.variants.filter((variant) => variant.getAttribute("name") !== "upload-image").at(-1);
      return lastVariant ? [...lastVariant.querySelectorAll("input")] : [];
    }
  }

  customElements.define("yc-product", Product);
}
