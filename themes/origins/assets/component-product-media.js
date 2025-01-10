class ProductMedia extends HTMLElement {
  constructor() {
    super();

    this.selectedImage = null;
    this.mainImage = this.querySelector("[data-main-image]");
    this.gallery = this.querySelector("[data-gallery]");
  }

  connectedCallback() {
    this._render();
  }

  _render() {
    this.gallery.addEventListener("click", (event) => {
      const { target } = event;
      if (target.tagName === "INPUT") {
        const imageSrc = target.nextElementSibling.src;
        this.mainImage.src = imageSrc;
      }
    });
  }
}

customElements.define("yc-product-media", ProductMedia);
