class WriteReview extends HTMLElement {
  static observedAttributes = ["product-id"];

  constructor() {
    super();
    this.images = [];
    this.productId = this.getAttribute("product-id");

    this.modal = this.querySelector("yc-modal");
    this.form = this.querySelector("[data-review-form]");
    this.imageInput = this.form.querySelector("input[name='images']");

    this.submitButton = this.querySelector("[data-submit]");
    this.imageSkeleton = this.querySelector("[data-image-skeleton]");
  }

  connectedCallback() {
    this._render();
  }

  _render() {
    this.form.addEventListener("submit", this.submitReview.bind(this));
    this.imageInput.addEventListener("change", this.onUploadImage.bind(this));
  }

  async submitReview(event) {
    event.preventDefault();
    const formData = new FormData(event.target);

    if (Number(formData.get("ratings")) === 0) {
      const message = window.errorStrings.rating_is_required;
      toast.show(message, "error");

      return;
    }

    const payload = {
      images: this.images,
      first_name: formData.get("first-name"),
      last_name: formData.get("last-name"),
      ratings: +formData.get("ratings"),
      content: formData.get("content"),
      email: formData.get("email"),
    };
    this.toggleSubmitButton(true);

    try {
      const response = await youcanjs.product.submitReview(this.productId, payload);

      this.form.reset();
      this.modal.close();
      toast.show(response.detail, "success");
    } catch (error) {
      console.error(error);
      toast.show(error.message, "error");
    } finally {
      this.toggleSubmitButton(false);
    }
  }

  onUploadImage(event) {
    const files = event.target.files;
    if (files.length < 1) return;

    const file = files[0];
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async () => {
      try {
        this.toggleImageSkeleton(false);

        const response = await youcanjs.product.upload(file);
        this.addImage(response.link);
      } catch (error) {
        console.error(error);

        toast.show(
          (error.meta?.fields?.image && error.meta.fields.image[0]) ?? error.message,
          "error",
        );
      } finally {
        this.toggleImageSkeleton(true);
      }
    };
  }

  addImage(source) {
    this.images.push(source);
    const template = this.querySelector("[data-image]");
    const image = template.content.cloneNode(true);
    const imgElement = image.querySelector("img");
    const removeButton = image.querySelector("[data-remove-image]");

    imgElement.src = source;
    template.parentElement.appendChild(image);

    removeButton.addEventListener("click", (event) =>
      this.removeImage(source, event.currentTarget.parentElement),
    );
  }

  removeImage(source, element) {
    element?.remove();
    this.images = this.images.filter((image) => image !== source);
  }

  toggleSubmitButton(is_loading) {
    this.submitButton.toggleAttribute("data-loading", is_loading);
  }

  toggleImageSkeleton(state) {
    this.imageSkeleton.hidden = state;
  }
}

customElements.define("yc-write-review", WriteReview);
