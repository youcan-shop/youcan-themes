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

  // selectImage() {}

  _render() {
    // console.log(this.mainImage);
    this.gallery.addEventListener("click", (event) => {
      const { target } = event;
      if (target.tagName === "INPUT") {
        // Take the img src, and set it to the preview's img
        const imageSrc = target.nextElementSibling.src;
        this.mainImage.src = imageSrc;
        // this.mainImage.src = target.nextElementSibling.src;
      }
    });
  }
}

customElements.define("yc-product-media", ProductMedia);
