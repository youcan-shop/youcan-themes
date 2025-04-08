if (!customElements.get("yc-product")) {
  class Product extends HTMLElement {
    static observedAttributes = ["product-id"];
    static MAXIMUM_FILE_SIZE = 2;
    static BYTES_IN_KB = 1024;
    static KB_IN_MB = 1024;

    constructor() {
      super();

      this.variants = [...this.querySelectorAll("yc-variant")];
      this.productForm = this.querySelector("yc-product-form");
      this.productMedia = this.querySelector("yc-product-media");
      this.productVariants = window.productsVariants[this.getAttribute("product-id")];
    }

    connectedCallback() {
      if (!this.productVariants) return;

      this.disableUnavailableOptions();
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

      if (matchedVariant) await this.updateVariant(matchedVariant);

      this.disableUnavailableOptions();
    }

    async updateVariant({ id, available, inventory, price, compare_at_price, image }) {
      this.productForm.setAttribute("variant-id", id);
      this.productForm.toggleAttribute("not-available", !available);

      const attachedImage = await this.getAttachedImage();

      attachedImage && this.productForm.setAttribute("attached-image", attachedImage);
      image && this.updateMainImage(image);

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

      const showCount = inventoryElement.getAttribute("data-show-count");
      const threshold = Number(inventoryElement.getAttribute("data-threshold")) || 0;

      const statusKey =
        inventory === 0
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

    updateMainImage(image_src) {
      const gallery = this.productMedia.querySelector("[data-gallery]");

      if (!gallery) return;

      gallery.querySelectorAll("img").forEach((element) => {
        if (element.src === image_src) {
          const input = element.previousElementSibling;

          input.checked = true;
          this.productMedia.updateMainImage(input.value, element.src);
        }
      });
    }

    disableUnavailableOptions() {
      const lastVariant = this.variants.filter((variant) => variant.getAttribute("name") !== "upload-image").at(-1);

      if (!lastVariant) return;

      const inputs = lastVariant.querySelectorAll("input");

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

      this.productForm.toggleAttribute(
        "not-available",
        [...inputs].every((input) => input.disabled),
      );

      const hasCheckedInput = [...inputs].some((input) => input.checked);
      this.productForm.querySelector("[data-buy-button]").disabled = !hasCheckedInput;
    }

    async getAttachedImage() {
      const fileInput = this.variants
        .flatMap((variant) => [...variant.querySelectorAll("input[type='file']")].filter((input) => input.files.length > 0))
        .pop();

      if (!fileInput) return null;

      const file = fileInput.files[0];
      const fileSizeInKB = file.size / Product.BYTES_IN_KB;
      const fileSizeInMB = fileSizeInKB / Product.KB_IN_MB;

      if (fileSizeInMB > Product.MAXIMUM_FILE_SIZE) return null;

      return fileInput
        ? new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(fileInput.files[0]);
          })
        : null;
    }

    getBaseName(name) {
      return name.split("_")[0];
    }
  }

  customElements.define("yc-product", Product);
}
