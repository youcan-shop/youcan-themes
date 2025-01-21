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
          const imageSrc = target.nextElementSibling.src;
          this.mainImage.src = imageSrc;
          this.currentImage.textContent = target.value;
        }
      });
    }
  }
}

customElements.define("yc-product-media", ProductMedia);
