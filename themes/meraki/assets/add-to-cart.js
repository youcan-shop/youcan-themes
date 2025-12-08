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

    const checkoutPageUrl = response.one_page_checkout === true ? response.all_in_one_checkout_url : response.checkout_info_url;

    if (IS_CART_SKIPED) {
      window.location.href = checkoutPageUrl;

      return;
    }

    notify(ADD_TO_CART_EXPECTED_ERRORS.product_added, 'success');
    toggleCartDrawer();
  } catch (err) {
    stopLoad('#loading__cart');
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

function cartTemplate(item) {
  // Loop through variations
  const variationsArray = [];
  for (const key in item.productVariant.variations) {
    if (item.productVariant.variations.hasOwnProperty(key)) {
      variationsArray.push(`${key}: ${item.productVariant.variations[key]}`);
    }
  }
  const variationsString = variationsArray.join('&nbsp;&nbsp;');
  const variationsCheck = variationsString === 'default: default' ? '' : variationsString;

  const imageUrl = item.productVariant.image.url ?? item.productVariant.product.thumbnail ?? defaultImage;

  return `
    <li class="cart-item">
      <div class="item-body">
        ${imageUrl && `<img src="${imageUrl}" alt="${item.productVariant.product.name}" />`}
        <div class="item-details">
          <p class="product-name">${item.productVariant.product.name}</p>
          <div class="variants">
          ${CART_DRAWER_TRANSLATION.quantityVariant}:&nbsp;${item.quantity} &nbsp;${variationsCheck}
          </div>
          <div class="product-price">
            ${item.productVariant.compare_at_price ? `<span class="compare-price">${item.productVariant.compare_at_price}</span>` : ''}
            <div class="currency-wrapper">
              <span class="price">${item.productVariant.price}</span>
            </div>
          </div>
          <button class="remove-item-btn" aria-label="remove item">
            <ion-icon data-cart-item-id="${item.id}" data-product-variant-id="${item.productVariant.id}" name="trash-outline"></ion-icon>
          </button>
          <div class="spinner" data-spinner-id="${item.id}" style="display: none;"></div>
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
        <h2 class="cart">${CART_DRAWER_TRANSLATION.cartName}<span> ${cartData.count}</span></h2>
      </div>
    `;

    cartDrawerContent.innerHTML += headerContainer;

    // Check if the cart has items
    if (cartData.count > 0) {
      const products = document.createElement('ul');

      for (const item of cartData.items) {
        item.price = formatCurrency(item.price, CURRENCY_CODE, CUSTOMER_LOCALE);
        item.productVariant.price = formatCurrency(item.productVariant.price, CURRENCY_CODE, CUSTOMER_LOCALE);

        if (item.productVariant.compare_at_price) {
          item.productVariant.compare_at_price = formatCurrency(item.productVariant.compare_at_price, CURRENCY_CODE, CUSTOMER_LOCALE);
        }

        products.innerHTML += cartTemplate(item);
      }

      cartDrawerContent.appendChild(products);

      // Attach event listeners to the newly added remove buttons
      attachRemoveItemListeners();
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
          </div>
          <a href='${location.origin}/cart' class="yc-btn">${CART_DRAWER_TRANSLATION.checkoutPayment}</a>
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

  cartDrawer.classList.toggle('open');
  navMenuVariables.header.classList.toggle('hide');

  if (cartDrawer.classList.contains('open')) {
    showOverlay();
  } else {
    hideOverlay();
  }
}

function attachEventListeners() {
  const navbarCartIcon = document.querySelector('#navbar-cart-icon');
  const cartDrawerClose = document.querySelector('.cart-drawer__close');

  if (navbarCartIcon) {
    navbarCartIcon.addEventListener('click', function (e) {
      toggleCartDrawer();
      closeMenu();
    });
  }

  if (cartDrawerClose) {
    cartDrawerClose.addEventListener('click', toggleCartDrawer);
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

  cartDrawerIcon.removeEventListener('click', toggleCartDrawer());
  window.location.reload();
}

async function directAddToCart(event, productId) {
  event.preventDefault();

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
