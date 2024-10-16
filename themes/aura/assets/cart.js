const promo = document.forms['promo'];
if (promo) {
  promo.addEventListener('submit', addPromo);
}

async function addPromo(e) {
  e.preventDefault();
  const coupon = promo['coupon'].value;
  load('#loading__coupon');
  try {
    await youcanjs.checkout.applyCoupon(coupon);

    await fetchCart();

    notify(`${CART_PAGE_CONTENT.coupon_applied}`, 'success');
  } catch (e) {
    notify(e.message, 'error');
  } finally {
    stopLoad('#loading__coupon');
  }
}

async function fetchCart() {
/**
  * fetches cart
  * grabs a bunch of elements:
    * discount-price
    * discount-text
    * coupon-applied
    * item-total-price
  * Updates total price with formatCurrency()
  * Update coupon if enabled
  *
  * NOTES:
  * No separation of concern, we fetch and update UI
  * It doesn't update the
  *
*/
  try {
    const cart = await youcanjs.cart.fetch();

    const discount = document.querySelector('.discount-price');
    const discountText = document.querySelector('.discount-text');
    const couponsEnabled = document.querySelector('.coupon-applied');
    const totalPrice = document.querySelector('.item-total-price');
    let couponType

    if (totalPrice) {
      totalPrice.innerText = cart.total ? `${formatCurrency(cart.total, currencyCode, customerLocale)}` : '';
    }

    if (couponsEnabled) {
      if (cart.coupon && cart.discountedPrice) {
        couponsEnabled.innerHTML = `
        <span>${CART_PAGE_CONTENT.coupon}: '${cart.coupon.code}'  [${cart.coupon.value}%] </span>
        <ion-icon class="close-search" id="remove-coupon" name="close-outline"></ion-icon>
        `;

        discount.innerText = formatCurrency(cart.discountedPrice, currencyCode, customerLocale);

        const removeCouponElement = document.getElementById("remove-coupon");
        if (removeCouponElement) {
          removeCouponElement.addEventListener('click', removeCoupons);
        }

        discountText.classList.remove('hidden');
      } else {
        couponsEnabled.innerHTML = '';

        if (couponsEnabled) {
          couponsEnabled.innerHTML = '';
        }

        if (discount) {
          discount.innerText = '';
        }

        if (discountText) {
          discountText.classList.add('hidden');
        }
      }
    }
  } catch (e) {
    notify(e.message, 'error');
  }
}

async function removeCoupons(e) {
  e.preventDefault();
  load('#loading__coupon');
   try {
    await youcanjs.checkout.removeCoupons();

    await fetchCart();

    notify(`${CART_PAGE_CONTENT.coupon_removed}`, 'success');
  } catch (e) {
    notify(e.message, 'error');
  } finally {
    stopLoad('#loading__coupon');
  }
}

function updateCartItemTotal(itemElementId, quantity, totalPriceSelector, cartItemId, productVariantId, itemSubtotal) {
  const inputHolder = document.getElementById(itemElementId);
  const input = inputHolder.querySelector(`input[id="${productVariantId}"]`);
  input.value = quantity;
  const decrease = input.previousElementSibling;
  const increase = input.nextElementSibling;
  const totalPrice = inputHolder.querySelector(totalPriceSelector);

  decrease
    .querySelector('button')
    .setAttribute('onclick', `decreaseQuantity('${cartItemId}', '${productVariantId}', '${Number(quantity) - 1}')`);
  increase
    .querySelector('button')
    .setAttribute('onclick', `increaseQuantity('${cartItemId}', '${productVariantId}', '${Number(quantity) + 1}')`);

  totalPrice.innerText = !isNaN(quantity) ? formatCurrency(itemSubtotal, currencyCode, customerLocale) : 0;
}

function updateTotalPrice(cartTotal = '', items) {
  const itemPrices = document.querySelectorAll('.item-price');

  itemPrices.forEach((itemPrice, index) => {
    const cartItem = items[index];
    const itemSubtotal = cartItem.price * cartItem.quantity;

    itemPrice.innerText = formatCurrency(itemSubtotal, currencyCode, customerLocale);
  })

  const totalPriceElement = document.querySelector('.item-total-price');
  const discountPrice = document.querySelector('.coupon-applied');

  if (totalPriceElement && !discountPrice) {
    totalPriceElement.innerText = cartTotal;
  }

  if (discountPrice) {
    fetchCart();
  }
}

async function updateQuantity(cartItemId, productVariantId, quantity) {
  load(`#loading__${cartItemId}`);
  try {
    const updatedCart = await youcanjs.cart.updateItem({ cartItemId, productVariantId, quantity });
    const cartItem = updatedCart.items?.find(item => item.id === cartItemId);
    const itemSubtotal = cartItem.quantity * cartItem.price;
    const cartTotal = formatCurrency(updatedCart.total, currencyCode, customerLocale);

    updateCartItemTotal(cartItemId, quantity, '.total-price', cartItemId, productVariantId, itemSubtotal);
    updateTotalPrice(cartTotal, updatedCart.items);
  } catch (e) {
    notify(e.message, 'error');
  } finally {
    stopLoad(`#loading__${cartItemId}`);
  }
}

async function updateOnchange(cartItemId, productVariantId) {
  const inputHolder = document.getElementById(cartItemId);
  const input = inputHolder.querySelector(`input[id="${productVariantId}"]`);
  const quantity = input.value;

  await updateQuantity(cartItemId, productVariantId, quantity);
}

async function decreaseQuantity(cartItemId, productVariantId, quantity) {
  if (Number(quantity) < 1) {
    return;
  }
  await updateQuantity(cartItemId, productVariantId, quantity);
}

async function increaseQuantity(cartItemId, productVariantId, quantity) {
  await updateQuantity(cartItemId, productVariantId, quantity);
}

function updateCartItemCount(count) {
  const cartItemsCount = document.getElementById('cart-items-count');
  if (cartItemsCount) {
    cartItemsCount.textContent = count;
  }
}

async function removeItem(cartItemId, productVariantId) {
  load(`#loading__${cartItemId}`);
  try {
    await youcanjs.cart.removeItem({ cartItemId, productVariantId });
    document.getElementById(cartItemId).remove();
    document.getElementById(`cart-item-${cartItemId}`).remove();

    const updatedCart = await youcanjs.cart.fetch();
    updateCartItemCount(updatedCart.count);

    updateTotalPrice();
    await updateCartDrawer();

    const cartItemsBadge = document.getElementById('cart-items-badge');

    const cartItems = document.querySelectorAll('.cart__item');

    if (cartItemsBadge) {
      cartItemsBadge.innerText = parseInt(cartItemsBadge.innerText) - 1;
    }

    if (cartItems.length === 0) {
      if (cartItemsBadge) {
      }
      cartItemsBadge.innerText = 0;
      const cartTable = document.querySelector('.cart-table')
      const emptyCart = document.querySelector('.empty-cart');

      if (cartTable) {
        cartTable.remove();
      }

      if (emptyCart) {
        emptyCart.classList.remove('hidden');
      }
    }
  } catch (e) {
    notify(e.message, 'error');
  } finally {
    stopLoad(`#loading__${cartItemId}`);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  fetchCart();
});
