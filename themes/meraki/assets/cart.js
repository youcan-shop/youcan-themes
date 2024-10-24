/**
 * Set the currency symbol in the dom for each element
 */
function setCurrencySymbol() {
  const elements = document.querySelectorAll('.product-currency');

  elements.forEach((element) => {
    element.innerText = currencyCode;
  })
}

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

    await fetchCoupons();

    notify(`${CART_PAGE_CONTENT.coupon_applied}`, 'success');
  } catch (e) {
    notify(e.message, 'error');
  } finally {
    stopLoad('#loading__coupon');
  }
}

async function fetchCoupons() {
  try {
    const coupons = await youcanjs.cart.fetch();

    const discount = document.querySelector('.discount-price');
    const discountText = document.querySelector('.discount-text');
    const couponApplied = document.querySelector('.coupon-applied');
    const totalPrice = document.querySelector('.item-total-price');

    if (totalPrice) {
      totalPrice.innerText = coupons.total ? `${coupons.total} ${currencyCode}` : '';
    }

    if (coupons.coupon && coupons.discountedPrice) {
      couponApplied.innerHTML = `<span>${CART_PAGE_CONTENT.coupon}: '${coupons.coupon.code}'  [${coupons.coupon.value}%] </span>
                                 <ion-icon class="close-search" id="remove-coupon" name="close-outline"></ion-icon>`;
      discount.innerText = coupons.discountedPrice + ' ' + currencyCode;

      const removeCouponElement = document.getElementById("remove-coupon");
      if (removeCouponElement) {
        removeCouponElement.addEventListener('click', removeCoupons);
      }

      discountText.classList.remove('hidden');
    } else {
      if (couponApplied) {
        couponApplied.innerHTML = '';
      }

      if (discount) {
        discount.innerText = '';
      }

      if (discountText) {
        discountText.classList.add('hidden');
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

    await fetchCoupons();

    notify(`${CART_PAGE_CONTENT.coupon_removed}`, 'success');
  } catch (e) {
    notify(e.message, 'error');
  } finally {
    stopLoad('#loading__coupon');
  }
}

function updateCart(item, quantity, totalPriceSelector, cartItemId, productVariantId, inventory) {
  const inputHolder = document.getElementById(item);
  const input = inputHolder.querySelector(`input[id="${productVariantId}"]`);
  input.value = quantity;
  const decrease = input.previousElementSibling;
  const increase = input.nextElementSibling;
  const productPrice = inputHolder.querySelector('.product-price');
  const price = productPrice.innerText;
  const totalPrice = inputHolder.querySelector(totalPriceSelector);

  decrease
    .querySelector('button')
    .setAttribute('onclick', `decreaseQuantity('${cartItemId}', '${productVariantId}', '${Number(quantity) - 1}', ${inventory})`);
  increase
    .querySelector('button')
    .setAttribute('onclick', `increaseQuantity('${cartItemId}', '${productVariantId}', '${quantity}', ${inventory})`);

  if (isNaN(quantity)) {
    totalPrice.innerText = 0;
  } else if (price) {
    totalPrice.innerText = isFloat(Number(price) * quantity);
  }
}

function updateTotalPrice() {
  let calculateTotalPrice = 0;
  const itemPrices = document.querySelectorAll('.item-price');

  itemPrices.forEach(itemPrice => {
    const price = itemPrice.innerText;
    calculateTotalPrice += Number(price);
  });

  const totalPriceElement = document.querySelector('.item-total-price');
  const totalPrice = isFloat(calculateTotalPrice);
  const discountPrice = document.querySelector('.coupon-applied');

  if (totalPriceElement && !discountPrice) {
    totalPriceElement.innerText = `${totalPrice} ${currencyCode}`;
  }

  if (discountPrice) {
    fetchCoupons();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setCurrencySymbol();
  updateTotalPrice();
  fetchCoupons();
});

function updateDOM(cartItemId, productVariantId, quantity, inventory) {
  updateCart(cartItemId, quantity, '.total-price', cartItemId, productVariantId, inventory);
  updateTotalPrice();
}

function updatePrice(cartItemUniqueId, productVariantId, quantity, inventory) {
  updateCart(`cart-item-${cartItemUniqueId}`, quantity, '.item-price', cartItemUniqueId, productVariantId, inventory);
}

async function updateQuantity(cartItemId, productVariantId, quantity, inventory) {
  load(`#loading__${cartItemId}`);
  try {
    await youcanjs.cart.updateItem({ cartItemId, productVariantId, quantity });
  } catch (e) {
    notify(e.message, 'error');
  } finally {
    stopLoad(`#loading__${cartItemId}`);
  }

  updateDOM(cartItemId, productVariantId, quantity, inventory);
  updatePrice(cartItemId,productVariantId,quantity, inventory);
  updateTotalPrice();
}

async function updateOnchange(cartItemId, productVariantId, inventory) {
  const inputHolder = document.getElementById(cartItemId);
  const input = inputHolder.querySelector(`input[id="${productVariantId}"]`);
  const quantity = input.value;

  await updateQuantity(cartItemId, productVariantId, quantity, inventory);
}

async function decreaseQuantity(cartItemId, productVariantId, quantity, inventory) {
  if (Number(quantity) < 1) {
    return;
  }
  await updateQuantity(cartItemId, productVariantId, quantity, inventory);
}

async function increaseQuantity(cartItemId, productVariantId, quantity, inventory) {
  if (Number.isFinite(inventory) && (Number(quantity) >= inventory)) {
    return notify(ADD_TO_CART_EXPECTED_ERRORS.max_quantity + inventory, 'warning');
  }

  await updateQuantity(cartItemId, productVariantId, (Number(quantity) + 1), inventory);
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
        cartItemsBadge.innerText = 0;
      }
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
