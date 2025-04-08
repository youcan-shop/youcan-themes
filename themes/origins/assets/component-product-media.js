class ProductMedia extends HTMLElement {
  constructor() {
    super();

    this.mainImage = this.querySelector("[data-main-image]");
    this.gallery = this.querySelector("[data-gallery]");
    this.currentImage = this.querySelector("[data-current-image]");
  }

  connectedCallback() {
    this._render();
  }

  _render() {
    if (this.gallery) {
      this.gallery.addEventListener("click", (event) => {
        const target = event.target;

        if (target.tagName === "INPUT") {
          this.updateMainImage(target.value, target.nextElementSibling.src);
        }
      });
    }
  }

  updateMainImage(id, src) {
    this.mainImage.src = src;
    this.currentImage.textContent = id;
  }
}

customElements.define("yc-product-media", ProductMedia);
