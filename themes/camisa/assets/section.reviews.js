class Reviews extends HTMLElement {
  static observedAttributes = ["product-id"];

  constructor() {
    super();
    this.productId = this.getAttribute("product-id");

    this.totals = document.querySelectorAll('[ui-reviews="total"]');
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
    this.totals?.forEach((t) => (t.textContent = total));
  }

  setStates(reviews) {
    this.states?.querySelectorAll("progress").forEach((item, i) => {
      const percentage = reviews.filter((r) => r.ratings === i + 1).length / reviews.length;

      item.value = percentage * 100;
    });
  }

  setItems(items) {
    const createStars = (count, filledTpl, emptyTpl) => {
      const frag = document.createDocumentFragment();
      for (let i = 0; i < 5; i++) {
        frag.appendChild((count > i ? filledTpl : emptyTpl).content.cloneNode(true));
      }
      return frag;
    };

    const setAuthor = (element, item) => {
      if (item.first_name || item.last_name) {
        element.textContent = `${item.first_name || ""} ${item.last_name || ""}`.trim();
      }
    };

    const renderImages = (tpl, container, urls = []) => {
      urls.forEach((src) => {
        const img = tpl.content.cloneNode(true);
        img.querySelector("img").src = src;
        container.appendChild(img);
      });
    };

    items.forEach((item, i) => {
      const review = this.item.content.cloneNode(true);

      const rating = review.querySelector('[ui-reviews="item-rating"]');
      const content = review.querySelector('[ui-reviews="item-content"]');
      const author = review.querySelector('[ui-reviews="item-author"]');
      const imageTpl = review.querySelector('[ui-reviews="item-image"]');

      const filledStar = review.querySelector('[ui-reviews="filled-star"]');
      const strokeStar = review.querySelector('[ui-reviews="stroke-star"]');

      content.innerHTML = item.content;
      setAuthor(author, item);
      rating.appendChild(createStars(item.ratings, filledStar, strokeStar));

      renderImages(imageTpl, imageTpl.parentElement, item.images_urls);

      const modal = review.querySelector("[popover]");
      const trigger = review.querySelector("[popovertarget]");

      const id = `review-${i + 1}`;
      modal.id = id;
      trigger.setAttribute("popovertarget", id);

      const detailTpl = modal.querySelector('[ui-reviews="item-detail"]');
      const detail = detailTpl.content.cloneNode(true);

      const ratingDetail = detail.querySelector('[ui-reviews="item-detail-rating"]');
      const contentDetail = detail.querySelector('[ui-reviews="item-detail-content"]');
      const authorDetail = detail.querySelector('[ui-reviews="item-detail-author"]');

      const filledStarDetail = detail.querySelector('[ui-reviews="detail-filled-star"]');
      const strokeStarDetail = detail.querySelector('[ui-reviews="detail-stroke-star"]');

      const imageDetailTpl = modal.querySelector('[ui-reviews="item-detail-image"]');

      contentDetail.innerHTML = item.content;
      setAuthor(authorDetail, item);
      ratingDetail.appendChild(createStars(item.ratings, filledStarDetail, strokeStarDetail));

      modal.querySelector(".content").appendChild(detail);

      renderImages(imageDetailTpl, imageDetailTpl.parentElement, item.images_urls);

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
