class CartDrawer extends HTMLElement {
  constructor() {
    super();

    this.cart = document.querySelector("yc-drawer#cart");
    this.cartBubble = this.cart.querySelector("[data-cart-badge]");
    this.subTotals = this.cart.querySelectorAll("[data-total]");
  }

  connectedCallback() {
    this._render();
  }

  _render() {
    subscribe(PUB_SUB_EVENTS.cartUpdate, (payload) => {
      const { count, sub_total } = payload.cartData;

      this.updateCartBubble(count, sub_total);
      // TODO: Update cart drawer list
    });
  }

  updateCartSubTotal(subtotal) {
    this.subTotals.forEach((node) => {
      // TODO: Format subtotal
      node.textContent = subtotal;
    });
  }

  updateCartCount(count) {
    if (this.cartBubble) {
      this.cartBubble.textContent = count;
      this.cartBubble.classList.toggle("hidden", count === 0);
    }
  }

  updateCartBubble(count, subtotal) {
    this.updateCartSubTotal(subtotal);
    this.updateCartCount(count);
  }
}

customElements.define("yc-cart-drawer-items", CartDrawer);
