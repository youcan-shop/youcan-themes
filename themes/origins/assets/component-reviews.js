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

      toast.show(error.message, "error");
    } finally {
      this.skeleton.remove();
    }
  }

  setupItems(items) {
    const ITEMS_WITH_CONTENT = items.filter((item) => !!item.content);
    const totalItems = ITEMS_WITH_CONTENT.length;

    if (totalItems) {
      ITEMS_WITH_CONTENT.forEach((item) => this.createItem(item));
      totalItems > 1 && this.parentElement.style.setProperty("--items-columns", totalItems);
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

  createItem(data) {
    const template = this.querySelector("[data-review]");
    const review = template.content.cloneNode(true);

    const { first_name, last_name, images_urls, ratings, created_at } = data;
    review.firstElementChild.dataset.ratings = ratings;

    const [author, content, rating, date, images] = review.querySelectorAll("[data-review-item]");

    this.setItemAuthor(author, { first_name, last_name });
    this.setItemContent(content, data.content);
    this.setItemImages(images, images_urls);
    this.setItemRating(rating, ratings);
    this.setItemDate(date, created_at);

    this.container.appendChild(review);
  }

  setItemAuthor(authorElement, { first_name, last_name }) {
    if (first_name || last_name) {
      authorElement.textContent = `${first_name || ""} ${last_name || ""}`;
    }
  }

  setItemContent(contentElement, content) {
    contentElement.innerHTML = content;
  }

  setItemRating(ratingElement, ratings) {
    const stars = ratingElement.querySelectorAll("svg");

    stars.forEach((star, i) => {
      if (i + 1 > ratings) star.style.fill = "none";
    });
  }

  setItemDate(dateElement, created_at) {
    dateElement.textContent = this.relativeTime(new Date(created_at));
  }

  setItemImages(imagesElement, urls) {
    const FIRST_SHOWED_IMAGES = 3;
    const TOTAL_URLs = urls.length;

    const listImages = () => {
      urls.forEach((src) => {
        const template = imagesElement.querySelector("[data-img]");
        const image = template.content.cloneNode(true);

        image.querySelector("img").src = src;
        imagesElement.firstElementChild.prepend(image);
      });
    };

    const previewImage = () => {
      const buttons = imagesElement.querySelectorAll("[data-image]");
      const previewImg = imagesElement.querySelector("[data-image-preview]");

      buttons.forEach((img_button) => {
        img_button.addEventListener("click", () => {
          previewImg.src = img_button.querySelector("img").src;
        });
      });
    };

    const showMoreButton = () => {
      if (FIRST_SHOWED_IMAGES >= TOTAL_URLs) return;

      const count = imagesElement.querySelector("[data-count]");
      count.textContent = `+${TOTAL_URLs - FIRST_SHOWED_IMAGES}`;
    };

    if (TOTAL_URLs) {
      listImages();
      previewImage();
      showMoreButton();
    } else {
      imagesElement.remove();
    }
  }

  relativeTime(date) {
    const diffInSeconds = Math.floor((new Date() - date) / 1000);

    const SECOND = 1;
    const MINUTE = 60 * SECOND;
    const HOUR = 60 * MINUTE;
    const DAY = 24 * HOUR;
    const WEEK = 7 * DAY;
    const MONTH = 30 * DAY;
    const YEAR = 365 * DAY;

    const units = [
      ["year", YEAR],
      ["month", MONTH],
      ["week", WEEK],
      ["day", DAY],
      ["hour", HOUR],
      ["minute", MINUTE],
      ["second", SECOND],
    ];

    for (const [unit, seconds] of units) {
      const interval = Math.floor(diffInSeconds / seconds);
      if (interval >= 1)
        return new Intl.RelativeTimeFormat(CUSTOMER_LOCALE, { numeric: "auto" }).format(
          -interval,
          unit,
        );
    }

    const justNow = new Intl.RelativeTimeFormat(CUSTOMER_LOCALE, { numeric: "auto" }).format(
      0,
      "second",
    );

    return justNow;
  }
}

customElements.define("yc-reviews", Reviews);
