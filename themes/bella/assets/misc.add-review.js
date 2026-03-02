class AddReview extends HTMLElement {
  static observedAttributes = ["product-id"];

  constructor() {
    super();

    this.form = this.querySelector("form");
    this.stars = this.querySelectorAll('[ui-add-review="star"]');
    this.submit = this.querySelector('[ui-add-review="submit"]');
  }

  connectedCallback() {
    this._render();
  }

  _render() {
    this.form.addEventListener("submit", this.submitReview.bind(this));
  }

  async submitReview(event) {
    event.preventDefault();

    const formData = new FormData(event.target);

    const payload = {
      images: [],
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
}

customElements.define("ui-add-review", AddReview);
