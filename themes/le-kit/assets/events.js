export const ThemeEvents = {
  cartUpdate: "cart:update",
  cartError: "cart:error",
  couponUpdate: "coupon:update",
};

/**
 * @typedef {{ cart: any, source?: string, productVariantId?: string, image?: HTMLImageElement | null, skipCart?: boolean, skipToCheckout?: boolean }} CartUpdateDetail
 */

/** Dispatched on `document` after any change to the cart. */
export class CartUpdateEvent extends CustomEvent {
  /** @param {CartUpdateDetail} detail */
  constructor(detail) {
    super(ThemeEvents.cartUpdate, { bubbles: true, detail });
  }
}

/** Dispatched on `document` when a cart request fails. */
export class CartErrorEvent extends CustomEvent {
  /** @param {{ error: Error, source?: string, productVariantId?: string }} detail */
  constructor(detail) {
    super(ThemeEvents.cartError, { bubbles: true, detail });
  }
}

/** Dispatched on `document` after a coupon is applied or removed. */
export class CouponUpdateEvent extends CustomEvent {
  /** @param {{ cart: any }} detail */
  constructor(detail) {
    super(ThemeEvents.couponUpdate, { bubbles: true, detail });
  }
}
