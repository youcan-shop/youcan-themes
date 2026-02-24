if (!customElements.get("ui-navbar")) {
  class Navbar extends HTMLElement {
    constructor() {
      super();

      this.isSticky = Boolean(this.getAttribute("data-sticky"));
    }

    connectedCallback() {
      this._render();
    }

    _render() {
      if (this.isSticky) {
        const rect = this.getBoundingClientRect();
        this.setShadow(rect.top === 0);

        window.addEventListener("scroll", () => {
          const rect = this.getBoundingClientRect();
          this.setShadow(rect.top === 0);
        });
      }
    }

    setShadow(state) {
      this.setAttribute("data-shadow", state);
    }
  }

  customElements.define("ui-navbar", Navbar);
}
