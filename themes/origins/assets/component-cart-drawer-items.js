class CartDrawer extends HTMLElement {
  constructor() {
    super();
    this.cartBubble = document.querySelector(
      "yc-drawer#cart [data-cart-bubble]",
    );
  }

  connectedCallback() {
    this._render();
  }

  _render() {
    subscribe(PUB_SUB_EVENTS.cartUpdate, (payload) => {
      const { count } = payload.cartData;
      this.updateCartCount(count);
    });
  }

  updateCart() {
    this.updateCartCount();
    // TODO: Update items list
  }

  updateCartCount(count) {
    if (this.cartBubble) {
      this.cartBubble.textContent = count;
      this.cartBubble.classList.toggle("hidden", count === 0);
    }
  }
}

customElements.define("yc-cart-drawer-items", CartDrawer);
