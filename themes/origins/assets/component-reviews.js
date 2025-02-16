class Reviews extends HTMLElement {
  static observedAttributes = ["product-id"];

  constructor() {
    super();
    this.productId = this.getAttribute("product-id");

    this.total = this.querySelector("[data-total]");
    this.skeleton = this.querySelector("[data-skeleton]");
    this.container = this.querySelector("[data-container]");
    this.percentages = this.querySelectorAll("[data-graph] [data-percentage]");

    this.filter = this.querySelector("[data-filters]");
    this.filterOptions = this.filter.querySelectorAll("input:not(:first-child)");
  }

  connectedCallback() {
    this._render();
  }

  async _render() {
    try {
      const response = await youcanjs.product.fetchReviews(this.productId).data();

      response.length && this.setupItems(response);
    } catch (error) {
      console.error(error);

      this.productId && toast.show(error.message, "error");
    } finally {
      this.skeleton.remove();
    }
  }

  setupItems(items) {
    const ITEMS_WITH_CONTENT = items.filter((item) => Boolean(item.content));
    const TOTAL_ITEMS = ITEMS_WITH_CONTENT.length;

    if (TOTAL_ITEMS) {
      ITEMS_WITH_CONTENT.forEach((item) => this.createItem(item));
      TOTAL_ITEMS > 1 && this.parentElement.style.setProperty("--items-columns", TOTAL_ITEMS);
    } else {
      this.filter.remove();
    }

    this.setTotalReviews(items.length);
    this.setPercentageReviews(items);
    this.disableInactiveFilters(ITEMS_WITH_CONTENT);

    this.skeleton.remove();
  }

  setTotalReviews(total) {
    this.total.textContent = total;
  }

  setPercentageReviews(reviews) {
    this.percentages.forEach((item, i) => {
      const percentage = reviews.filter((r) => r.ratings === i + 1).length / reviews.length;

      item.textContent = `${percentage.toFixed(2) * 100}%`;
      item.previousElementSibling.style.setProperty("--rating-count", percentage * 100);
    });
  }

  disableInactiveFilters(reviews) {
    this.filterOptions.forEach((filter, i) => {
      filter.disabled = !reviews.find((review) => review.ratings === i + 1);
    });
  }

  createItem({ first_name, last_name, content, ratings, images_urls, created_at }) {
    const template = this.querySelector("[data-review]");
    const review = template.content.cloneNode(true);

    review.firstElementChild.dataset.ratings = ratings;

    this.setItemAuthor(review, { first_name, last_name });
    this.setItemImages(review, images_urls);
    this.setItemContent(review, content);
    this.setItemDate(review, created_at);
    this.setItemRating(review, ratings);

    this.container.appendChild(review);
  }

  setItemAuthor(element, { first_name, last_name }) {
    const author = element.querySelector("[data-author]");

    if (first_name || last_name) {
      author.textContent = `${first_name || ""} ${last_name || ""}`;
    }
  }

  setItemContent(element, text) {
    const content = element.querySelector("[data-content]");
    content.innerHTML = text;
  }

  setItemRating(element, ratings) {
    const stars = element.querySelectorAll("[data-rating] svg");

    stars.forEach((star, i) => {
      if (i + 1 > ratings) star.style.fill = "none";
    });
  }

  setItemDate(element, created_at) {
    const date = element.querySelector("[data-date]");
    date.textContent = relativeTime(new Date(created_at));
  }

  setItemImages(element, urls) {
    const FIRST_SHOWED_IMAGES = 3;
    const TOTAL_URLs = urls.length;
    const images = element.querySelector("[data-images]");

    const listing = () => {
      urls.forEach((src) => {
        const template = images.querySelector("[data-img]");
        const image = template.content.cloneNode(true);

        image.querySelector("img").src = src;
        images.firstElementChild.prepend(image);
      });
    };

    const preview = () => {
      const buttons = images.querySelectorAll("[data-image]");
      const previewImg = images.querySelector("[data-image-preview]");

      buttons.forEach((img_button) => {
        img_button.addEventListener("click", () => {
          previewImg.src = img_button.querySelector("img").src;
        });
      });
    };

    const showMore = () => {
      if (FIRST_SHOWED_IMAGES >= TOTAL_URLs) return;

      const count = images.querySelector("[data-count]");
      count.textContent = `+${TOTAL_URLs - FIRST_SHOWED_IMAGES}`;
    };

    TOTAL_URLs ? (listing(), preview(), showMore()) : images.remove();
  }
}

customElements.define("yc-reviews", Reviews);
