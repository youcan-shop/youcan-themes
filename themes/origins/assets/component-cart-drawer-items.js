class CartDrawer extends HTMLElement {
  constructor() {
    super();

    this.cart = document.querySelector("yc-drawer#cart");
    this.cartBubble = this.cart.querySelector("[data-cart-badge]");
    this.subTotals = this.cart.querySelectorAll("[data-total]");
  }

  connectedCallback() {
    this._render();
  }

  _render() {
    subscribe(PUB_SUB_EVENTS.cartUpdate, (payload) => {
      const { count, sub_total, items } = payload.cartData;

      this.updateCartBubble(count, sub_total);
      this.updateCartList(items);
    });
  }

  updateCartSubTotal(subtotal) {
    this.subTotals.forEach((node) => {
      // TODO: Format subtotal
      node.textContent = subtotal;
    });
  }

  updateCartCount(count) {
    if (this.cartBubble) {
      this.cartBubble.textContent = count;
      this.cartBubble.classList.toggle("hidden", count === 0);
    }
  }

  updateCartBubble(count, subtotal) {
    this.updateCartSubTotal(subtotal);
    this.updateCartCount(count);
  }

  updateCartList(items) {
    const fragment = new DocumentFragment();
    const tempalte = this.cart.querySelector("#cart-item-template");

    items.map((item) => {
      const cartItem = tempalte.content.cloneNode(true);
      const [image, title, variant, price, quantity] =
        cartItem.querySelectorAll(
          ".image, a, .variant, [data-price], [data-quantity]",
        );

      // IMAGE
      if (item.productVariant.product.thumbnail) {
        const img = image.querySelector("img");
        img.src = item.productVariant.product.thumbnail;
        img.alt = item.productVariant.product.name;
        img.classList.remove("hidden");
      } else {
        image.querySelector(".card-placeholder").classList.remove("hidden");
      }

      // TITLE
      title.textContent = item.productVariant.product.name;

      // VARIANT
      const variationValues = Object.values(item.productVariant.variations);
      const variantFragment = new DocumentFragment();

      variationValues.forEach((variation, index) => {
        const valueSpan = document.createElement("span");
        valueSpan.textContent = variation;
        variantFragment.append(valueSpan);

        if (index < variationValues.length - 1) {
          const separatorSpan = document.createElement("span");
          separatorSpan.textContent = " / ";
          variantFragment.append(separatorSpan);
        }
      });

      variant.classList.remove("hidden");
      variant.innerHTML = "";
      variant.append(variantFragment);

      // QTY
      quantity.textContent = item.quantity;

      // PRICE
      price.textContent = item.price;

      fragment.append(cartItem);
    });

    this.cart.querySelector(".cart-drawer").classList.remove("is-empty");

    this.innerHTML = "";
    this.append(fragment);
  }
}

customElements.define("yc-cart-drawer-items", CartDrawer);
