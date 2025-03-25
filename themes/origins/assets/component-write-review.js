class WriteReview extends HTMLElement {
  static observedAttributes = ["product-id"];
  static MAXIMUM_FILE_SIZE = 2;
  static BYTES_IN_KB = 1024;
  static KB_IN_MB = 1024;

  constructor() {
    super();

    this.images = [];
    this.productId = this.getAttribute("product-id");

    this.form = this.querySelector("[data-review-form]");
    this.imageInput = this.form.querySelector("input[name='images']");
    this.imagesContainer = this.querySelector("[data-images-container]");

    this.submitButton = this.querySelector("[data-submit]");
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
    this.setSubmitButtonIsLoading(true);

    try {
      await youcanjs.product.submitReview(this.productId, payload);
      this.resetForm();

      toast.show(window.successStrings.review_submitted, "success");
    } catch (error) {
      console.error(error);

      toast.show(error.message, "error");
    } finally {
      this.setSubmitButtonIsLoading(false);
    }
  }

  onUploadImage(event) {
    const files = Array.from(event.target.files);

    if (files.length < 1) return;

    files.forEach((file) => {
      const fileSizeInKB = file.size / WriteReview.BYTES_IN_KB;
      const fileSizeInMB = fileSizeInKB / WriteReview.KB_IN_MB;

      if (fileSizeInMB > WriteReview.MAXIMUM_FILE_SIZE) {
        const message = window.errorStrings.large_file;
        toast.show(message.replace("[file]", `"${file.name}"`), "error");

        return;
      }

      const reader = new FileReader();

      reader.onload = () => {
        const base64 = reader.result;
        this.addImage(base64);
      };
      reader.readAsDataURL(file);
    });
  }

  addImage(source) {
    this.images.push(source);

    const template = this.querySelector("[data-image]");
    const image = template.content.cloneNode(true);
    const imgElement = image.querySelector("img");
    const removeButton = image.querySelector("[data-remove-image]");

    imgElement.src = source;
    this.imagesContainer.appendChild(image);

    removeButton.addEventListener("click", (event) => this.removeImage(source, event.currentTarget.parentElement));
  }

  removeImage(source, element) {
    element?.remove();
    this.images = this.images.filter((image) => image !== source);
  }

  resetForm() {
    this.images = [];
    this.imagesContainer.innerHTML = "";
    this.form.reset();
    const reviewModal = document.querySelector("yc-modal[data-visible]");
    reviewModal.close();
  }

  setSubmitButtonIsLoading(is_loading) {
    this.submitButton.toggleAttribute("data-loading", is_loading);
  }
}

customElements.define("yc-write-review", WriteReview);
