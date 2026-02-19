function facebookPixel(event, payload = {}) {
  if (ONLINE_SETTINGS.fb_pixel.ids?.length && typeof fbq === 'function') {
    fbq('track', event, payload);
  }
}

function tiktokPixel(event, payload = {}) {
  if (ONLINE_SETTINGS.tiktok_pixel.ids?.length && typeof ttq !== 'undefined') {
    ttq.track(event, payload);
  }
}

function snapPixel(event, payload = {}) {
  if (ONLINE_SETTINGS.snap_pixel.ids?.length && typeof snaptr === 'function') {
    snaptr('track', event, payload);
  }
}

function googlePixel(event, payload = {}) {
  if (ONLINE_SETTINGS.google_analytics.ids?.length && typeof gtag === 'function') {
    gtag('event', event, {
      ...payload,
      send_to: ONLINE_SETTINGS.google_analytics.ids,
    });
  }
}

function makeContentIds(variants, returnFirst = false) {
  let value = [];

  if (!Array.isArray(variants)) {
    variants = [variants];
  }

  const defaultValue = fieldHandler('product_id', variants);

  if (typeof ONLINE_SETTINGS !== 'undefined' && typeof ONLINE_SETTINGS.pixels_global_config !== 'undefined') {
    value = fieldHandler(ONLINE_SETTINGS.pixels_global_config.contentId, variants);
  } else {
    value = defaultValue;
  }

  if (value.some((v) => !v)) {
    value = defaultValue;
  }

  if (!returnFirst) {
    return value;
  }

  return value[0];
}

function fieldHandler(field, variants) {
  switch (field?.toLowerCase()) {
    case 'product_variant_id':
      return [...new Set(variants.map((row) => row.productVariant.id))];
    case 'sku':
      return [...new Set(variants.map((row) => row.productVariant.sku))];
    case 'product_id':
    default:
      return [...new Set(variants.map((row) => row.productVariant.product_id))];
  }
}

function trackPixelEvents(type, data) {
  const eventMap = {
    'initiate-checkout': {
      tiktok: 'InitiateCheckout',
      snapchat: 'START_CHECKOUT',
      google: 'begin_checkout',
      facebook: 'InitiateCheckout'
    },
    'add-to-cart': {
      tiktok: 'AddToCart',
      snapchat: 'ADD_CART',
      google: 'add_to_cart',
      facebook: 'AddToCart'
    },
    'view-content': {
      tiktok: 'ViewContent',
      snapchat: 'VIEW_CONTENT',
      google: 'view_item',
      facebook: 'ViewContent'
    }
  };

  if (!eventMap[type]) {
    return console.error('Unknown event type:', type);
  }

  const events = eventMap[type];

  tiktokPixel(events.tiktok, {
    contents: data.items.map(item => ({
      content_id: makeContentIds(data.items, true),
      content_type: 'product',
      content_name: item.product.name || item.name,
      price: item.price,
      ...(item.quantity && { quantity: item.quantity })
    })),
    value: type === 'initiate-checkout' ? data.sub_total : data.items[0].price,
    currency: CURRENCY_CODE,
  });

  snapPixel(events.snapchat, {
    item_ids: makeContentIds(data.items),
    price: type === 'initiate-checkout' ? data.sub_total : data.items[0].price,
    currency: CURRENCY_CODE,
    ...(data.count && { num_items: data.count })
  });

  googlePixel(events.google, {
    currency: CURRENCY_CODE,
    value: type === 'initiate-checkout' ? data.sub_total : data.items[0].price,
    items: data.items.map((item, index) => ({
      item_name: item.product.name || item.name,
      item_id: makeContentIds(data.items, true),
      price: item.price,
      index: index,
      ...(item.quantity && { quantity: item.quantity })
    })),
    ...(data.coupon?.code && { coupon: data.coupon?.code }),
  });

  facebookPixel(events.facebook, {
    content_ids: makeContentIds(data.items),
    content_type: 'product',
    value: type === 'initiate-checkout' ? data.sub_total : data.items[0].price,
    currency: CURRENCY_CODE,
    ...(data.count && { num_items: data.count })
  });
}
