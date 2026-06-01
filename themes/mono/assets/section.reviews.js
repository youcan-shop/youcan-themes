class Reviews extends HTMLElement {
  static observedAttributes = ["product-id"];

  constructor() {
    super();

    this.fetchIndex = 0;
    this.productId = this.getAttribute("product-id");
    this.reviews = this.querySelector('[ui-reviews="list"]');
    this.reviewsDetail = this.querySelector('[ui-reviews="list-detail"]');
    this.skeletons = this.querySelectorAll('[ui-reviews="skeleton"]');
    this.pagination = this.querySelector('[ui-reviews="pagination"]');
    this.empty = this.querySelector("ui-empty");
    this.total = this.querySelector('[ui-reviews="total"]');
    this.detail = this.querySelector('[ui-reviews="detail"]');
    this.showAll = this.querySelector('[ui-reviews="show-all"]');
    this.reviewTemplate = this.querySelector('template[ui-reviews="item"]');
    this.reviewDetailTemplate = this.querySelector('template[ui-reviews="detail-item"]');
  }

  connectedCallback() {
    this._render();
  }

  _render() {
    this.fetchReviews(null, 8);

    this.showAll.addEventListener("click", () => {
      if (this.fetchIndex === 1) this.fetchReviews();
    });
  }

  async fetchReviews(response = null, limit = null) {
    try {
      this.setIsLoading();

      const res = response || youcanjs.product.fetchReviews(this.productId, { limit });
      const items = await res.data();

      if (!items.length) {
        this.empty.removeAttribute("hidden");

        return;
      }
      this.fetchIndex++;

      if (this.fetchIndex > 1) {
        this.setItemsDetail(items);
      } else {
        this.setItems(items);

        if (res.meta.pagination.total > 8) {
          this.showAll.removeAttribute("hidden");
          this.total.textContent = res.meta.pagination.total;
        }
      }
    } catch (error) {
      console.error(error);

      toast.show(error.message, "error");
    } finally {
      this.skeletons.forEach((skeleton) => skeleton.setAttribute("hidden", true));
    }
  }

  setIsLoading() {
    this.skeletons.forEach((skeleton) => skeleton.removeAttribute("hidden"));
  }

  setItems(items) {
    const fragment = new DocumentFragment();

    items.forEach((item) => {
      const review = this.reviewTemplate.content.cloneNode(true);
      const rating = review.querySelector('[ui-reviews="rating"]');
      const content = review.querySelector('[ui-reviews="content"]');
      const author = review.querySelector('[ui-reviews="author"]');

      content.innerHTML = item.content;
      content.title = content.textContent;

      if (item.first_name || item.last_name) {
        const fullname = `${item.first_name || ""} ${item.last_name || ""}`.trim();
        author.textContent = fullname;
        author.title = fullname;
      }

      const filledStar = rating.querySelector('[ui-reviews="filled-star"]');
      const strokeStar = rating.querySelector('[ui-reviews="stroke-star"]');
      for (let index = 0; index < 5; index++) {
        rating.appendChild(item.ratings > index ? filledStar.content.cloneNode(true) : strokeStar.content.cloneNode(true));
      }

      fragment.append(review);
    });

    this.reviews.removeAttribute("hidden");
    this.reviews.replaceChildren(fragment);
  }

  setItemsDetail(items) {
    const fragment = new DocumentFragment();

    items.forEach((item) => {
      const review = this.reviewDetailTemplate.content.cloneNode(true);
      const rating = review.querySelector('[ui-reviews="rating"]');
      const content = review.querySelector('[ui-reviews="content"]');
      const author = review.querySelector('[ui-reviews="author"]');
      const images = review.querySelector('[ui-reviews="images"]');

      item.images_urls?.forEach((src, i) => {
        const img = images.querySelector('[ui-reviews="image"]').content.cloneNode(true);
        img.querySelector("img").src = src;

        images.appendChild(img);
      });

      content.innerHTML = item.content;
      content.title = content.textContent;

      if (item.first_name || item.last_name) {
        const fullname = `${item.first_name || ""} ${item.last_name || ""}`.trim();
        author.textContent = fullname;
        author.title = fullname;
      }

      const filledStar = rating.querySelector('[ui-reviews="filled-star"]');
      const strokeStar = rating.querySelector('[ui-reviews="stroke-star"]');
      for (let index = 0; index < 5; index++) {
        rating.appendChild(item.ratings > index ? filledStar.content.cloneNode(true) : strokeStar.content.cloneNode(true));
      }

      fragment.append(review);
    });

    this.reviewsDetail.removeAttribute("hidden");
    this.reviewsDetail.replaceChildren(fragment);
  }
}

customElements.define("ui-reviews", Reviews);
