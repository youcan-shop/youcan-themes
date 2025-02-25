class Product extends HTMLElement {
  static observedAttributes = ["product-id"];

  constructor() {
    super();

    this.variants = [...this.querySelectorAll("yc-variant")];
    this.productForm = this.querySelector("yc-product-form");
    this.productVariants = window.productsVariants[this.getAttribute("product-id")];
  }

  connectedCallback() {
    if (!this.productVariants) return;

    this.disableUnavailableOptions();
    this.variants.forEach((variant) =>
      variant.addEventListener("change", () => this.onVariantChanged()),
    );
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
    const matchedVariant = this.productVariants.find(
      (variant) => JSON.stringify(variant.variations) === JSON.stringify(this.selectedOptions),
    );

    if (matchedVariant) await this.updateVariant(matchedVariant);

    this.disableUnavailableOptions();
  }

  async updateVariant({ id, available, price, compare_at_price }) {
    this.productForm.setAttribute("variant-id", id);
    this.productForm.toggleAttribute("not-available", !available);

    const attachedImage = await this.getAttachedImage();

    if (attachedImage) {
      this.productForm.setAttribute("attached-image", attachedImage);
    }

    const [priceElement, compareAtPriceElement] = this.querySelectorAll("[data-product-item]");

    if (!priceElement) return;

    priceElement.textContent = formatCurrency(price);
    compareAtPriceElement.textContent = formatCurrency(compare_at_price);
    compareAtPriceElement.hidden = !compare_at_price;
  }

  disableUnavailableOptions() {
    const lastVariant = this.variants
      .filter((variant) => variant.getAttribute("name") !== "upload-image")
      .at(-1);

    if (!lastVariant) return;

    const inputs = lastVariant.querySelectorAll("input");

    inputs.forEach((input) => {
      const compareOptions = {
        ...this.selectedOptions,
        [this.getBaseName(input.name)]: input.value,
      };
      const isUnavailable = this.productVariants.some(
        (variant) =>
          JSON.stringify(variant.variations) === JSON.stringify(compareOptions) &&
          !variant.available,
      );

      input.disabled = isUnavailable;

      if (isUnavailable) input.checked = false;
    });

    const hasCheckedInput = [...inputs].some((input) => input.checked);
    this.productForm.toggleAttribute("not-available", !hasCheckedInput);
    this.productForm.querySelector("[data-buy-button]").disabled = !hasCheckedInput;
  }

  async getAttachedImage() {
    const fileInput = this.variants
      .flatMap((variant) =>
        [...variant.querySelectorAll("input[type='file']")].filter(
          (input) => input.files.length > 0,
        ),
      )
      .pop();

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
