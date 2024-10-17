// Business logic
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
  updateCartBadge(count) {
    const cartItemsBadge = document.getElementById('cart-items-badge');

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
  if (quantity < 1) {
    return;
    // TODO: A better UX would be to prompt the seller to remove the item from cart
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
    CartUI.updateTotalPrice(cart.total, cart.items);
    CartUI.updateCoupon(cart.coupon, cart.discountedPrice);
  } catch (e) {
    notify(e.message, 'error');
  }
});
