if (!customElements.get("ui-product-reviews")) {
  class ProductReviews extends HTMLElement {
    static observedAttributes = ["product-id"];

    constructor() {
      super();

      this.LIMIT_PER_REQUEST = 8;
      this.productId = this.getAttribute("product-id");
      this.skeleton = this.querySelector("[ui-product-reviews-skeleton]");
      this.showMore = this.querySelector("[ui-product-reviews-show-more]");
      this.container = this.querySelector("ul");
    }

    connectedCallback() {
      this._render();
    }

    _render() {
      this.fetchReviews();
    }

    async fetchReviews(response = null) {
      try {
        this.setIsLoading();

        const res = response || youcanjs.product.fetchReviews(this.productId, { limit: this.LIMIT_PER_REQUEST });
        const items = await res.data();

        items.length && this.setupItems(items);
        this.updatePagination(res);
      } catch (error) {
        console.error(error);

        toast.show(error.message, "error");
      } finally {
        this.skeleton.setAttribute("hidden", true);
      }
    }

    setupItems(items) {
      const itemsWithContent = items.filter((item) => !!item.content);
      const totalItems = itemsWithContent.length;

      totalItems ? itemsWithContent.forEach((item) => this.createItem(item)) : this.filter.remove();
    }

    updatePagination(response) {
      const { total_pages, current_page } = response.meta.pagination;
      if (current_page >= total_pages) {
        this.showMore.setAttribute("hidden", true);

        return;
      }

      this.showMore.removeAttribute("hidden");
      this.showMore.onclick = () => {
        this.skeleton.removeAttribute("hidden");
        this.fetchReviews(response.next());
      };
    }

    createItem(data) {
      const template = this.querySelector("template");
      const review = template.content.cloneNode(true);

      const { first_name, last_name, ratings } = data;
      if (ratings < 1) return;

      const [content, author, stars, rating] = review.querySelectorAll("[ui-product-reviews-item]");

      this.setItemAuthor(author, { first_name, last_name });
      this.setItemContent(content, data.content);
      this.setItemRating(rating, ratings);
      this.setItemStars(stars, ratings);

      this.container.appendChild(review);
    }

    setItemAuthor(authorElement, { first_name, last_name }) {
      if (first_name || last_name) {
        authorElement.textContent = `${first_name || ""} ${last_name || ""}`.trim();
      }
    }

    setItemContent(contentElement, content) {
      contentElement.innerHTML = content;
    }

    setItemRating(ratingContent, rating) {
      ratingContent.textContent = `(${Number(rating).toFixed(1)})`;
    }

    setItemStars(starsElement, ratings) {
      starsElement.querySelectorAll("[ui-icon]").forEach((star, i) => {
        i + 1 <= ratings ? star.setAttribute("filled", true) : star.removeAttribute("filled");
      });
    }

    setIsLoading() {
      this.showMore?.setAttribute("hidden", true);
      this.skeleton.removeAttribute("hidden");
    }
  }

  customElements.define("ui-product-reviews", ProductReviews);
}
