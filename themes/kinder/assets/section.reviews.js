class Reviews extends HTMLElement {
  static observedAttributes = ["product-id"];

  constructor() {
    super();
    this.productId = this.getAttribute("product-id");

    this.totals = document.querySelectorAll('[ui-reviews="total"]');
    this.starDistro = this.querySelector('[ui-reviews="star-distro"]');
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

      const { total } = res.meta.pagination;
      this.setTotal(total);
      this.setItems(items);
      this.updatePagination(res);

      if (!response) {
        this.fetchStarDistro(total);
      }
    } catch (error) {
      console.error(error);

      toast.show(error.message, "error");
    } finally {
      this.skeleton.setAttribute("hidden", true);
    }
  }

  async fetchStarDistro(total) {
    try {
      const res = youcanjs.product.fetchReviews(this.productId, { limit: total });
      const items = await res.data();
      this.setStarDistro(items);
    } catch (error) {
      console.error(error);
    }
  }

  setIsLoading() {
    this.showMore?.setAttribute("hidden", true);
    this.skeleton.removeAttribute("hidden");
  }

  setTotal(total) {
    this.totals?.forEach((t) => (t.textContent = total));
  }

  setStarDistro(reviews) {
    this.starDistro?.querySelectorAll("progress").forEach((item, i) => {
      const count = reviews.filter((r) => r.ratings === i + 1).length;
      const percentage = count / reviews.length;

      item.value = percentage * 100;

      const starRatingSpan = item.nextElementSibling;
      if (starRatingSpan?.getAttribute("ui-slot") === "star-rating") {
        starRatingSpan.textContent = count;
      }
    });
  }

  setItems(items) {
    items.forEach((item) => {
      const review = this.item.content.cloneNode(true);
      const filledStar = review.querySelector('[ui-reviews="filled-star"]');
      const strokeStar = review.querySelector('[ui-reviews="stroke-star"]');

      const rating = review.querySelector('[ui-reviews="item-rating"]');
      const content = review.querySelector('[ui-reviews="item-content"]');
      const author = review.querySelector('[ui-reviews="item-author"]');
      const media = review.querySelector('[ui-reviews="item-media"]');
      const image = review.querySelector('[ui-reviews="item-image"]');

      content.innerHTML = item.content;

      if (item.first_name || item.last_name) {
        author.textContent = `${item.first_name || ""} ${item.last_name || ""}`.trim();
      }

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
