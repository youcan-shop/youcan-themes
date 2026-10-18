import { Component } from "@theme/component";
import { CartErrorEvent, CartUpdateEvent, CouponUpdateEvent, ThemeEvents } from "@theme/events";
import { showToast } from "@theme/toast";
import { debounce, fetchSections, mediaQueries, parseElement, readJson, theme, translate } from "@theme/utilities";

/**
 * Cart contents (drawer and cart page). Changes go through youcanjs, then every `<ui-cart>`
 * on the page is re-rendered with the Section Rendering API.
 */
class CartComponent extends Component {
  connectedCallback() {
    super.connectedCallback();
    const { signal } = this;
    const updateQuantity = debounce((/** @type {HTMLElement} */ selector) => this.#updateQuantity(selector), 300);

    this.addEventListener("change", (event) => {
      const target = /** @type {HTMLElement} */ (event.target);
      if (target.matches("ui-quantity[item]")) updateQuantity(target);
    }, { signal });

    this.addEventListener("click", (event) => {
      const target = /** @type {HTMLElement} */ (event.target);
      const remove = target.closest("[data-cart-remove]");
      if (remove) this.#removeItems(/** @type {HTMLButtonElement} */ (remove));
      if (target.closest("[data-coupon-remove]")) this.#removeCoupon(/** @type {HTMLButtonElement} */ (target.closest("[data-coupon-remove]")));
      if (target.closest("[data-checkout-button]")) window.Dotshop?.pixels?.publish("initiate-checkout", this.cart);
    }, { signal });

    this.addEventListener("submit", (event) => {
      if (/** @type {HTMLElement} */ (event.target).matches("[data-coupon-form]")) this.#applyCoupon(event);
    }, { signal });
  }

  get cart() {
    return readJson(this.querySelector("[data-cart-json]"));
  }

  /** @param {HTMLElement} element @param {boolean} loading */
  #setLoading(element, loading) {
    element.toggleAttribute("data-loading", loading);
    this.toggleAttribute("aria-busy", loading);
  }

  /** @param {HTMLElement} selector */
  async #updateQuantity(selector) {
    const cartItemId = selector.getAttribute("item");
    const productVariantId = selector.getAttribute("product-variant");
    if (!cartItemId || !productVariantId) return;

    this.#setLoading(selector, true);
    try {
      const cart = await youcanjs.cart.updateItem({ cartItemId, productVariantId, quantity: selector.getAttribute("quantity") });
      document.dispatchEvent(new CartUpdateEvent({ cart, source: "quantity", productVariantId }));
    } catch (error) {
      document.dispatchEvent(new CartErrorEvent({ error: /** @type {Error} */ (error), source: "quantity", productVariantId }));
      showToast(/** @type {Error} */ (error).message, "error");
      refreshCarts();
    } finally {
      this.#setLoading(selector, false);
    }
  }

  /** @param {HTMLButtonElement} button */
  async #removeItems(button) {
    const itemIds = (button.dataset.item ?? "").split(",").filter(Boolean);
    const variantIds = (button.dataset.variant ?? "").split(",").filter(Boolean);
    if (!itemIds.length) return;

    this.#setLoading(button, true);
    try {
      let cart;
      for (const [index, cartItemId] of itemIds.entries()) {
        cart = await youcanjs.cart.removeItem({ cartItemId, productVariantId: variantIds[index] });
      }
      document.dispatchEvent(new CartUpdateEvent({ cart, source: "remove" }));
    } catch (error) {
      showToast(/** @type {Error} */ (error).message, "error");
    } finally {
      this.#setLoading(button, false);
    }
  }

  /** @param {SubmitEvent} event */
  async #applyCoupon(event) {
    event.preventDefault();
    const form = /** @type {HTMLFormElement} */ (event.target);
    const code = new FormData(form).get("coupon_code");
    const button = /** @type {HTMLButtonElement} */ (form.querySelector("button"));
    if (!code) return;

    this.#setLoading(button, true);
    try {
      document.dispatchEvent(new CouponUpdateEvent({ cart: await youcanjs.checkout.applyCoupon(code) }));
    } catch (error) {
      showToast(/** @type {Error} */ (error).message, "error");
    } finally {
      this.#setLoading(button, false);
    }
  }

  /** @param {HTMLButtonElement} button */
  async #removeCoupon(button) {
    this.#setLoading(button, true);
    try {
      document.dispatchEvent(new CouponUpdateEvent({ cart: await youcanjs.checkout.removeCoupons() }));
    } catch (error) {
      showToast(/** @type {Error} */ (error).message, "error");
    } finally {
      this.#setLoading(button, false);
    }
  }
}

/** Cart count badge. */
class CartBubbleComponent extends Component {
  connectedCallback() {
    super.connectedCallback();
    document.addEventListener(ThemeEvents.cartUpdate, (event) => this.update(/** @type {CartUpdateEvent} */ (event).detail.cart?.count ?? 0), {
      signal: this.signal,
    });
  }

  /** @param {number} count */
  update(count) {
    const previous = parseInt(this.textContent ?? "", 10) || 0;
    this.textContent = String(count);
    if (this.classList.contains("cart-bubble")) this.hidden = count === 0;

    if (count > previous) {
      this.removeAttribute("data-pulse");
      requestAnimationFrame(() => this.setAttribute("data-pulse", ""));
    }
  }
}

if (!customElements.get("ui-cart")) customElements.define("ui-cart", CartComponent);
if (!customElements.get("ui-cart-bubble")) customElements.define("ui-cart-bubble", CartBubbleComponent);

/** Re-renders every `<ui-cart>` on the page; the cart page reloads if section rendering fails. */
export async function refreshCarts() {
  const carts = /** @type {HTMLElement[]} */ ([...document.querySelectorAll("ui-cart[data-cart-section]")]);
  const ids = [...new Set(carts.map((cart) => cart.dataset.cartSection ?? ""))];
  if (!ids.length) return;

  try {
    const sections = await fetchSections(ids);

    carts.forEach((cart) => {
      const html = sections[cart.dataset.cartSection ?? ""];
      const fresh = html && parseElement(html, `ui-cart[data-cart-section="${cart.dataset.cartSection}"]`);
      if (fresh) cart.replaceChildren(...fresh.childNodes);
    });
  } catch (error) {
    console.error(error);
    if (document.querySelector(".cart--page")) window.location.reload();
  }
}

/** @param {HTMLImageElement | null | undefined} image */
function flyToCart(image) {
  const target = document.querySelector(".site-header__cart");
  if (!image || !target || mediaQueries.reducedMotion.matches) return;

  const from = image.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (!from.width || !to.width) return;

  const clone = /** @type {HTMLImageElement} */ (image.cloneNode());
  clone.removeAttribute("srcset");
  clone.src = image.currentSrc || image.src;
  Object.assign(clone.style, {
    position: "fixed",
    zIndex: "1000",
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    objectFit: "cover",
    borderRadius: "16px",
    pointerEvents: "none",
  });
  document.body.append(clone);

  const x = to.left + to.width / 2 - (from.left + from.width / 2);
  const y = to.top + to.height / 2 - (from.top + from.height / 2);

  clone
    .animate([{ transform: "none", opacity: 1 }, { transform: `translate(${x}px, ${y}px) scale(0.08)`, opacity: 0.4 }], {
      duration: 650,
      easing: "cubic-bezier(0.5, 0, 0.75, 0)",
    })
    .finished.finally(() => clone.remove());
}

document.addEventListener(ThemeEvents.cartUpdate, async (event) => {
  const { cart, source, skipCart, skipToCheckout, image } = /** @type {CartUpdateEvent} */ (event).detail;
  const fromProduct = source === "product-form" || source === "product-card";

  if (fromProduct && skipToCheckout && cart) {
    window.location.href = cart.one_page_checkout ? cart.all_in_one_checkout_url : cart.checkout_info_url;
    return;
  }

  if (fromProduct && (skipCart || theme.cartType === "page")) {
    window.location.href = "/cart";
    return;
  }

  await refreshCarts();
  if (!fromProduct) return;

  /** @type {HTMLDialogElement | null} */ (document.querySelector("dialog#quick-add[open]"))?.close();

  if (theme.autoOpenCart === false) {
    if (theme.cartAnimation) flyToCart(image);
    showToast(translate("addedToCart"), "success");
  } else {
    document.getElementById("cart-drawer")?.showPopover?.();
  }
});

document.addEventListener(ThemeEvents.couponUpdate, () => refreshCarts());
