import { Component } from "@theme/component";
import { CartErrorEvent, CartUpdateEvent } from "@theme/events";
import { showToast } from "@theme/toast";
import { translate } from "@theme/utilities";

/**
 * Add to cart, buy now (`skip-to-checkout`) or place an express checkout order (`checkout-type="express"`).
 *
 * Attributes set by `<ui-product>`: `variant-id` (comma separated with add-ons), `bundle-id`,
 * `attached-image`, `quantity`, `not-available`, `bulk`.
 */
export class ShopButtonComponent extends Component {
  static observedAttributes = ["not-available"];

  requiredRefs = ["button"];

  /** Products accepted from the special offer, used for the next purchase only. @type {string[]} */
  offerIds = [];

  connectedCallback() {
    super.connectedCallback();
    const { signal } = this;
    const form = this.form;

    if (this.isExpress && form) {
      form.addEventListener("submit", (event) => this.buy(event), { signal });
    } else {
      this.refs.button.addEventListener("click", (/** @type {Event} */ event) => this.buy(event), { signal });
    }

    const scope = form ?? this.closest("ui-product");
    scope?.addEventListener(
      "change",
      (event) => {
        const target = /** @type {HTMLElement} */ (event.target);
        if (target.matches("ui-quantity:not([item])") && !this.contains(target)) this.setAttribute("quantity", target.getAttribute("quantity") ?? "1");
      },
      { signal },
    );
  }

  attributeChangedCallback() {
    if (!this.refs.button) return;
    const unavailable = this.hasAttribute("not-available");
    this.refs.button.setAttribute("aria-disabled", String(unavailable));
    if (this.refs.label) this.refs.label.textContent = unavailable ? translate("soldOut") : this.refs.label.dataset.label;
  }

  /** @returns {HTMLFormElement | null} */
  get form() {
    return this.closest("[data-order-form]");
  }

  get isExpress() {
    return this.getAttribute("checkout-type") === "express";
  }

  get quantity() {
    return parseInt(this.getAttribute("quantity") ?? "", 10) || 1;
  }

  get source() {
    return this.getAttribute("source") ?? "product-form";
  }

  /** @param {Event} [event] */
  buy(event) {
    event?.preventDefault();
    if (this.hasAttribute("not-available") || this.refs.button.hasAttribute("data-loading")) return;

    /** @type {any} */
    const offer = document.querySelector("ui-special-offer");
    const skipOffer = this.hasAttribute("skip-offer");
    this.removeAttribute("skip-offer");

    if (offer?.hasItems && !skipOffer && this.source === "product-form" && !this.hasAttribute("bulk")) {
      offer.open(this);
      return;
    }

    const [mainId, ...addOnIds] = (this.getAttribute("variant-id") ?? "").split(",").filter(Boolean);
    addOnIds.push(...this.offerIds.filter((id) => id !== mainId && !addOnIds.includes(id)));
    this.offerIds = [];

    const bundleId = this.getAttribute("bundle-id");
    const attachedImage = this.getAttribute("attached-image");

    this.#setLoading(true);

    if (!this.isExpress) {
      this.#addToCart(mainId, bundleId, attachedImage, addOnIds);
    } else if (!addOnIds.length) {
      this.#submitOrder(mainId, bundleId, attachedImage);
    } else {
      Promise.all([
        this.#placeOrder(mainId, bundleId, attachedImage, this.quantity),
        ...addOnIds.map((id) => this.#placeOrder(id, null, attachedImage, 1)),
      ])
        .then((redirects) => redirects.find(Boolean)?.())
        .finally(() => this.#setLoading(false));
    }
  }

  /**
   * @param {string} productVariantId
   * @param {string | null} bundleId
   * @param {string | null} attachedImage
   */
  #submitOrder(productVariantId, bundleId, attachedImage) {
    const form = /** @type {HTMLFormElement} */ (this.form);
    const values = bundleId
      ? { quantity: "1", bundle_id: bundleId, is_bundle: "true", id: "" }
      : { quantity: String(this.quantity), id: productVariantId, ...(attachedImage && { attachedImage }) };

    for (const [name, value] of Object.entries(values)) {
      const input = form.querySelector(`input[type='hidden'][name='${name}']`) ?? form.appendChild(Object.assign(document.createElement("input"), { type: "hidden", name }));
      /** @type {HTMLInputElement} */ (input).value = value;
    }

    HTMLFormElement.prototype.submit.call(form);
  }

  /**
   * @param {string} productVariantId
   * @param {string | null} bundleId
   * @param {string | null} attachedImage
   * @param {string[]} addOnIds
   */
  async #addToCart(productVariantId, bundleId, attachedImage, addOnIds) {
    try {
      let cart = await youcanjs.cart.addItem(
        bundleId ? { bundleId, isBundle: true, quantity: 1 } : { quantity: this.quantity, productVariantId, attachedImage },
      );
      for (const id of addOnIds) cart = await youcanjs.cart.addItem({ quantity: 1, productVariantId: id });

      window.Dotshop?.pixels?.publish("add-to-cart", cart.items?.find((/** @type {any} */ item) => item.productVariant?.id === productVariantId));

      document.dispatchEvent(
        new CartUpdateEvent({
          cart,
          source: this.source,
          productVariantId,
          skipCart: this.hasAttribute("skip-cart"),
          skipToCheckout: this.hasAttribute("skip-to-checkout"),
          image: this.closest("ui-product, .product-card")?.querySelector("[data-carousel-item][data-active] img, .product-card__media img, .product-media img"),
        }),
      );

      /** @type {any} */ (this.closest("ui-product"))?.clearAddOns?.();
    } catch (error) {
      document.dispatchEvent(new CartErrorEvent({ error: /** @type {Error} */ (error), source: this.source, productVariantId }));
      showToast(/** @type {Error} */ (error).message, "error");
    } finally {
      this.#setLoading(false);
    }
  }

  /**
   * @param {string} productVariantId
   * @param {string | null} bundleId
   * @param {string | null} attachedImage
   * @param {number} quantity
   * @returns {Promise<(() => void) | null>} The redirect to follow
   */
  async #placeOrder(productVariantId, bundleId, attachedImage, quantity) {
    const form = /** @type {HTMLFormElement} */ (this.form);
    const fields = Object.fromEntries(new FormData(form));
    ["form_type", "hidden_check", "id", "quantity", "bundle_id", "is_bundle", "attachedImage"].forEach((name) => delete fields[name]);
    form.querySelectorAll("[error-message]").forEach((field) => field.removeAttribute("error-message"));

    try {
      const response = await youcanjs.checkout.placeExpressCheckoutOrder({
        quantity,
        fields: { ...fields, ...(attachedImage && { attachedImage }) },
        ...(bundleId ? { bundleId, isBundle: true } : { productVariantId }),
      });

      return await new Promise((resolve) => {
        const follow = (/** @type {any} */ _, /** @type {() => void} */ redirect) => resolve(redirect);

        response
          .onSuccess((/** @type {any} */ data, /** @type {() => void} */ redirect) => {
            /** @type {any} */ (this.closest("ui-product"))?.clearAddOns?.();
            follow(data, redirect);
          })
          .onValidationErr((/** @type {any} */ error) => {
            showToast(error.message, "error");
            for (const [field, message] of Object.entries(error.meta?.fields ?? {})) {
              const name = field.includes("extra_fields") ? `${field.replace(".", "[")}]` : field;
              form.querySelector(`[name="${name}"]`)?.closest(".field")?.setAttribute("error-message", String(message));
            }
            resolve(null);
          })
          .onSkipShippingStep(follow)
          .onSkipPaymentStep(follow);
      });
    } catch (error) {
      showToast(/** @type {Error} */ (error).message, "error");
      return null;
    }
  }

  /** @param {boolean} loading */
  #setLoading(loading) {
    this.refs.button.toggleAttribute("data-loading", loading);
  }
}

if (!customElements.get("ui-shop-button")) customElements.define("ui-shop-button", ShopButtonComponent);
