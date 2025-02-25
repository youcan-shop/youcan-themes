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
        [...variant.querySelectorAll("input:checked")].map((input) => [
          this.getBaseName(input.name),
          input.value,
        ]),
      ),
    );
  }

  onVariantChanged() {
    const matchedVariant = this.productVariants.find(
      (variant) => JSON.stringify(variant.variations) === JSON.stringify(this.selectedOptions),
    );

    if (matchedVariant) this.updateVariant(matchedVariant);

    this.disableUnavailableOptions();
  }

  updateVariant({ id, available, price, compare_at_price }) {
    this.productForm.setAttribute("variant-id", id);
    this.productForm.toggleAttribute("not-available", !available);

    const [priceElement, compareAtPriceElement] = this.querySelectorAll("[data-product-item]");

    if (!priceElement) return;

    priceElement.textContent = formatCurrency(price);
    compareAtPriceElement.textContent = formatCurrency(compare_at_price);
    compareAtPriceElement.hidden = !compare_at_price;
  }

  disableUnavailableOptions() {
    const lastVariant = this.variants.at(-1);

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

    this.productForm.toggleAttribute(
      "not-available",
      [...inputs].every((input) => input.disabled),
    );
    this.productForm.querySelector("[data-buy-button]").disabled = ![...inputs].some(
      (input) => input.checked,
    );
  }

  getBaseName(name) {
    return name.split("_")[0];
  }
}

customElements.define("yc-product", Product);
