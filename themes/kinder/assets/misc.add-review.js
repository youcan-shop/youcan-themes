class AddReview extends HTMLElement {
  static observedAttributes = ["product-id"];
  static MAXIMUM_FILE_SIZE = 2;
  static BYTES_IN_KB = 1024;
  static KB_IN_MB = 1024;

  constructor() {
    super();

    this.form = this.querySelector("form");
    this.stars = this.querySelectorAll('[ui-add-review="star"]');
    this.submit = this.querySelector('[ui-add-review="submit"]');

    this.images = [];
    this.uploadImages = this.querySelector('[ui-add-review="upload-image"]');
  }

  connectedCallback() {
    this._render();
  }

  _render() {
    this.form.addEventListener("submit", this.submitReview.bind(this));
    this.uploadImages.addEventListener("change", this.onImageUpload.bind(this));
  }

  async submitReview(event) {
    event.preventDefault();

    const formData = new FormData(event.target);

    const payload = {
      images: this.images,
      first_name: formData.get("first-name"),
      last_name: formData.get("last-name"),
      ratings: Number([...this.stars].findLast((s) => s.checked).value),
      content: formData.get("content"),
      email: formData.get("email"),
    };
    this.setSubmitButtonIsLoading(true);

    try {
      await youcanjs.product.submitReview(this.productId, payload);
      this.form.reset();

      toast.show(window.successStrings.review_submitted, "success");
    } catch (error) {
      let errorMessage = error.message;
      const fieldsError = error.meta.fields;

      if (fieldsError) {
        errorMessage = fieldsError.content[0];
      }

      console.error(error);
      toast.show(errorMessage, "error");
    } finally {
      this.setSubmitButtonIsLoading(false);
    }
  }

  setSubmitButtonIsLoading(state) {
    this.submit.toggleAttribute("data-loading", state);
    this.submit.disabled = state;
  }

  get productId() {
    return this.getAttribute("product-id");
  }

  onImageUpload(event) {
    const files = Array.from(event.target.files);

    if (files.length < 1) return;

    files.forEach((file) => {
      const fileSizeInKB = file.size / AddReview.BYTES_IN_KB;
      const fileSizeInMB = fileSizeInKB / AddReview.KB_IN_MB;

      if (fileSizeInMB > AddReview.MAXIMUM_FILE_SIZE) {
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

    const template = this.querySelector('[ui-add-review="image"]');
    const image = template.content.cloneNode(true);
    const imgElement = image.querySelector("img");
    const removeButton = image.querySelector('[ui-add-review="remove-image"]');

    imgElement.src = source;
    template.parentElement.appendChild(image);

    removeButton.addEventListener("click", (event) => this.removeImage(source, event.currentTarget.parentElement));
  }

  removeImage(source, element) {
    element?.remove();
    this.images = this.images.filter((image) => image !== source);
  }
}

customElements.define("ui-add-review", AddReview);
