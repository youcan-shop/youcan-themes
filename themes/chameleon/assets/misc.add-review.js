class AddReview extends HTMLElement {
  static observedAttributes = ["product-id"];
  static MAXIMUM_FILE_SIZE = 2;
  static BYTES_IN_KB = 1024;
  static KB_IN_MB = 1024;

  constructor() {
    super();

    this.images = [];
    this.productId = this.getAttribute("product-id");

    this.ESC_KEY = "Escape";
    this.trigger = this.firstElementChild;
    this.content = this.lastElementChild;
    this.form = this.content.querySelector("form");
    this.uploadImages = this.content.querySelector("[ui-add-review-upload-image]");
    this.stars = this.content.querySelectorAll("[data-star]");
    this.submit = this.content.querySelector("[ui-add-review-submit]");
    this.closeActions = this.content.querySelectorAll("[ui-add-review-close]");

    this.submitContent = this.submit.textContent;
  }

  connectedCallback() {
    this._render();
  }

  _render() {
    this.form.addEventListener("submit", this.submitReview.bind(this));

    this.trigger.addEventListener("click", () => this.toggle());
    this.addEventListener("keydown", (e) => e.key === this.ESC_KEY && this.close());
    this.closeActions.forEach((action) => action.addEventListener("click", () => this.close()));

    this.stars.forEach((star, i) => {
      star.addEventListener("click", () => [...this.stars].map((s, idx) => s.setAttribute("aria-checked", idx == i)));
    });

    this.uploadImages.addEventListener("change", this.onImageUpload.bind(this));
  }

  async submitReview(event) {
    event.preventDefault();

    const formData = new FormData(event.target);

    if (![...this.stars].find((s) => s.getAttribute("aria-checked"))) {
      const message = window.errorStrings.rating_is_required;
      toast.show(message, "error");

      return;
    }

    const payload = {
      images: this.images,
      first_name: formData.get("first-name"),
      last_name: formData.get("last-name"),
      ratings: Number([...this.stars].find((s) => s.getAttribute("aria-checked") === "true").getAttribute("data-star")),
      content: formData.get("content"),
      email: formData.get("email"),
    };
    this.setSubmitButtonIsLoading(true);

    try {
      await youcanjs.product.submitReview(this.productId, payload);
      this.setState(false);

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

    const template = this.querySelector("[ui-add-review-image]");
    const image = template.content.cloneNode(true);
    const imgElement = image.querySelector("img");
    const removeButton = image.querySelector("[ui-add-review-remove-image]");

    imgElement.src = source;
    template.parentElement.appendChild(image);

    removeButton.addEventListener("click", (event) => this.removeImage(source, event.currentTarget.parentElement));
  }

  removeImage(source, element) {
    element?.remove();
    this.images = this.images.filter((image) => image !== source);
  }

  get getState() {
    return this.content.getAttribute("data-state");
  }

  setState(state) {
    this.content.setAttribute("data-state", state ? "open" : "closed");

    if (!state) {
      this.form.reset();
      this.trigger.focus();
      [...this.stars].find((s) => s.removeAttribute("aria-checked"));
      this.images = [];
      this.querySelectorAll("img")?.forEach((img) => img.parentElement.remove());
    }
  }

  close() {
    this.setState(false);
  }

  toggle() {
    this.setState(this.getState !== "open");
  }

  setSubmitButtonIsLoading(state) {
    this.submit.textContent = state ? "Loading..." : this.submitContent;
    state ? this.submit.setAttribute("disabled", true) : this.submit.removeAttribute("disabled");
  }
}

customElements.define("ui-add-review", AddReview);
