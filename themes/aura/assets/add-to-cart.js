async function addToCart(snippetId) {
  const parentSection = document.querySelector(`#s-${snippetId}`);
  const variantId = parentSection.querySelector(`#variantId`)?.value || undefined;
  const quantity = parseInt(parentSection.querySelector(`#quantity`)?.value) || 1;
  const inventory = parseInt(parentSection.querySelector(`#_inventory`)?.value) || null;
  const uploadedImageLink = parentSection.querySelector(`#yc-upload-link`)?.value || undefined;

  if (!variantId) {
    return notify(ADD_TO_CART_EXPECTED_ERRORS.select_variant, 'error');
  }

  if (quantity < 1) {
    return notify(ADD_TO_CART_EXPECTED_ERRORS.quantity_smaller_than_zero, 'error');
  }

  if (inventory === 0) {
    return notify(ADD_TO_CART_EXPECTED_ERRORS.empty_inventory, 'error');
  }

  try {
    requestAnimationFrame(() => {
      load('#loading__cart');
    });

    const response = await youcanjs.cart.addItem({
      productVariantId: variantId,
      attachedImage: uploadedImageLink,
      quantity,
    });

    if (response.error) throw new Error(response.error);

    updateCartCount(response.count);
    await updateCartDrawer();

    stopLoad('#loading__cart');

    const selectedVariant = response.items.find((variant) => variant.productVariant.id === variantId);

    window.Dotshop.pixels.publish('add-to-cart', selectedVariant);

    const checkoutPageUrl = response.one_page_checkout === true ? response.all_in_one_checkout_url : response.checkout_info_url;

    if (IS_CART_SKIPED) {
      window.location.href = checkoutPageUrl;
      window.Dotshop.pixels.publish('initiate-checkout', selectedVariant);

      return;
    }

    notify(ADD_TO_CART_EXPECTED_ERRORS.product_added, 'success');
    toggleCartDrawer();
  } catch (err) {
    stopLoad('#loading__cart');
    notify(err.message, 'error');
  }
}

async function addBundleToCart(snippetId) {
  const parentSection = document.querySelector(`#s-${snippetId}`);
  const bundleId = parentSection.querySelector('[data-bundle] input[type="checkbox"]:checked')?.value;
  const quantity = parseInt(parentSection.querySelector(`#quantity`)?.value) || 1;

  if (!bundleId) {
    return notify(ADD_TO_CART_EXPECTED_ERRORS.select_bundle, 'error');
  }

  if (quantity < 1) {
    return notify(ADD_TO_CART_EXPECTED_ERRORS.quantity_smaller_than_zero, 'error');
  }

  try {
    requestAnimationFrame(() => {
      load('#loading__bundle-cart');
    });

    const response = await youcanjs.cart.addItem({ bundleId, isBundle: true, quantity });

    if (response.error) throw new Error(response.error);

    updateCartCount(response.count);
    await updateCartDrawer();

    stopLoad('#loading__bundle-cart');

    notify(ADD_TO_CART_EXPECTED_ERRORS.product_added, 'success');
    toggleCartDrawer();
  } catch (err) {
    stopLoad('#loading__bundle-cart');
    notify(err.message, 'error');
  }
}

async function attachRemoveItemListeners() {
  document.querySelectorAll('.remove-item-btn').forEach((btn) =>
    btn.addEventListener('click', async (event) => {
      const cartItemId = event.target.getAttribute('data-cart-item-id');
      const productVariantId = event.target.getAttribute('data-product-variant-id');

      if (cartItemId && productVariantId) {
        await removeCartItem(cartItemId, productVariantId);
        await updateCartDrawer();
        updateCartCount(-1, true);
      }
    }),
  );
}

function attachBundleRemoveListeners() {
  document.querySelectorAll('.remove-bundle-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const itemIds = (btn.getAttribute('data-bundle-item-ids') || '').split(',').map((s) => s.trim()).filter(Boolean);
      const variantIds = (btn.getAttribute('data-bundle-variant-ids') || '').split(',').map((s) => s.trim()).filter(Boolean);

      if (!itemIds.length) return;

      try {
        for (let i = 0; i < itemIds.length; i++) {
          await youcanjs.cart.removeItem({ cartItemId: itemIds[i], productVariantId: variantIds[i] });
        }

        const updatedCart = await youcanjs.cart.fetch();
        updateCartCount(updatedCart.count);
        await updateCartDrawer();
      } catch (error) {
        notify(error.message, 'error');
      }
    });
  });
}

async function removeCartItem(cartItemId, productVariantId) {
  const spinner = document.querySelector(`[data-spinner-id="${cartItemId}"]`);

  try {
    showSpinner(spinner);

    await youcanjs.cart.removeItem({
      cartItemId,
      productVariantId,
    });
  } catch (error) {
    notify(error.message, 'error');
  } finally {
    hideSpinner(spinner);
    await updateCartDrawer();
  }
}

async function updateCartItem(cartItemId, productVariantId, quantity) {
  const footerSpinner = document.querySelector('.footer-spinner');
  const cartQuantityBtns = document.querySelectorAll('.cart-quantity-btn');
  const input = document.querySelector(`#quantity-${cartItemId}`);

  showSpinner(footerSpinner);

  // Disable the increase and decrease buttons
  cartQuantityBtns.forEach((btn) => btn.setAttribute('disabled', true));
  try {
    await youcanjs.cart.updateItem({
      cartItemId,
      productVariantId,
      quantity,
    });
    await updateCartDrawer();

    input.value = quantity;
  } catch (error) {
    notify(error.message, 'error');
  } finally {
    hideSpinner(footerSpinner);
    cartQuantityBtns.forEach((btn) => btn.removeAttribute('disabled'));
  }
}

function increaseCartQuantity(cartItemId, productVariantId) {
  updateCartQuantity(cartItemId, productVariantId, 1);
}

function decreaseCartQuantity(cartItemId, productVariantId) {
  updateCartQuantity(cartItemId, productVariantId, -1);
}

function updateCartQuantity(cartItemId, productVariantId, delta) {
  const input = document.querySelector(`#quantity-${cartItemId}`);

  if (input) {
    const newQuantity = parseInt(input.value) + delta;

    if (newQuantity >= 1) {
      updateCartItem(cartItemId, productVariantId, newQuantity);
    }
  }
}

function bundleItemTemplate(item) {
  const variations = item.productVariant?.variations || {};
  const variationsArray = [];
  for (const key in variations) {
    if (variations.hasOwnProperty(key) && key !== 'default') {
      variationsArray.push(`${key}: ${variations[key]}`);
    }
  }
  const variationsString = variationsArray.join(', ');

  const subtotal = item.price * item.quantity;
  const isFree = subtotal === 0;
  const priceHtml = isFree
    ? `
        <div class="gift">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 13 13">
            <path d="M12 3.50087H9.8075C9.83187 3.48025 9.85687 3.46025 9.88062 3.43837C10.0704 3.26973 10.2234 3.06374 10.33 2.83328C10.4366 2.60282 10.4944 2.35285 10.5 2.099C10.5082 1.82129 10.4596 1.54484 10.3571 1.28661C10.2546 1.02839 10.1004 0.793832 9.90397 0.597351C9.70755 0.40087 9.47304 0.246608 9.21484 0.144035C8.95664 0.0414631 8.68021 -0.00725475 8.4025 0.000872589C8.14855 0.0063425 7.89845 0.0641756 7.66788 0.170752C7.4373 0.277328 7.23121 0.430353 7.0625 0.620248C6.82905 0.890807 6.63927 1.19615 6.5 1.52525C6.36073 1.19615 6.17095 0.890807 5.9375 0.620248C5.76879 0.430353 5.5627 0.277328 5.33212 0.170752C5.10155 0.0641756 4.85146 0.0063425 4.5975 0.000872589C4.31979 -0.00725475 4.04336 0.0414631 3.78516 0.144035C3.52696 0.246608 3.29245 0.40087 3.09603 0.597351C2.89961 0.793832 2.74542 1.02839 2.64292 1.28661C2.54043 1.54484 2.49179 1.82129 2.5 2.099C2.50556 2.35285 2.56343 2.60282 2.67 2.83328C2.77658 3.06374 2.92956 3.26973 3.11938 3.43837C3.14313 3.459 3.16813 3.479 3.1925 3.50087H1C0.734784 3.50087 0.48043 3.60623 0.292893 3.79377C0.105357 3.9813 0 4.23566 0 4.50087V6.50087C0 6.76609 0.105357 7.02044 0.292893 7.20798C0.48043 7.39552 0.734784 7.50087 1 7.50087V11.5009C1 11.7661 1.10536 12.0204 1.29289 12.208C1.48043 12.3955 1.73478 12.5009 2 12.5009H5.75C5.8163 12.5009 5.87989 12.4745 5.92678 12.4276C5.97366 12.3808 6 12.3172 6 12.2509V6.50087H1V4.50087H6V6.50087H7V4.50087H12V6.50087H7V12.2509C7 12.3172 7.02634 12.3808 7.07322 12.4276C7.12011 12.4745 7.1837 12.5009 7.25 12.5009H11C11.2652 12.5009 11.5196 12.3955 11.7071 12.208C11.8946 12.0204 12 11.7661 12 11.5009V7.50087C12.2652 7.50087 12.5196 7.39552 12.7071 7.20798C12.8946 7.02044 13 6.76609 13 6.50087V4.50087C13 4.23566 12.8946 3.9813 12.7071 3.79377C12.5196 3.60623 12.2652 3.50087 12 3.50087ZM3.78188 2.68837C3.69445 2.60921 3.62434 2.51282 3.57594 2.40526C3.52754 2.29771 3.5019 2.18131 3.50063 2.06337C3.49746 1.92519 3.52191 1.78776 3.57254 1.65914C3.62317 1.53053 3.69896 1.41331 3.79547 1.31436C3.89198 1.2154 4.00726 1.13671 4.13457 1.08288C4.26188 1.02905 4.39865 1.00117 4.53687 1.00087H4.5675C4.68544 1.00214 4.80184 1.02779 4.90939 1.07618C5.01695 1.12458 5.11333 1.1947 5.1925 1.28212C5.71688 1.87462 5.90188 2.85712 5.96688 3.46462C5.35687 3.40025 4.375 3.21525 3.78188 2.68837ZM9.21937 2.68837C8.62625 3.21337 7.64187 3.39837 7.03187 3.46337C7.10625 2.8065 7.3125 1.84462 7.8125 1.28275C7.89167 1.19532 7.98805 1.12521 8.09561 1.07681C8.20316 1.02841 8.31956 1.00277 8.4375 1.0015H8.46813C8.60636 1.00236 8.74302 1.03081 8.87012 1.08517C8.99721 1.13953 9.11218 1.21871 9.20828 1.31807C9.30439 1.41743 9.37969 1.53498 9.42978 1.66381C9.47987 1.79265 9.50375 1.93019 9.5 2.06837C9.49796 2.18551 9.4719 2.30098 9.42341 2.40763C9.37492 2.51428 9.30505 2.60983 9.21813 2.68837H9.21937Z" fill="#E7412F"/>
          </svg>
          <span class="free">${CART_DRAWER_TRANSLATION.free}</span>
        </div>
        <span class="compare-at">${formatCurrency(item.productVariant.price, CURRENCY_CODE, CUSTOMER_LOCALE)}</span>
      `
    : `
        <span class="original">${formatCurrency(subtotal, CURRENCY_CODE, CUSTOMER_LOCALE)}</span>
        ${item.productVariant?.compare_at_price ? `<span class="compare-at">${formatCurrency(item.productVariant.compare_at_price * item.quantity, CURRENCY_CODE, CUSTOMER_LOCALE)}</span>` : ''}
      `;

  const imageUrl = item.productVariant?.image?.url ?? item.productVariant?.product?.thumbnail ?? defaultImage;
  const name = item.productVariant?.product?.name ?? '';

  return `
    <div class="bundle-item">
      <img src="${imageUrl}" alt="${name}">
      <div class="bundle-item-info">
        <span class="name">${name}</span>
        ${variationsString ? `<div class="variants">${variationsString}</div>` : ''}
        <div class="price${isFree ? ' free-gift' : ''}">${priceHtml}</div>
      </div>
    </div>
  `;
}

function bundleGroupTemplate(bundle) {
  const itemIds = bundle.items.map((i) => i.id).join(',');
  const variantIds = bundle.items.map((i) => i.productVariant?.id ?? '').join(',');

  return `
    <div class="bundle-group">
      <div class="bundle-group-top">
        <span class="bundle-title">${bundle.title}</span>
        <button class="remove-bundle-btn" data-bundle-item-ids="${itemIds}" data-bundle-variant-ids="${variantIds}">
          ${CART_DRAWER_TRANSLATION.remove}
        </button>
      </div>
      <div class="bundle-items-list">
        ${bundle.items.map(bundleItemTemplate).join('')}
      </div>
    </div>
  `;
}

function cartTemplate(item) {
  // Loop through variations
  const variationsArray = [];
  for (const key in item.productVariant.variations) {
    if (item.productVariant.variations.hasOwnProperty(key)) {
      variationsArray.push(`${key}: ${item.productVariant.variations[key]}`);
    }
  }
  const variationsString = variationsArray.join('<br/>');
  const variationsCheck = variationsString === 'default: default' ? '' : variationsString;
  const variantInventory = item.productVariant.product.track_inventory ? item.productVariant.inventory : null;

  const imageUrl = item.productVariant.image.url ?? item.productVariant.product.thumbnail ?? defaultImage;

  return `
    <li class="cart-item">
      <div class="item-body">
      <div class="right-items">
        ${imageUrl && `<img src="${imageUrl}" alt="${item.productVariant.product.name}" />`}
        <div class="item-details">
          <p class="product-name">${item.productVariant.product.name}</p>
          <div class="variants">
            ${variationsCheck}
          </div>
          <div class="product-price">
          ${item.productVariant.compare_at_price ? `<span class="compare-price">${item.productVariant.compare_at_price}</span>` : ''}
            <div class="currency-wrapper">
              <span class="price">${item.productVariant.price}</span>
            </div>
          </div>
          </div>
        </div>
        <div class="left-items">
          <button class="remove-item-btn" aria-label="remove item">
          <ion-icon data-cart-item-id="${item.id}" data-product-variant-id="${item.productVariant.id}" name="close-outline"></ion-icon>
          </button>
          <div class="spinner" data-spinner-id="${item.id}" style="display: none;"></div>
          <div class="quantity-control">
            <button class="decrease-btn cart-quantity-btn" onclick="decreaseCartQuantity('${item.id}', '${item.productVariant.id}')">-</button>
            <input type="number" id="quantity-${item.id}" value="${item.quantity}" min="1" onchange="updateCartItem('${item.id}', '${item.productVariant.id}', this.value)" oninput="restrictInputValue(event.target, ${variantInventory})">
            <button class="increase-btn cart-quantity-btn" onclick="increaseCartQuantity('${item.id}', '${item.productVariant.id}')">+</button>
          </div>
        </div>
      </div>
    </li>
  `;
}

async function updateCartDrawer() {
  const cartDrawerContent = document.querySelector('.cart-drawer__content');

  try {
    const cartData = await youcanjs.cart.fetch();

    document.querySelector('.cart-drawer__close').addEventListener('click', toggleCartDrawer);

    if (!cartDrawerContent) {
      console.error('Cart drawer content not found');
      return;
    }

    // Clear existing content
    cartDrawerContent.innerHTML = '';

    const headerContainer = `
      <div class="header">
        <h2 class="cart">${CART_DRAWER_TRANSLATION.cartName}<span> ${cartData.count} ${CART_DRAWER_TRANSLATION.itemsCount}</span></h2>
      </div>
    `;

    cartDrawerContent.innerHTML += headerContainer;

    // Partition items into regular and bundle groups via extra_fields
    const bundleMap = new Map();
    const regularItems = [];
    const items = Array.isArray(cartData.items) ? cartData.items : [];

    items.forEach(item => {
      const extra = item.extra_fields;
      if (extra?.is_bundle_item) {
        if (!bundleMap.has(extra.bundle_id)) {
          bundleMap.set(extra.bundle_id, { id: extra.bundle_id, title: extra.bundle_title, items: [] });
        }
        bundleMap.get(extra.bundle_id).items.push(item);
      } else {
        regularItems.push(item);
      }
    });

    const cartBundles = [...bundleMap.values()];
    const hasContent = regularItems.length > 0 || cartBundles.length > 0;

    if (hasContent) {
      const products = document.createElement('ul');

      for (const item of regularItems) {
        item.price = formatCurrency(item.price, CURRENCY_CODE, CUSTOMER_LOCALE);
        item.productVariant.price = formatCurrency(item.productVariant.price, CURRENCY_CODE, CUSTOMER_LOCALE);

        if (item.productVariant.compare_at_price) {
          item.productVariant.compare_at_price = formatCurrency(item.productVariant.compare_at_price, CURRENCY_CODE, CUSTOMER_LOCALE);
        }

        products.innerHTML += cartTemplate(item);
      }

      cartDrawerContent.appendChild(products);

      cartBundles.forEach(bundle => {
        cartDrawerContent.innerHTML += bundleGroupTemplate(bundle);
      });

      // Attach event listeners to the newly added remove buttons
      await attachRemoveItemListeners();
      attachBundleRemoveListeners();
    } else {
      const p = document.createElement('p');
      p.classList.add('empty-cart');
      p.textContent = CART_DRAWER_TRANSLATION.emptyCart;
      cartDrawerContent.appendChild(p);
    }

    cartData.sub_total = formatCurrency(cartData.sub_total, CURRENCY_CODE, CUSTOMER_LOCALE);

    const footerContainerHTML = `
      <div class="footer">
        <div class="price-wrapper">
          <span class="total-price">${CART_DRAWER_TRANSLATION.totalAmount}</span>
          <div class="currency-wrapper">
            <span class="currency-value">${cartData.sub_total}</span>
          </div>
          <span class="spinner footer-spinner" style="display: none;"></span>
        </div>
        <a href='${location.origin}/cart' class="yc-btn">${CART_DRAWER_TRANSLATION.checkoutPayment}</a>
        <a href='${location.origin}' class="cart-action">${CART_DRAWER_TRANSLATION.continueShopping}</a>
      </div>
  `;

    // Create a DOM element for the footer container
    const footerContainer = document.createElement('div');
    footerContainer.innerHTML = footerContainerHTML;

    // Append the footer container to the cart drawer content
    cartDrawerContent.appendChild(footerContainer);
  } catch (error) {
    notify(error.message, 'error');
  }
}

function updateCartCount(delta, relative = false) {
  const cartBadge = document.querySelector('#cart-items-badge');
  if (cartBadge) {
    const updatedCount = relative ? Number(cartBadge.innerHTML) + delta : delta;
    cartBadge.innerHTML = updatedCount;
  }
}

function showSpinner(spinnerElement) {
  const spinnerAction = spinnerElement.previousElementSibling;
  toggleVisibility(spinnerAction, spinnerElement);
}

function hideSpinner(spinnerElement) {
  const spinnerAction = spinnerElement.previousElementSibling;
  toggleVisibility(spinnerElement, spinnerAction);
}

function toggleVisibility(hiddenElement, visibleElement = null) {
  if (hiddenElement) {
    hiddenElement.style.display = hiddenElement.style.display === 'none' ? 'block' : 'none';
  }

  if (visibleElement) {
    visibleElement.style.display = visibleElement.style.display === 'none' ? 'block' : 'none';
  }
}

function toggleCartDrawer() {
  const cartDrawer = document.querySelector('.cart-drawer');

  if (!cartDrawer) {
    console.error('Cart drawer not found');
    return;
  }

  document.body.style.overflow = cartDrawer.classList.contains('open') ? 'auto' : 'hidden';

  cartDrawer.classList.toggle('open');
  document.querySelector('.cart-overlay').classList.toggle('open');
}

function attachEventListeners() {
  const navbarCartIcon = document.querySelector('#navbar-cart-icon');
  const cartDrawerClose = document.querySelector('.cart-drawer__close');
  const cartOverlay = document.querySelector('.cart-overlay');

  if (navbarCartIcon) {
    navbarCartIcon.addEventListener('click', toggleCartDrawer);
  }

  if (cartDrawerClose) {
    cartDrawerClose.addEventListener('click', toggleCartDrawer);
  }

  if (cartOverlay) {
    cartOverlay.addEventListener('click', toggleCartDrawer);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  attachEventListeners();
  await updateCartDrawer();
});

/**
 * Remove the click event from the cart icon if the user is inside the cart page
 */
function preventCartDrawerOpening(templateName) {
  if (templateName !== 'cart') {
    return;
  }

  const cartDrawerIcon = document.querySelector('#navbar-cart-icon');

  cartDrawerIcon.removeEventListener('click', toggleCartDrawer);
  window.location.reload();
}

async function directAddToCart(productId) {
  try {
    const response = await youcanjs.cart.addItem({
      productVariantId: productId,
      quantity: 1,
    });

    if (response.error) throw new Error(response.error);

    updateCartCount(response.count);
    await updateCartDrawer();

    notify(ADD_TO_CART_EXPECTED_ERRORS.product_added, 'success');
    toggleCartDrawer();
  } catch (err) {
    notify(err.message, 'error');
  } finally {
    stopLoad('#loading__cart');
  }
}
