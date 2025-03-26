class Testimonials extends HTMLElement {
  static observedAttributes = ["product-id"];

  constructor() {
    super();
    this.productId = this.getAttribute("product-id");

    this.container = this.querySelector("[data-container]");
    this.showMore = this.querySelector("[data-show-more]");
    this.skeleton = this.querySelector("[data-skeleton]");
    this.empty = this.querySelector("[data-empty]");
  }

  connectedCallback() {
    this._render();
  }

  _render() {
    if (!this.productId) return this.setEmptyState();
    this.fetchReviews();
  }

  async fetchReviews(response = null) {
    try {
      this.setIsLoading();

      const res = response || youcanjs.product.fetchReviews(this.productId, { limit: 9 });
      const items = await res.data();

      items.length ? this.setupItems(items) : this.setEmptyState();
      this.updatePagination(res);
    } catch (error) {
      console.error(error);

      toast.show(error.message, "error");
      this.setEmptyState();
    } finally {
      this.skeleton.setAttribute("hidden", true);
    }
  }

  setupItems(items) {
    items.filter(({ content }) => content).forEach((item) => this.createItem(item));
  }

  updatePagination(response) {
    const { total_pages, current_page } = response.meta.pagination;
    if (current_page >= total_pages) return this.showMore.setAttribute("hidden", true);

    this.showMore.removeAttribute("hidden");
    this.showMore.onclick = () => {
      this.skeleton.removeAttribute("hidden");
      this.fetchReviews(response.next());
    };
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
      itemAuthor.textContent = `- ${first_name ?? ""} ${last_name ?? ""}`.trim();
    }

    this.container.appendChild(testimonial);
  }

  setIsLoading() {
    this.showMore?.setAttribute("hidden", true);
    this.skeleton.removeAttribute("hidden");
  }

  setEmptyState() {
    this.empty.removeAttribute("hidden");
    this.skeleton.remove();
  }
}

customElements.define("yc-testimonials", Testimonials);
