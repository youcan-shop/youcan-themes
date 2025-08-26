class CartBubble extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this._render();
  }

  _render() {
    subscribe(PUB_SUB_EVENTS.cartUpdate, (payload) => {
      const { count } = payload.cartData;

      this.updateCount(count);
    });
  }

  updateCount(count) {
    this.textContent = count;
  }
}

customElements.define("ui-cart-bubble", CartBubble);

class BaseCartItem extends HTMLElement {
  constructor() {
    super();
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
      const { items } = payload.cartData;
      this.handleCartUpdate(payload);
      this.updateCartList(items);
    });
  }

  handleCartUpdate(payload) {}

  async handleQuantityChangeForQuantityElement(element) {
    const cartItemId = element.getAttribute("item");
    const productVariantId = element.getAttribute("product-variant");
    const quantity = element.getAttribute("quantity");

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
        source: "quantity",
        productVariantId: this.productVariantValue,
        cartData: newCart,
      });
    } catch (error) {
      console.error(error);

      publish(PUB_SUB_EVENTS.cartError, {
        source: "quantity",
        productVariantId: this.productVariantValue,
        error: error,
      });

      toast.show(error.message, "error");
    } finally {
      this.setItemIsLoading(element, false);
    }
  }

  updateCartList(items) {
    const fragment = new DocumentFragment();
    const template = this.getCartItemTemplate();

    if (items.length) {
      items.map((item) => {
        const cartItem = this.createCartItem(template, item);
        this.appendCartItem(fragment, cartItem);
      });
    }

    this.setIsEmpty(!items.length);
    this.replaceContent(fragment);
  }

  getCartItemTemplate() {}

  appendCartItem(fragment, cartItem) {}

  createCartItem(template, item) {
    const cartItem = template.content.cloneNode(true);
    const elements = this.getCartItemElements(cartItem);

    this.updateItemImage(elements.image, item.productVariant);
    this.updateItemTitle(elements.title, item.productVariant.product);
    this.updateItemVariant(elements.variant, item.productVariant.variations);
    this.updateItemQuantity(elements.quantity, item.quantity);
    this.updateItemPrice(elements.price, item.price);
    this.updateItemDeleteButtonAttributes(elements.deleteButton.parentElement, item.id, item.productVariant.id);

    this.additionalItemUpdates(elements, item);

    this.updateItemAttributes(
      elements.quantity.parentElement,
      item.id,
      item.productVariant.id,
      item.quantity,
      item.productVariant.product.track_inventory && item.productVariant.inventory,
    );

    return cartItem;
  }

  additionalItemUpdates(elements, item) {}

  getCartItemElements(cartItem) {}

  updateItemImage(imageContainer, productVariant) {
    const img = imageContainer.querySelector("img");
    const placeholder = imageContainer.querySelector("[ui-icon]");
    const shouldShowImage = productVariant.image.url || productVariant.product.images.length > 0;

    if (shouldShowImage) {
      img.src = productVariant.image.url ?? productVariant.product.thumbnail;
      img.alt = productVariant.product.name;
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
    quantityElement.textContent = quantity;
  }

  updateItemPrice(priceElement, price) {
    priceElement.textContent = formatCurrency(price);
  }

  updateItemDeleteButtonAttributes(buttonElement, cartItemId, productVariantId) {
    buttonElement.setAttribute("item", cartItemId);
    buttonElement.setAttribute("product-variant", productVariantId);
  }

  setIsEmpty(isEmpty = false) {}

  updateItemAttributes(quantityElement, cartItemId, productVariantId, quantity, inventory = null) {
    quantityElement.setAttribute("item", cartItemId);
    quantityElement.setAttribute("product-variant", productVariantId);
    quantityElement.setAttribute("quantity", quantity);
    if (inventory) quantityElement.setAttribute("inventory", inventory);
  }

  replaceContent(fragment) {
    this.replaceChildren(fragment);
  }

  setItemIsLoading(element, isLoading) {
    element.toggleAttribute("data-loading", isLoading);
  }
}

class CartDrawerItems extends BaseCartItem {
  constructor() {
    super();

    this.cart = this.closest("ui-drawer");
    this.subTotal = this.cart.querySelector("[ui-cart-item='subtotal']");
  }

  handleCartUpdate(payload) {
    const { sub_total } = payload.cartData;

    if (payload.source === "product-form") {
      payload.skipCart ? (window.location.href = "/cart") : this.cart.toggle();
    }

    if (payload.source === "quick-view") {
      const quickViewModal = document.querySelector("yc-product yc-modal:has(yc-modal-content[data-visible])");

      quickViewModal.close();
      payload.skipCart ? (window.location.href = "/cart") : this.cart.toggle();
    }

    this.updateCartSubTotal(sub_total);
  }

  updateCartSubTotal(subtotal) {
    this.subTotal.textContent = formatCurrency(subtotal);
  }

  getCartItemTemplate() {
    return this.cart.querySelector("template[ui-cart-drawer-item]");
  }

  appendCartItem(fragment, cartItem) {
    fragment.append(cartItem);
  }

  getCartItemElements(cartItem) {
    const [image, title, variant, price, quantity, deleteButton] = cartItem.querySelectorAll("[ui-cart-item]");
    return { image, title, variant, price, quantity, deleteButton };
  }

  setIsEmpty(isEmpty = false) {
    this.cart.querySelector("[ui-cart-drawer-footer]").toggleAttribute("hidden", isEmpty);
    this.cart.querySelector("[ui-empty]").toggleAttribute("hidden", !isEmpty);
  }
}

customElements.define("ui-cart-drawer-items", CartDrawerItems);

class CartItems extends BaseCartItem {
  constructor() {
    super();
  }

  getCartItemTemplate() {
    return document.querySelector("template[ui-cart-item]");
  }

  appendCartItem(fragment, cartItem) {
    fragment.append(cartItem);
  }

  getCartItemElements(cartItem) {
    const [image, title, variant, deleteButton, quantity, price, subtotal] = cartItem.querySelectorAll("[ui-cart-item]");
    return { image, title, variant, price, quantity, subtotal, deleteButton };
  }

  additionalItemUpdates(elements, item) {
    if (elements.subtotal) {
      this.updateItemSubprice(elements.subtotal, item.quantity, item.price);
    }
  }

  updateItemSubprice(subPriceElement, quantity, basePrice) {
    subPriceElement.textContent = formatCurrency(quantity * basePrice);
  }

  setIsEmpty(isEmpty = false) {
    this.parentElement.querySelector("[ui-empty]").toggleAttribute("hidden", !isEmpty);
    this.parentElement.querySelector("ui-summary-box").toggleAttribute("hidden", isEmpty);
  }
}

customElements.define("ui-cart-items", CartItems);

class CartRemove extends HTMLElement {
  constructor() {
    super();

    this.button = this.querySelector("button");
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
    return this.getAttribute("item");
  }

  get productVariantValue() {
    return this.getAttribute("product-variant");
  }

  get isLoading() {
    return this.button.getAttribute("data-loading");
  }

  set isLoading(value) {
    this.button.toggleAttribute("data-loading", value);
  }
}

customElements.define("ui-cart-remove", CartRemove);

class Quantity extends HTMLElement {
  constructor() {
    super();

    this.quantity = this.querySelector("[ui-quantity-value]");
    this.plusButton = this.querySelector('button[name="plus"]');
    this.minusButton = this.querySelector('button[name="minus"]');
    this.changeEvent = new Event("change", { bubbles: true });
  }

  connectedCallback() {
    this._render();
  }

  _render() {
    this.plusButton.addEventListener("click", this.onButtonClick.bind(this));
    this.minusButton.addEventListener("click", this.onButtonClick.bind(this));
    this.updateButtonsForQuantity(this.quantityValue);
  }

  onButtonClick(event) {
    try {
      if (isNaN(this.quantityValue)) {
        this.quantityValue = 1;
        this.updateMinusButtonState();

        return;
      }

      const buttonName = event.currentTarget.name;
      const nextQuantityValue = this.calculateNextQuantity(buttonName);

      if (nextQuantityValue === null) return;

      this.quantityValue = nextQuantityValue;

      this.updateButtonsForQuantity(nextQuantityValue);
      this.dispatchEvent(this.changeEvent);
    } catch (error) {
      console.error(error);

      publish(PUB_SUB_EVENTS.cartError, {
        source: "quantity",
        error: error,
      });

      toast.show(error.message, "error");
    }
  }

  updateMinusButtonState(quantity) {
    this.minusButton.toggleAttribute("disabled", quantity <= 1);
  }

  updatePlusButtonState(quantity) {
    this.plusButton.toggleAttribute("disabled", quantity === this.inventoryValue);
  }

  calculateNextQuantity(buttonName) {
    if (buttonName === "plus") {
      if (this.inventoryValue < this.quantityValue) {
        const message = window.errorStrings.insufficient_inventory;
        toast.show(message.replace("[inventory]", this.inventoryValue), "error");

        return null;
      }

      return this.quantityValue + 1;
    }

    return this.quantityValue - 1;
  }

  updateButtonsForQuantity(quantity) {
    this.updateMinusButtonState(quantity);
    this.updatePlusButtonState(quantity);
  }

  get inventoryValue() {
    return parseInt(this.getAttribute("inventory"), 10);
  }

  get quantityValue() {
    return parseInt(this.getAttribute("quantity"), 10);
  }

  set quantityValue(value) {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new Error("Invalid quantity value");
    }

    this.setAttribute("quantity", value);
    this.quantity.textContent = String(value);
  }
}

customElements.define("ui-quantity", Quantity);

class CartSummary extends HTMLElement {
  static COUPON_TYPES = {
    FIXED: 0,
    PERCENTAGE: 1,
  };

  constructor() {
    super();

    this.couponForm = this.querySelector('[ui-summary-box="coupon-form"]');
    this.subtotal = this.querySelector('[ui-summary-box="subtotal"]');
    this.total = this.querySelector('[ui-summary-box="total"]');
    this.couponCode = this.querySelector('[ui-summary-box="coupon-code"]');
    this.discount = this.querySelector('[ui-summary-box="discount"]');
    this.removeCouponButton = this.querySelector('[ui-summary-box="remove-coupon"]');

    const [couponInput, couponButton] = this.couponForm.querySelectorAll("[data-coupon]");
    this.couponInput = couponInput;
    this.couponButton = couponButton;
  }

  connectedCallback() {
    this._render();
  }

  _render() {
    this.couponForm.addEventListener("submit", this.handleApplyCoupon.bind(this));
    this.removeCouponButton.addEventListener("click", this.handleRemoveCoupon.bind(this));

    subscribe(PUB_SUB_EVENTS.cartUpdate, (payload) => {
      const { sub_total, discountedPrice, coupon, discounted_sub_total } = payload.cartData;

      this.updateCoupon(coupon, discountedPrice);
      this.updateSummary(sub_total, discounted_sub_total);
    });

    subscribe(PUB_SUB_EVENTS.couponUpdate, (payload) => {
      const { sub_total, discountedPrice, coupon, discounted_sub_total } = payload.cartData;

      this.updateCoupon(coupon, discountedPrice);
      this.updateSummary(sub_total, discounted_sub_total);
    });
  }

  async handleRemoveCoupon() {
    this.setCouponRemoveButtonIsLoading(true);

    try {
      const response = await youcanjs.checkout.removeCoupons();

      publish(PUB_SUB_EVENTS.couponUpdate, {
        source: "coupon-form",
        cartData: response,
      });
    } catch (error) {
      console.error(error);

      toast.show(error.message, "error");
    } finally {
      this.setCouponRemoveButtonIsLoading(false);
    }
  }

  async handleApplyCoupon(event) {
    event.preventDefault();

    const couponCode = new FormData(event.target).get("coupon_code");

    if (!couponCode) return;

    this.setCouponFormIsLoading(true);

    try {
      const response = await youcanjs.checkout.applyCoupon(couponCode);

      publish(PUB_SUB_EVENTS.couponUpdate, {
        source: "coupon-form",
        cartData: response,
      });
    } catch (error) {
      console.error(error);

      toast.show(error.message, "error");
    } finally {
      this.setCouponFormIsLoading(false);
      this.clearCouponForm();
    }
  }

  updateCoupon(coupon, discountedPrice) {
    if (!coupon) {
      this.setShowCouponInSummary(false);

      return;
    }

    this.discount.textContent = this.getFormattedDiscountValue(coupon, discountedPrice);
    this.couponCode.textContent = coupon.code;

    this.setShowCouponInSummary(true);
  }

  setShowCouponInSummary(shouldShow) {
    this.discount.toggleAttribute("hidden", !shouldShow);
    this.couponCode.toggleAttribute("hidden", !shouldShow);
  }

  updateSummary(subTotal, total) {
    this.subtotal.textContent = formatCurrency(subTotal);
    this.total.textContent = formatCurrency(total);
  }

  getFormattedDiscountValue(coupon, discountedPrice) {
    if (coupon.type == CartSummary.COUPON_TYPES.PERCENTAGE) {
      return `-${formatCurrency(discountedPrice)} (${coupon.value}%)`;
    }

    return `-${formatCurrency(coupon.value)}`;
  }

  clearCouponForm() {
    this.couponInput.value = "";
  }

  setCouponRemoveButtonIsLoading(isLoading) {
    this.removeCouponButton.toggleAttribute("data-loading", isLoading);
  }

  setCouponFormIsLoading(isLoading) {
    this.couponButton.toggleAttribute("data-loading", isLoading);
    this.couponInput.disabled = isLoading;
  }
}

customElements.define("ui-summary-box", CartSummary);
