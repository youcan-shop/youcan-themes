class Testimonials extends HTMLElement {
  static observedAttributes = ["product-id"];

  constructor() {
    super();
    this.PRODUCT_ID = this.getAttribute("product-id");

    this.container = this.querySelector("[data-container]");
    this.skeleton = this.querySelector("[data-skeleton]");
    this.empty = this.querySelector("[data-empty]");
  }

  connectedCallback() {
    this._render();
  }

  async _render() {
    try {
      const response = await youcanjs.product.fetchReviews(this.PRODUCT_ID).data();

      response.length ? this.setupItems(response) : this.isEmpty();
    } catch (error) {
      console.error(error);

      this.isEmpty();
      this.PRODUCT_ID && toast.show(error.message, "error");
    } finally {
      this.skeleton.remove();
    }
  }

  isEmpty() {
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
    itemAuthor.textContent = `- ${first_name} ${last_name} -`;
    itemRatings.forEach((star, i) => {
      if (i + 1 > ratings) star.style.fill = "none";
    });

    this.container.appendChild(testimonial);
  }
}

customElements.define("yc-testimonials", Testimonials);
