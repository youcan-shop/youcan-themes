// CartService handles all business logic related to the cart
const CartService = {
  async fetchCart() {
    try {
      return await youcanjs.cart.fetch();
    } catch (e) {
      throw new Error('Error fetching cart: ' + e.message);
    }
  },
  
  async applyCoupon(coupon) {
    try {
      await youcanjs.checkout.applyCoupon(coupon);
      return this.fetchCart();
    } catch (e) {
      throw new Error('Error applying coupon: ' + e.message);
    }
  },
  
  async removeCoupons() {
    try {
      await youcanjs.checkout.removeCoupons();
      return this.fetchCart();
    } catch (e) {
      throw new Error('Error removing coupon: ' + e.message);
    }
  },
  
  async updateItemQuantity(cartItemId, productVariantId, quantity) {
    try {
      const updatedCart = await youcanjs.cart.updateItem({ cartItemId, productVariantId, quantity });
      return updatedCart;
    } catch (e) {
      throw new Error('Error updating item quantity: ' + e.message);
    }
  },

  async removeItem(cartItemId, productVariantId) {
    try {
      await youcanjs.cart.removeItem({ cartItemId, productVariantId });
      return this.fetchCart();
    } catch (e) {
      throw new Error('Error removing item: ' + e.message);
    }
  }
};

// CartUI handles all DOM manipulation and updates
const CartUI = {
  updateTotalPrice(total) {
    const totalPriceElement = document.querySelector('.item-total-price');
    if (totalPriceElement) {
      totalPriceElement.innerText = formatCurrency(total, currencyCode, customerLocale);
    }
  },

  updateCoupon(coupon, discount) {
    const discountText = document.querySelector('.discount-text');
    const couponsEnabled = document.querySelector('.coupon-applied');
    
    if (couponsEnabled) {
      if (coupon && discount) {
        couponsEnabled.innerHTML = `
          <span>Coupon '${coupon.code}' [${coupon.value}%]</span>
          <ion-icon class="close-search" id="remove-coupon" name="close-outline"></ion-icon>
        `;
        document.querySelector('.discount-price').innerText = formatCurrency(discount, currencyCode, customerLocale);
        discountText.classList.remove('hidden');
      } else {
        couponsEnabled.innerHTML = '';
        document.querySelector('.discount-price').innerText = '';
        discountText.classList.add('hidden');
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

  updateCartItemCount(count) {
    const cartItemsCount = document.getElementById('cart-items-count');
    if (cartItemsCount) {
      cartItemsCount.textContent = count;
    }
  },

  removeCartItemFromUI(cartItemId) {
    document.getElementById(cartItemId)?.remove();
    document.getElementById(`cart-item-${cartItemId}`)?.remove();
  },

  handleEmptyCart() {
    const cartItemsBadge = document.getElementById('cart-items-badge');
    const cartTable = document.querySelector('.cart-table');
    const emptyCart = document.querySelector('.empty-cart');

    if (cartItemsBadge) cartItemsBadge.innerText = '0';
    if (cartTable) cartTable.remove();
    if (emptyCart) emptyCart.classList.remove('hidden');
  }
};

// Event Listeners and Logic Delegation

// Apply coupon event
document.forms['promo']?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const coupon = e.target['coupon'].value;
  load('#loading__coupon');

  try {
    const updatedCart = await CartService.applyCoupon(coupon);
    CartUI.updateCoupon(updatedCart.coupon, updatedCart.discountedPrice, currencyCode, customerLocale);
    CartUI.updateTotalPrice(updatedCart.total, currencyCode, customerLocale);
  } catch (e) {
    notify(e.message, 'error');
  } finally {
    stopLoad('#loading__coupon');
  }
});

// Remove coupon event
document.addEventListener('click', async (e) => {
  if (e.target.id === 'remove-coupon') {
    load('#loading__coupon');
    try {
      const updatedCart = await CartService.removeCoupons();
      CartUI.updateCoupon(null, null, currencyCode, customerLocale);
      CartUI.updateTotalPrice(updatedCart.total, currencyCode, customerLocale);
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      stopLoad('#loading__coupon');
    }
  }
});

// Update quantity
async function updateQuantity(cartItemId, productVariantId, quantity) {

  if (quantity < 1) {
    return;
  }

  load(`#loading__${cartItemId}`);
  try {
    const updatedCart = await CartService.updateItemQuantity(cartItemId, productVariantId, quantity);
    const cartItem = updatedCart.items.find(item => item.id === cartItemId);
    const itemSubtotal = cartItem.price * cartItem.quantity;

    CartUI.updateCartItem(cartItemId, productVariantId, quantity, itemSubtotal);
    CartUI.updateTotalPrice(updatedCart.total, updatedCart.items);
  } catch (e) {
    notify(e.message, 'error');
  } finally {
    stopLoad(`#loading__${cartItemId}`);
  }
}

// Remove item from cart
async function removeItem(cartItemId, productVariantId) {
  load(`#loading__${cartItemId}`);
  try {
    const updatedCart = await CartService.removeItem(cartItemId, productVariantId);
    CartUI.removeCartItemFromUI(cartItemId);
    CartUI.updateCartItemCount(updatedCart.count);
    
    if (updatedCart.items.length === 0) {
      CartUI.handleEmptyCart();
    }
  } catch (e) {
    notify(e.message, 'error');
  } finally {
    stopLoad(`#loading__${cartItemId}`);
  }
}

// Fetch and update cart on page load
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const cart = await CartService.fetchCart();
    CartUI.updateTotalPrice(cart.total, currencyCode, customerLocale);
    CartUI.updateCoupon(cart.coupon, cart.discountedPrice, currencyCode, customerLocale);
  } catch (e) {
    notify(e.message, 'error');
  }
});
