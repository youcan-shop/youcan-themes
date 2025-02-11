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
    const handleQuantityChange = debounce((event) => {
      const quantityControl = event.target;

      this.handleQuantityChangeForQuantityElement(quantityControl);
    }, ON_CHANGE_DEBOUNCE_TIMER);

    this.addEventListener("change", handleQuantityChange.bind(this));

    subscribe(PUB_SUB_EVENTS.cartUpdate, (payload) => {
      const { count, sub_total, items } = payload.cartData;

      if (payload.source === "product-form") this.cart.open();

      this.updateCartBubble(count, sub_total);
      this.updateCartList(items);
    });
  }

  async handleQuantityChangeForQuantityElement(element) {
    const { item: cartItemId, productVariant: productVariantId, quantity } = element.dataset;

    if (!(cartItemId && productVariantId && quantity)) {
      return;
    }

    this.setItemIsLoading(element, true);

    try {
      const newCart = await youcanjs.cart.updateItem({
        cartItemId,
        productVariantId,
        quantity,
      });

      publish(PUB_SUB_EVENTS.cartUpdate, {
        source: "quantity-control",
        productVariantId: this.productVariantValue,
        cartData: newCart,
      });
    } catch (error) {
      console.error(error);

      publish(PUB_SUB_EVENTS.cartError, {
        source: "quantity-control",
        productVariantId: this.productVariantValue,
        error: error,
      });

      toast.show(error.message, "error");
    } finally {
      this.setItemIsLoading(element, false);
    }
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

    if (items.length) {
      items.map((item) => {
        const cartItem = this.createCartItem(template, item);
        fragment.append(cartItem);
      });
    }

    this.setIsDrawerEmpty(!items.length);
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
    this.updateItemDeleteButtonAttributes(elements.deleteButton, item.id, item.productVariant.id);

    this.updateItemAttributes(
      elements.quantity,
      item.id,
      item.productVariant.id,
      item.quantity,
      item.productVariant.product.track_inventory && item.productVariant.inventory,
    );

    return cartItem;
  }

  getCartItemElements(cartItem) {
    const [image, title, variant, price, quantity, deleteButton] =
      cartItem.querySelectorAll("[data-cart-item]");
    return { image, title, variant, price, quantity, deleteButton };
  }

  updateItemImage(imageContainer, product) {
    const img = imageContainer.querySelector("img");
    const placeholder = imageContainer.querySelector("[data-cart-item-image-placeholder]");
    const shouldShowImage = product.images.length > 0;

    if (shouldShowImage) {
      img.src = product.thumbnail;
      img.alt = product.name;
      img.hidden = false;
      placeholder.hidden = true;
    } else {
      img.hidden = true;
      placeholder.hidden = false;
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
    quantityElement.querySelector("span").textContent = quantity;
  }

  updateItemPrice(priceElement, price) {
    priceElement.textContent = formatCurrency(price);
  }

  updateItemDeleteButtonAttributes(buttonElement, cartItemId, productVariantId) {
    buttonElement.setAttribute("data-item", cartItemId);
    buttonElement.setAttribute("data-product-variant", productVariantId);
  }

  setIsDrawerEmpty(isEmpty = false) {
    this.cart.querySelector("[data-cart]").toggleAttribute("data-is-empty", isEmpty);
  }

  updateItemAttributes(quantityElement, cartItemId, productVariantId, quantity, inventory = null) {
    quantityElement.setAttribute("data-item", cartItemId);
    quantityElement.setAttribute("data-product-variant", productVariantId);
    quantityElement.setAttribute("data-quantity", quantity);
    if (inventory) quantityElement.setAttribute("data-inventory", inventory);
  }

  replaceContent(fragment) {
    this.replaceChildren(fragment);
  }

  setItemIsLoading(element, isLoading) {
    element.toggleAttribute("data-loading", isLoading);
  }
}

customElements.define("yc-cart-drawer-items", CartDrawer);

class CartRemoveButton extends HTMLElement {
  constructor() {
    super();

    this.button = this.querySelector("button[data-delete]");
  }

  connectedCallback() {
    this._render();
  }

  _render() {
    this.button.addEventListener("click", this.onRemoveItem.bind(this));
  }

  async onRemoveItem() {
    this.isLoading = true;

    try {
      const productVariantId = this.productVariantValue;
      const cartItemId = this.cartItemValue;

      if (!productVariantId || !cartItemId) return;

      const response = await youcanjs.cart.removeItem({
        cartItemId,
        productVariantId,
      });

      publish(PUB_SUB_EVENTS.cartUpdate, {
        source: "delete-button",
        productVariantId,
        cartData: response,
      });
    } catch (error) {
      console.error(error);

      toast.show(error.message, "error");
    } finally {
      this.isLoading = false;
    }
  }

  get cartItemValue() {
    return this.button.dataset.item;
  }

  get productVariantValue() {
    return this.button.dataset.productVariant;
  }

  get isLoading() {
    return this.button.getAttribute("data-loading");
  }

  set isLoading(value) {
    this.button.toggleAttribute("data-loading", value);
  }
}

customElements.define("yc-cart-remove-button", CartRemoveButton);
