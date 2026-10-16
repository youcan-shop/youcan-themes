/*
 * Cart: bubble count, quantity selector and the <ui-cart> component.
 *
 * Every cart change goes through youcanjs, then publishes PUB_SUB_EVENTS.cartUpdate.
 * Each <ui-cart data-cart-section="{section id}"> on the page (drawer, cart page) is then
 * re-rendered server side with the Section Rendering API (?sections=a,b) and swapped in place.
 */

if (!customElements.get("ui-cart-bubble")) {
  class CartBubble extends HTMLElement {
    connectedCallback() {
      this.unsubscribe = subscribe(PUB_SUB_EVENTS.cartUpdate, ({ cartData }) => this.update(cartData?.count ?? 0));
    }

    disconnectedCallback() {
      this.unsubscribe?.();
    }

    update(count) {
      const previous = parseInt(this.textContent, 10) || 0;

      this.textContent = count;
      if (this.classList.contains("cart-bubble")) this.hidden = count === 0;

      if (count > previous) {
        this.removeAttribute("data-pulse");
        requestAnimationFrame(() => this.setAttribute("data-pulse", ""));
      }
    }
  }

  customElements.define("ui-cart-bubble", CartBubble);
}

if (!customElements.get("ui-quantity")) {
  class Quantity extends HTMLElement {
    connectedCallback() {
      this.value = this.querySelector("[data-quantity-value]");
      this.plus = this.querySelector('button[name="plus"]');
      this.minus = this.querySelector('button[name="minus"]');

      this.plus?.addEventListener("click", () => this.step(1));
      this.minus?.addEventListener("click", () => this.step(-1));
      this.updateButtons();
    }

    step(delta) {
      const next = this.quantity + delta;

      if (delta > 0 && this.inventory && next > this.inventory) {
        toast?.show(window.errorStrings.insufficient_inventory.replace("[inventory]", this.inventory), "error");
        return;
      }

      if (next < 1) return;

      this.quantity = next;
      this.dispatchEvent(new Event("change", { bubbles: true }));
    }

    updateButtons() {
      if (this.minus) this.minus.disabled = this.quantity <= 1 || this.hasAttribute("data-disabled");
      if (this.plus) this.plus.disabled = Boolean(this.inventory && this.quantity >= this.inventory) || this.hasAttribute("data-disabled");
    }

    get inventory() {
      return parseInt(this.getAttribute("inventory"), 10) || null;
    }

    get quantity() {
      return parseInt(this.getAttribute("quantity"), 10) || 1;
    }

    set quantity(value) {
      this.setAttribute("quantity", value);
      if (this.value) this.value.textContent = value;
      this.updateButtons();
    }
  }

  customElements.define("ui-quantity", Quantity);
}

/**
 * Re-renders every <ui-cart> on the page.
 * Falls back to a full reload on the cart page when section rendering fails.
 */
async function refreshCartSections() {
  const carts = [...document.querySelectorAll("ui-cart[data-cart-section]")];
  const ids = [...new Set(carts.map((cart) => cart.dataset.cartSection))].slice(0, 5);

  if (!ids.length) return;

  try {
    const response = await fetch(`${window.location.pathname}?sections=${ids.join(",")}`, {
      headers: { Accept: "application/json" },
    });
    const sections = await response.json();

    carts.forEach((cart) => {
      const html = sections[cart.dataset.cartSection];
      if (!html) return;

      const fresh = new DOMParser()
        .parseFromString(html, "text/html")
        .querySelector(`ui-cart[data-cart-section="${cart.dataset.cartSection}"]`);

      if (fresh) cart.replaceChildren(...fresh.childNodes);
    });
  } catch (error) {
    console.error(error);
    if (document.querySelector(".cart--page")) window.location.reload();
  }
}

/**
 * Flies a copy of the product image to the cart icon.
 */
function flyToCart(image) {
  const target = document.querySelector(".site-header__cart");
  if (!image || !target || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const from = image.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (!from.width || !to.width) return;

  const clone = image.cloneNode();
  clone.removeAttribute("srcset");
  clone.src = image.currentSrc || image.src;
  Object.assign(clone.style, {
    position: "fixed",
    zIndex: 1000,
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    objectFit: "cover",
    borderRadius: "16px",
    pointerEvents: "none",
  });
  document.body.append(clone);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);

  clone
    .animate(
      [
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.08)`, opacity: 0.4 },
      ],
      { duration: 650, easing: "cubic-bezier(0.5, 0, 0.75, 0)" },
    )
    .finished.finally(() => clone.remove());
}

subscribe(PUB_SUB_EVENTS.cartUpdate, async (payload) => {
  const { cartData, source, skipToCheckout, skipCart } = payload;

  if (source === "product-form" || source === "product-card") {
    if (skipToCheckout && cartData) {
      window.location.href = cartData.one_page_checkout ? cartData.all_in_one_checkout_url : cartData.checkout_info_url;
      return;
    }

    if (skipCart || window.theme?.cartType === "page") {
      window.location.href = "/cart";
      return;
    }
  }

  await refreshCartSections();

  if (source === "product-form" || source === "product-card") {
    document.querySelector("dialog#quick-add[open]")?.close();

    if (window.theme?.autoOpenCart === false) {
      if (window.theme?.cartAnimation) flyToCart(payload.image);
      toast?.show(window.theme?.strings?.addedToCart ?? "", "success");
    } else {
      document.getElementById("cart-drawer")?.showPopover?.();
    }
  }
});

subscribe(PUB_SUB_EVENTS.couponUpdate, () => refreshCartSections());

if (!customElements.get("ui-cart")) {
  class Cart extends HTMLElement {
    connectedCallback() {
      this.onQuantityChange = debounce((event) => this.updateQuantity(event.target), ON_CHANGE_DEBOUNCE_TIMER);

      this.addEventListener("change", (event) => {
        if (event.target.matches("ui-quantity[item]")) this.onQuantityChange(event);
      });

      this.addEventListener("click", (event) => {
        const remove = event.target.closest("[data-cart-remove]");
        if (remove) this.removeItems(remove);

        const removeCoupon = event.target.closest("[data-coupon-remove]");
        if (removeCoupon) this.removeCoupon(removeCoupon);

        if (event.target.closest("[data-checkout-button]")) {
          window.Dotshop?.pixels?.publish("initiate-checkout", this.cartData);
        }
      });

      this.addEventListener("submit", (event) => {
        if (event.target.matches("[data-coupon-form]")) this.applyCoupon(event);
      });
    }

    get cartData() {
      try {
        return JSON.parse(this.querySelector("[data-cart-json]")?.textContent ?? "null");
      } catch {
        return null;
      }
    }

    setLoading(element, isLoading) {
      element?.toggleAttribute("data-loading", isLoading);
      this.toggleAttribute("aria-busy", isLoading);
    }

    async updateQuantity(quantity) {
      const cartItemId = quantity.getAttribute("item");
      const productVariantId = quantity.getAttribute("product-variant");

      if (!cartItemId || !productVariantId) return;

      this.setLoading(quantity, true);

      try {
        const cartData = await youcanjs.cart.updateItem({
          cartItemId,
          productVariantId,
          quantity: quantity.getAttribute("quantity"),
        });

        publish(PUB_SUB_EVENTS.cartUpdate, { source: "quantity", productVariantId, cartData });
      } catch (error) {
        console.error(error);
        publish(PUB_SUB_EVENTS.cartError, { source: "quantity", productVariantId, error });
        toast?.show(error.message, "error");
        refreshCartSections();
      } finally {
        this.setLoading(quantity, false);
      }
    }

    async removeItems(button) {
      const cartItemIds = button.dataset.item.split(",").filter(Boolean);
      const productVariantIds = button.dataset.variant.split(",").filter(Boolean);

      if (!cartItemIds.length) return;

      this.setLoading(button, true);

      try {
        let cartData;
        for (let i = 0; i < cartItemIds.length; i++) {
          cartData = await youcanjs.cart.removeItem({
            cartItemId: cartItemIds[i],
            productVariantId: productVariantIds[i],
          });
        }

        publish(PUB_SUB_EVENTS.cartUpdate, { source: "delete-button", cartData });
      } catch (error) {
        console.error(error);
        toast?.show(error.message, "error");
      } finally {
        this.setLoading(button, false);
      }
    }

    async applyCoupon(event) {
      event.preventDefault();

      const form = event.target;
      const code = new FormData(form).get("coupon_code");
      const button = form.querySelector("button");

      if (!code) return;

      this.setLoading(button, true);

      try {
        const cartData = await youcanjs.checkout.applyCoupon(code);
        publish(PUB_SUB_EVENTS.couponUpdate, { source: "coupon-form", cartData });
      } catch (error) {
        console.error(error);
        toast?.show(error.message, "error");
      } finally {
        this.setLoading(button, false);
      }
    }

    async removeCoupon(button) {
      this.setLoading(button, true);

      try {
        const cartData = await youcanjs.checkout.removeCoupons();
        publish(PUB_SUB_EVENTS.couponUpdate, { source: "coupon-form", cartData });
      } catch (error) {
        console.error(error);
        toast?.show(error.message, "error");
      } finally {
        this.setLoading(button, false);
      }
    }
  }

  customElements.define("ui-cart", Cart);
}
