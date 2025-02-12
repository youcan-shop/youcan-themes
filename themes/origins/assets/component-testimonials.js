class Testimonials extends HTMLElement {
  static observedAttributes = ["product-id"];

  constructor() {
    super();
    this.skeleton = this.querySelector("[data-skeleton]");
    this.container = this.querySelector("[data-container]");
  }

  connectedCallback() {
    this._render();
  }

  async _render() {
    try {
      const productId = this.getAttribute("product-id");
      const response = await youcanjs.product.fetchReviews(productId).data();

      response.length && this.setupItems(response);
    } catch (error) {
      console.error(error);

      toast.show(error.message, "error");
    } finally {
      this.skeleton.remove();
    }
  }

  setupItems(items) {
    const ITEMS_WITH_CONTENT = items.filter((item) => Boolean(item.content));

    if (ITEMS_WITH_CONTENT.length) {
      ITEMS_WITH_CONTENT.forEach((item) => this.createItem(item));
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
