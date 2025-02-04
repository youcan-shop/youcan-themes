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

      if (payload.source === "product-form") this.cart.open();

      this.updateCartBubble(count, sub_total);
      this.updateCartList(items);
    });
  }

  updateCartSubTotal(subtotal) {
    this.subTotals.forEach((node) => {
      node.textContent = formatCurrency(subtotal);
    });
  }

  updateCartCount(count) {
    if (this.cartBubble) {
      this.cartBubble.textContent = count;
      this.cartBubble.toggleAttribute("hidden", count === 0);
    }
  }

  updateCartBubble(count, subtotal) {
    this.updateCartSubTotal(subtotal);
    this.updateCartCount(count);
  }

  updateCartList(items) {
    const fragment = new DocumentFragment();
    const template = this.cart.querySelector("[data-cart-item-template]");

    items.map((item) => {
      const cartItem = this.createCartItem(template, item);
      fragment.append(cartItem);
    });

    this.updateDrawerState();
    this.replaceContent(fragment);
  }

  createCartItem(template, item) {
    const cartItem = template.content.cloneNode(true);
    const elements = this.getCartItemElements(cartItem);

    this.updateItemImage(elements.image, item.productVariant.product);
    this.updateItemTitle(elements.title, item.productVariant.product);
    this.updateItemVariant(elements.variant, item.productVariant.variations);
    this.updateItemQuantity(elements.quantity, item.quantity);
    this.updateItemPrice(elements.price, item.price);
    this.updateItemAttributes(
      elements.quantity,
      item.id,
      item.productVariant.id,
      item.productVariant.inventory,
      item.quantity,
    );

    return cartItem;
  }

  getCartItemElements(cartItem) {
    const [image, title, variant, price, quantity] =
      cartItem.querySelectorAll("[data-cart-item]");
    return { image, title, variant, price, quantity };
  }

  updateItemImage(imageContainer, product) {
    if (product.thumbnail) {
      const img = imageContainer.querySelector("img");
      img.src = product.thumbnail;
      img.alt = product.name;
      img.removeAttribute("hidden");
    } else {
      imageContainer
        .querySelector("[data-cart-item-image-placeholder]")
        .removeAttribute("hidden");
    }
  }

  updateItemTitle(titleElement, product) {
    titleElement.textContent = product.name;
  }

  updateItemVariant(variantElement, variations) {
    const variationKeys = Object.keys(variations);
    if (variationKeys.length === 1 && variationKeys[0] === "default") return;

    const variantFragment = this.createVariantFragment(variations);
    variantElement.removeAttribute("hidden");
    variantElement.replaceChildren(variantFragment);
  }

  createVariantFragment(variations) {
    const fragment = new DocumentFragment();
    const values = Object.values(variations);

    values.forEach((variation, index) => {
      const valueSpan = document.createElement("span");
      valueSpan.textContent = variation;
      fragment.append(valueSpan);

      if (index < values.length - 1) {
        const separatorSpan = document.createElement("span");
        separatorSpan.textContent = " / ";
        fragment.append(separatorSpan);
      }
    });

    return fragment;
  }

  updateItemQuantity(quantityElement, quantity) {
    quantityElement.textContent = quantity;
  }

  updateItemPrice(priceElement, price) {
    priceElement.textContent = formatCurrency(price);
  }

  updateDrawerState() {
    this.cart.querySelector("[data-cart]").removeAttribute("data-is-empty");
  }

  updateItemAttributes(
    quantityElement,
    cartItemId,
    productVariantId,
    inventory,
    quantity,
  ) {
    quantityElement.setAttribute("data-item", cartItemId);
    quantityElement.setAttribute("data-product-variant", productVariantId);
    quantityElement.setAttribute("data-inventory", inventory);
    quantityElement.setAttribute("data-quantity", quantity);
  }

  replaceContent(fragment) {
    this.replaceChildren(fragment);
  }
}

customElements.define("yc-cart-drawer-items", CartDrawer);
