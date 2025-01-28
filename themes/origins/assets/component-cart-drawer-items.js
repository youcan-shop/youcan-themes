class CartDrawer extends HTMLElement {
  constructor() {
    super();

    this.cartBubble = document.querySelector(
      "yc-drawer#cart [data-cart-badge]",
    );
  }

  connectedCallback() {
    this._render();
  }

  _render() {
    subscribe(PUB_SUB_EVENTS.cartUpdate, (payload) => {
      const { count } = payload.cartData;

      this.updateCartCount(count);
      // TODO: Update cart drawer list
    });
  }

  updateCartCount(count) {
    if (this.cartBubble) {
      this.cartBubble.textContent = count;
      this.cartBubble.classList.toggle("hidden", count === 0);
    }
  }
}

customElements.define("yc-cart-drawer-items", CartDrawer);
