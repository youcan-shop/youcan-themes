class CartDrawer extends HTMLElement {
  connectedCallback() {
    this._render();
  }

  _render() {
    return 0;
  }
}

customElements.define("yc-cart-drawer-items", CartDrawer);
