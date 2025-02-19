class Product extends HTMLElement {
  constructor() {
    super();
    this.variants = [...this.querySelectorAll("yc-variant")];
    this.productForm = this.querySelector("yc-product-form");
  }

  connectedCallback() {
    this.disableUnavailableOptions();
    this.variants.forEach((variant) =>
      variant.addEventListener("change", () => this.onVariantChanged()),
    );
  }

  get selectedOptions() {
    return Object.fromEntries(
      this.variants.flatMap((variant) =>
        [...variant.querySelectorAll("input:checked")].map((input) => [input.name, input.value]),
      ),
    );
  }

  onVariantChanged() {
    const matchedVariant = productVariants.find(
      (variant) => JSON.stringify(variant.variations) === JSON.stringify(this.selectedOptions),
    );

    if (matchedVariant) this.updateVariant(matchedVariant);
    this.disableUnavailableOptions();
  }

  updateVariant({ id, available, price, compare_at_price }) {
    this.productForm.setAttribute("variant-id", id);
    this.productForm.toggleAttribute("not-available", !available);

    const [priceElement, compareAtPriceElement] = this.querySelectorAll("[data-product-item]");
    priceElement.textContent = formatCurrency(price);
    compareAtPriceElement.textContent = formatCurrency(compare_at_price);
    compareAtPriceElement.hidden = !compare_at_price;
  }

  disableUnavailableOptions() {
    const lastVariant = this.variants.at(-1);
    if (!lastVariant) return;

    const inputs = lastVariant.querySelectorAll("input");

    inputs.forEach((input) => {
      const compareOptions = { ...this.selectedOptions, [input.name]: input.value };
      const isUnavailable = productVariants.some(
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
}

customElements.define("yc-product", Product);
