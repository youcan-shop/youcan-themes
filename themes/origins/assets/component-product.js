class Product extends HTMLElement {
  constructor() {
    super();
    this.variants = [...this.querySelectorAll("yc-variant")];
    this.productForm = this.querySelector("yc-product-form");
  }

  connectedCallback() {
    this.variants.forEach((variant) =>
      variant.addEventListener("change", () => this.onVariantChanged()),
    );
  }

  onVariantChanged() {
    const selectedOptions = Object.fromEntries(
      this.variants.flatMap((variant) =>
        [...variant.querySelectorAll("input:checked")].map((input) => [input.name, input.value]),
      ),
    );

    const matchedVariant = productVariants.find(
      (variant) => JSON.stringify(variant.variations) === JSON.stringify(selectedOptions),
    );

    if (matchedVariant) {
      this.updateVariant(matchedVariant);
    }
  }

  updateVariant({ id, available, price, compare_at_price }) {
    this.productForm.setAttribute("variant-id", id);
    this.productForm.toggleAttribute("not-available", !available);

    const [priceElement, compareAtPriceElement] = this.querySelectorAll("[data-product-item]");
    priceElement.textContent = formatCurrency(price);
    compareAtPriceElement.textContent = formatCurrency(compare_at_price);
  }
}

customElements.define("yc-product", Product);
