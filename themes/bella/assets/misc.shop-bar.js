if (!customElements.get("ui-shop-bar")) {
  class ShopBar extends HTMLElement {
    constructor() {
      super();

      this.shopArea = document.querySelector('[ui-block="controller"]');
    }

    connectedCallback() {
      this._render();
    }

    _render() {
      const observerCallback = (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.setState(false);
            observer.unobserve(entry.target);
          } else {
            this.setState(true);
          }
        });
      };

      const observer = new IntersectionObserver(observerCallback, { threshold: 0.5 });
      observer.observe(this.shopArea);

      window.addEventListener("scroll", () => observer.observe(this.shopArea));
    }

    setState(state) {
      this.dataset.visible = state;
    }
  }

  customElements.define("ui-shop-bar", ShopBar);
}
