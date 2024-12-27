// Business logic
const CartService = {
  async fetchCart() {
    try {
      return await youcanjs.cart.fetch();
    } catch (e) {
      throw new Error(e.message);
    }
  },
  async applyCoupon(coupon) {
    try {
      await youcanjs.checkout.applyCoupon(coupon);
      return this.fetchCart();
    } catch (e) {
      throw new Error(e.message);
    }
  },
  async removeCoupons() {
    try {
      await youcanjs.checkout.removeCoupons();
      return this.fetchCart();
    } catch (e) {
      throw new Error(e.message);
    }
  },
  async updateItemQuantity(cartItemId, productVariantId, quantity) {
    try {
      if(quantity < 1) {
        return;
      }

      const updatedCart = await youcanjs.cart.updateItem({ cartItemId, productVariantId, quantity });
      return updatedCart;
    } catch (e) {
      throw new Error(e.message);
    }
  },
  async removeItem(cartItemId, productVariantId) {
    try {
      await youcanjs.cart.removeItem({ cartItemId, productVariantId });
      return this.fetchCart();
    } catch (e) {
      throw new Error(e.message);
    }
  }
};

// UI logic
const CartUI = {
  updateTotalPrice(total, items) {
    const [itemTemplate, priceBox, totalPriceElement] = document.querySelectorAll('#summary-item-template, .price-box, .item-total-price');

    const fragment = document.createDocumentFragment();

    items.forEach((item) => {
      const summaryItem = itemTemplate.content.cloneNode(true).firstElementChild;
      summaryItem.id = `cart-item-${ item.id }`;

      const name = item.productVariant.product.name
      const subtotal = formatCurrency(item.price * item.quantity, currencyCode, customerLocale);

      const [itemName, itemPrice] = summaryItem.querySelectorAll('.item-name, .item-price');
      [itemName.textContent, itemPrice.textContent] = [name, subtotal];

      fragment.appendChild(summaryItem);
    });

    priceBox.innerHTML = '';
    priceBox.appendChild(fragment);

    if (totalPriceElement) {
      totalPriceElement.innerText = formatCurrency(total, currencyCode, customerLocale);
    }
  },
  updateCoupon(coupon, discount) {
    const discountWrapper = document.querySelector('.discount-wrapper');
    const couponsEnabled = document.querySelector('.coupon-applied');
    let couponType

    if (couponsEnabled) {
      if (coupon && discount) {
        const percentageDiscount = `${coupon.value}%`;
        const fixedDiscount = formatCurrency(coupon.value, currencyCode, customerLocale);
        couponType = coupon.type === 1 ? percentageDiscount : fixedDiscount;

        couponsEnabled.innerHTML = `
          <div class="flex gap-1">
            <span>${CART_PAGE_CONTENT.coupon}</span>
            <span>'${coupon.code}'</span>
            <span>[${couponType}]</span>
          </div>
          <ion-icon class="close-search" id="remove-coupon" name="close-outline"></ion-icon>
        `;
        document.querySelector('.discount-price').innerText = formatCurrency(discount, currencyCode, customerLocale);
        discountWrapper.classList.remove('hidden');
      } else {
        couponsEnabled.innerHTML = '';
        document.querySelector('.discount-price').innerText = '';
        discountWrapper.classList.add('hidden');
      }
    }
  },
  updateCartItem(cartItemId, productVariantId, quantity, itemSubtotal) {
    const itemRow = document.getElementById(cartItemId);
    const [input, totalPrice] = itemRow.querySelectorAll(`input[id="${productVariantId}"], .total-price`);
    const decrease = input.previousElementSibling;
    const increase = input.nextElementSibling;

    this.setQuantityButtonsHandlers(
      increase,
      decrease,
      cartItemId,
      productVariantId,
      quantity
    );

    input.value = quantity;
    totalPrice.innerHTML = formatCurrency(itemSubtotal, currencyCode, customerLocale);
  },
  setQuantityButtonsHandlers(increase, decrease, cartItemId, productVariantId, quantity) {
    decrease
    .querySelector('button')
    .setAttribute('onclick', `updateQuantity('${cartItemId}', '${productVariantId}', '${Number(quantity) - 1}')`);
    increase
      .querySelector('button')
      .setAttribute('onclick', `updateQuantity('${cartItemId}', '${productVariantId}', '${Number(quantity) + 1}')`);
  },
  updateCartBadge(count) {
    const [cartItemsBadge, cartItemCount] = document.querySelectorAll('#cart-items-badge, #cart-items-count');
    cartItemCount.innerText = count;

    if (cartItemsBadge) {
      cartItemsBadge.textContent = count;
    }
  },
  removeCartItemFromUI(cartItemId) {
    // Remove items from both the table and the subtotal box
    document.getElementById(cartItemId)?.remove();
    document.getElementById(`cart-item-${cartItemId}`)?.remove();
  },
  handleEmptyCart() {
    const cartItemsBadge = document.getElementById('cart-items-badge');
    const cartTable = document.querySelector('.cart-table');
    const emptyCart = document.querySelector('.empty-cart');

    cartItemsBadge && (cartItemsBadge.innerText = '0');
    cartTable?.remove();
    emptyCart?.classList.remove('hidden');
  }
};

// Events
async function updateQuantity(cartItemId, productVariantId, quantity) {
  let parsedQuantity = Number(quantity);

  load(`#loading__${cartItemId}`);
  try {
    const updatedCart = await CartService.updateItemQuantity(cartItemId, productVariantId, parsedQuantity);
    if(updatedCart) {
      const cartItem = updatedCart.items.find(item => item.id === cartItemId);
      const itemSubtotal = cartItem.price * cartItem.quantity;

      CartUI.updateCartItem(cartItemId, productVariantId, parsedQuantity, itemSubtotal);
      CartUI.updateTotalPrice(updatedCart.total, updatedCart.items);
    }
  } catch (e) {
    notify(e.message, 'error');
  } finally {
    stopLoad(`#loading__${cartItemId}`);
  }
}

async function removeItem(cartItemId, productVariantId) {
  load(`#loading__${cartItemId}`);
  try {
    const updatedCart = await CartService.removeItem(cartItemId, productVariantId);

    CartUI.removeCartItemFromUI(cartItemId);
    CartUI.updateCartBadge(updatedCart.count);
    CartUI.updateTotalPrice(updatedCart.total, updatedCart.items);

    if (updatedCart.items.length === 0) {
      CartUI.handleEmptyCart();
    }
  } catch (e) {
    notify(e.message, 'error');
  } finally {
    stopLoad(`#loading__${cartItemId}`);
  }
}

document.forms['promo']?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const coupon = e.target['coupon'].value;
  load('#loading__coupon');

  try {
    const updatedCart = await CartService.applyCoupon(coupon);
    CartUI.updateCoupon(updatedCart.coupon, updatedCart.discountedPrice);
    CartUI.updateTotalPrice(updatedCart.total, updatedCart.items);
  } catch (e) {
    notify(e.message, 'error');
  } finally {
    stopLoad('#loading__coupon');
  }
});

document.addEventListener('click', async (e) => {
  if (e.target.id === 'remove-coupon') {
    load('#loading__coupon');
    try {
      const updatedCart = await CartService.removeCoupons();
      CartUI.updateCoupon(null, null);
      CartUI.updateTotalPrice(updatedCart.total, updatedCart.items);
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      stopLoad('#loading__coupon');
    }
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const cart = await CartService.fetchCart();

    if (cart.items.length > 0) {
      CartUI.updateTotalPrice(cart.total, cart.items);
    }

    if (cart.coupon && cart.discountedPrice) {
      CartUI.updateCoupon(cart.coupon, cart.discountedPrice);
    }
  } catch (e) {
    notify(e.message, 'error');
  }
});

/**
 * Check if the element has no children
 * @param {HTMLElement} el
 * @returns {Boolean}
 */
function hasNoChild(element) {
  return element.childElementCount === 0;
}

/**
 * Teleport elements based by media screen
 */
function teleportElements() {
  const cartItems = document.querySelectorAll('.cart__item');
  const largeScreen = window.matchMedia("(min-width: 768px)").matches;
  const smallScreen = window.matchMedia("(max-width: 768px)").matches;

  cartItems.forEach((item) => {
    const oldParent = item.querySelector('.quantity-x-price-container');
    const quantityElement = oldParent.querySelector('.quantity-wrapper');
    const priceElement = oldParent.querySelector('.subtotal-price-table');
    const newQuantityParent = item.querySelector('.cell.quantity-input');
    const newPriceParent = item.querySelector('.cell.subtotal-price-table');

    if (largeScreen && hasNoChild(newQuantityParent) && hasNoChild(newPriceParent)) {
      newQuantityParent.appendChild(quantityElement);
      newPriceParent.appendChild(priceElement);
    } else if(smallScreen && hasNoChild(oldParent)) {
      oldParent.appendChild(newQuantityParent.querySelector('.quantity-wrapper'));
      oldParent.appendChild(newPriceParent.querySelector('.subtotal-price-table'));
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  teleportElements();
  window.addEventListener('resize', teleportElements);
});
