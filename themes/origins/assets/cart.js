class CartBubble extends HTMLElement {
  constructor() {
    super();

    this.badge = this.querySelector("[data-cart-badge]");
    this.subTotals = this.querySelector("[data-total]");
  }

  connectedCallback() {
    this._render();
  }

  _render() {
    subscribe(PUB_SUB_EVENTS.cartUpdate, (payload) => {
      const { count, sub_total } = payload.cartData;

      this.updateCartBubble(count, sub_total);
    });
  }

  updateCartBubble(count, subtotal) {
    this.updateSubtotal(subtotal);
    this.updateCount(count);
  }

  updateSubtotal(subtotal) {
    this.subTotals.textContent = formatCurrency(subtotal);
  }

  updateCount(count) {
    this.badge.textContent = count;
    this.badge.toggleAttribute("hidden", count === 0);
  }
}

customElements.define("yc-cart-bubble", CartBubble);

class CartDrawerItems extends HTMLElement {
  constructor() {
    super();

    this.cart = this.closest("yc-drawer#cart");
    this.subTotal = this.cart.querySelector("[data-drawer-total]");
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
      const { sub_total, items } = payload.cartData;

      if (payload.source === "product-form") this.cart.open();

      this.updateCartSubTotal(sub_total);
      this.updateCartList(items);
    });
  }

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
    this.subTotal.textContent = formatCurrency(subtotal);
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

    this.setIsEmpty(!items.length);
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
    const [image, title, variant, price, quantity, deleteButton] = cartItem.querySelectorAll("[data-cart-item]");
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
    quantityElement.querySelector("[data-current-quantity]").textContent = quantity;
  }

  updateItemPrice(priceElement, price) {
    priceElement.textContent = formatCurrency(price);
  }

  updateItemDeleteButtonAttributes(buttonElement, cartItemId, productVariantId) {
    buttonElement.setAttribute("item", cartItemId);
    buttonElement.setAttribute("product-variant", productVariantId);
  }

  setIsEmpty(isEmpty = false) {
    this.cart.querySelector("[data-cart]").toggleAttribute("data-is-empty", isEmpty);
  }

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

customElements.define("yc-cart-drawer-items", CartDrawerItems);

class CartItems extends HTMLElement {
  constructor() {
    super();

    this.cart = this.closest("[data-cart]");
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

      if (payload.source === "product-form") this.cart.open();

      this.updateCartList(items);
    });
  }

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

  updateCartList(items) {
    const fragment = new DocumentFragment();
    const template = this.cart.querySelector("[data-cart-item-template]");

    if (items.length) {
      items.map((item) => {
        const cartItem = this.createCartItem(template, item);
        const li = document.createElement("li");
        li.appendChild(cartItem);
        fragment.append(li);
      });
    }

    this.setIsEmpty(!items.length);
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
    this.updateItemSubprice(elements.subtotal, item.quantity, item.price);
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
    const [image, title, variant, price, quantity, subtotal, deleteButton] = cartItem.querySelectorAll("[data-cart-item]");
    return { image, title, variant, price, quantity, subtotal, deleteButton };
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
    quantityElement.querySelector("[data-current-quantity]").textContent = quantity;
  }

  updateItemPrice(priceElement, price) {
    priceElement.textContent = formatCurrency(price);
  }

  updateItemSubprice(subPriceElement, quantity, basePrice) {
    subPriceElement.textContent = formatCurrency(quantity * basePrice);
  }

  updateItemDeleteButtonAttributes(buttonElement, cartItemId, productVariantId) {
    buttonElement.setAttribute("item", cartItemId);
    buttonElement.setAttribute("product-variant", productVariantId);
  }

  setIsEmpty(isEmpty = false) {
    this.cart.toggleAttribute("data-is-empty", isEmpty);
  }

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

customElements.define("yc-cart-items", CartItems);

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

customElements.define("yc-cart-remove-button", CartRemoveButton);

class QuantityControl extends HTMLElement {
  constructor() {
    super();

    this.quantity = this.querySelector("[data-current-quantity]");
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

      const buttonName = event.target.name;
      const nextQuantityValue = this.calculateNextQuantity(buttonName);

      if (nextQuantityValue === null) return;

      this.quantityValue = nextQuantityValue;

      this.updateButtonsForQuantity(nextQuantityValue);
      this.dispatchEvent(this.changeEvent);
    } catch (error) {
      console.error(error);

      publish(PUB_SUB_EVENTS.cartError, {
        source: "quantity-control",
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

customElements.define("yc-quantity-control", QuantityControl);

class CartSummary extends HTMLElement {
  static COUPON_TYPES = {
    FIXED: 0,
    PERCENTAGE: 1,
  };

  constructor() {
    super();

    this.couponForm = this.querySelector("[data-coupon-form]");
    this.subtotal = this.querySelector("[data-cart-subtotal]");
    this.total = this.querySelector("[data-cart-total]");
    this.couponCode = this.querySelector("[data-coupon-code]");
    this.discount = this.querySelector("[data-discount]");
    this.removeCouponButton = this.querySelector("[data-remove-coupon]");

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
      const { sub_total, discountedPrice, coupon } = payload.cartData;

      const total = sub_total - discountedPrice;

      this.updateCoupon(coupon, discountedPrice);
      this.updateSummary(sub_total, total);
    });

    subscribe(PUB_SUB_EVENTS.couponUpdate, (payload) => {
      const { sub_total, discountedPrice, coupon } = payload.cartData;

      const total = sub_total - discountedPrice;

      this.updateCoupon(coupon, discountedPrice);
      this.updateSummary(sub_total, total);
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

customElements.define("yc-summary-box", CartSummary);
