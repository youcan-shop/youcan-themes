class Reviews extends HTMLElement {
  static observedAttributes = ["product-id"];

  constructor() {
    super();
    this.productId = this.getAttribute("product-id");

    this.total = this.querySelector('[ui-reviews="total"]');
    this.states = this.querySelector('[ui-reviews="states"]');
    this.item = this.querySelector('[ui-reviews="item"]');
    this.skeleton = this.querySelector('[ui-reviews="skeleton"]');
    this.showMore = this.querySelector('[ui-reviews="show-more"]');
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

      const res = response || youcanjs.product.fetchReviews(this.productId, { limit: 8 });
      const items = await res.data();

      if (!items.length) return;

      this.setTotal(res.meta.pagination.total);
      this.setStates(items);
      this.setItems(items);
      this.updatePagination(res);
    } catch (error) {
      console.error(error);

      toast.show(error.message, "error");
    } finally {
      this.skeleton.setAttribute("hidden", true);
    }
  }

  setIsLoading() {
    this.showMore?.setAttribute("hidden", true);
    this.skeleton.removeAttribute("hidden");
  }

  setTotal(total) {
    this.total.textContent = total;
  }

  setStates(reviews) {
    this.states?.querySelectorAll("progress").forEach((item, i) => {
      const percentage = reviews.filter((r) => r.ratings === i + 1).length / reviews.length;

      item.value = percentage * 100;
    });
  }

  setItems(items) {
    items.forEach((item) => {
      if (!item.first_name && !item.last_name) return;

      const review = this.item.content.cloneNode(true);
      const filledStar = review.querySelector('[ui-reviews="filled-star"]');
      const strokeStar = review.querySelector('[ui-reviews="stroke-star"]');

      const rating = review.querySelector('[ui-reviews="item-rating"]');
      const content = review.querySelector('[ui-reviews="item-content"]');
      const author = review.querySelector('[ui-reviews="item-author"]');
      const media = review.querySelector('[ui-reviews="item-media"]');
      const image = review.querySelector('[ui-reviews="item-image"]');

      content.innerHTML = item.content;
      author.textContent = `${item.first_name || ""} ${item.last_name || ""}`.trim();

      for (let index = 0; index < 5; index++) {
        rating.appendChild(item.ratings > index ? filledStar.content.cloneNode(true) : strokeStar.content.cloneNode(true));
      }

      item.images_urls?.forEach((src, i) => {
        if (i === 0) {
          const img = media.content.cloneNode(true);
          img.querySelector("img").src = src;
          img.querySelector("img")?.removeAttribute("hidden");
          media.parentElement.appendChild(img);
        }

        const img = image.content.cloneNode(true);
        img.querySelector("img").src = src;

        image.parentElement.appendChild(img);
      });

      if (!item.images_urls.length) {
        const img = media.content.cloneNode(true);
        img.querySelector("ui-image-fallback")?.removeAttribute("hidden");
        media.parentElement.appendChild(img);
      }

      this.item.parentElement.appendChild(review);
    });
  }

  updatePagination(response) {
    const { total_pages, current_page } = response.meta.pagination;
    if (current_page >= total_pages) {
      this.showMore.setAttribute("hidden", true);

      return;
    }

    this.showMore.removeAttribute("hidden");
    this.showMore.addEventListener("click", () => {
      this.skeleton.removeAttribute("hidden");
      this.fetchReviews(response.next());
    });
  }
}

customElements.define("ui-reviews", Reviews);
