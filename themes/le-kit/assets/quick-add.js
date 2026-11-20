import { Component } from "@theme/component";
import { parseElement } from "@theme/utilities";

/**
 * Opens a product in the quick view sheet (`#quick-add`). Loads the product page's `main`
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
    const sheet = document.getElementById("quick-add");
    const content = /** @type {HTMLElement | null} */ (sheet?.querySelector("[data-quick-add-content]") ?? null);
    const title = sheet?.querySelector("[data-quick-add-title]");

    if (!sheet || !content) {
      window.location.href = url;
      return;
    }

    const skeleton = /** @type {HTMLTemplateElement | null} */ (sheet.querySelector("template[data-quick-add-skeleton]"));
    content.replaceChildren(skeleton?.content.cloneNode(true) ?? "");
    content.setAttribute("aria-busy", "true");
    if (title) title.textContent = title.getAttribute("data-default") ?? title.textContent;
    if (!sheet.matches(":popover-open")) sheet.showPopover();

    try {
      const product = await this.#fetchProduct(url);
      product.classList.add("product-main--quick-add");
      product.classList.remove("page-width", "product-main--full");
      product.querySelectorAll(".product-media--grid, .product-media--stack, .product-media--columns").forEach((media) => {
        media.classList.remove("product-media--grid", "product-media--stack", "product-media--columns");
        media.classList.add("product-media--carousel");
      });

      const link = Object.assign(document.createElement("a"), {
        className: "button button--secondary button--full quick-add__link",
        href: url,
        textContent: content.dataset.viewLabel ?? "",
      });
      this.#buildFooter(product, link);

      if (title) title.textContent = product.querySelector(".product-title")?.textContent?.trim() || title.textContent;
      content.replaceChildren(product);
      content.removeAttribute("aria-busy");
    } catch (error) {
      console.error(error);
      window.location.href = url;
    }
  }

  /**
   * Moves the quantity, buttons and link into one sticky footer, kept inside the product and its order form.
   * @param {HTMLElement} product
   * @param {HTMLElement} link
   */
  #buildFooter(product, link) {
    const buyButtons = product.querySelector(".buy-buttons");
    if (!buyButtons) {
      product.append(link);
      return;
    }

    const footer = Object.assign(document.createElement("div"), { className: "quick-add__footer" });
    const expressActions = buyButtons.querySelector(".express-checkout--inline .express-checkout__actions");
    if (expressActions) {
      expressActions.before(footer);
      footer.append(expressActions);
    } else {
      buyButtons.append(footer);
      footer.append(...buyButtons.querySelectorAll(":scope > .buy-buttons__row, :scope > ui-shop-button"));
    }
    footer.append(link);
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
