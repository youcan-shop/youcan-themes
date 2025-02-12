class Testimonials extends HTMLElement {
  static observedAttributes = ["product-id"];

  constructor() {
    super();
    this.productId = this.getAttribute("product-id");

    this.container = this.querySelector("[data-container]");
    this.skeleton = this.querySelector("[data-skeleton]");
    this.empty = this.querySelector("[data-empty]");
  }

  connectedCallback() {
    if (!this.productId) {
      this.setIsEmpty();
      this.skeleton.remove();

      return;
    }

    this._render();
  }

  async _render() {
    try {
      const response = await youcanjs.product.fetchReviews(this.productId).data();

      response.length ? this.setupItems(response) : this.setIsEmpty();
    } catch (error) {
      console.error(error);

      this.setIsEmpty();
      toast.show(error.message, "error");
    } finally {
      this.skeleton.remove();
    }
  }

  setIsEmpty() {
    this.empty.removeAttribute("hidden");
  }

  setupItems(items) {
    const ITEMS_WITH_CONTENT = items.filter((item) => Boolean(item.content));

    if (ITEMS_WITH_CONTENT.length) {
      ITEMS_WITH_CONTENT.forEach((item) => this.createItem(item));
      ITEMS_WITH_CONTENT.length > 1 &&
        this.parentElement.style.setProperty("--items-columns", ITEMS_WITH_CONTENT.length);
    }
    this.skeleton.remove();
  }

  createItem({ first_name, last_name, content, ratings }) {
    const template = this.querySelector("[data-testimonial]");
    const testimonial = template.content.cloneNode(true);

    const itemAuthor = testimonial.querySelector("[data-author]");
    const itemContent = testimonial.querySelector("[data-content]");
    const itemRatings = testimonial.querySelectorAll("[data-rating] svg");

    itemContent.innerHTML = content;
    itemRatings.forEach((star, i) => {
      if (i + 1 > ratings) star.style.fill = "none";
    });

    if (first_name || last_name) {
      itemAuthor.textContent = `- ${first_name ?? ""} ${last_name ?? ""}`;
    }

    this.container.appendChild(testimonial);
  }
}

customElements.define("yc-testimonials", Testimonials);
