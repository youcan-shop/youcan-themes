import { Component } from "@theme/component";
import { parseElement } from "@theme/utilities";

/**
 * Opens a product in the quick add dialog (`#quick-add`). Loads the product page's `main`
 * section with the Section Rendering API, or the full page when that fails.
 */
class QuickAddComponent extends Component {
  requiredRefs = ["button"];

  connectedCallback() {
    super.connectedCallback();
    this.refs.button.addEventListener("click", () => this.open(), { signal: this.signal });
  }

  async open() {
    const url = this.dataset.url ?? "";
    const dialog = /** @type {HTMLDialogElement | null} */ (document.getElementById("quick-add"));
    const content = dialog?.querySelector("[data-quick-add-content]");

    if (!dialog || !content) {
      window.location.href = url;
      return;
    }

    content.replaceChildren();
    dialog.showModal();

    try {
      const product = await this.#fetchProduct(url);
      product.classList.add("product-main--quick-add");
      product.classList.remove("page-width");
      product.querySelectorAll(".product-media--grid, .product-media--stack").forEach((media) => {
        media.classList.remove("product-media--grid", "product-media--stack");
        media.classList.add("product-media--carousel");
      });
      content.replaceChildren(product);
    } catch (error) {
      console.error(error);
      window.location.href = url;
    }
  }

  /** @param {string} url */
  async #fetchProduct(url) {
    const attempts = [`${url}${url.includes("?") ? "&" : "?"}section_id=main`, url];

    for (const attempt of attempts) {
      try {
        const response = await fetch(attempt, { headers: { Accept: "text/html" } });
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

        const product = parseElement(await response.text(), "[data-product-main]");
        if (product) return product;
        throw new Error("[data-product-main] not found in the response");
      } catch (error) {
        console.warn(`Quick add could not load ${attempt}`, error);
      }
    }

    throw new Error("Quick add: the product could not be loaded");
  }
}

if (!customElements.get("ui-quick-add")) customElements.define("ui-quick-add", QuickAddComponent);
