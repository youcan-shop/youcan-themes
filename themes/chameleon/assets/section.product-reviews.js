if (!customElements.get("ui-product-reviews")) {
  class ProductReviews extends HTMLElement {
    static observedAttributes = ["product-id"];

    constructor() {
      super();

      this.LIMIT_PER_REQUEST = 8;
      this.productId = this.getAttribute("product-id");
      this.skeleton = this.querySelector("[ui-product-reviews-skeleton]");
      this.showMore = this.querySelector("[ui-product-reviews-show-more]");
      this.showModal = this.querySelector("[ui-show-images]");
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

      if (totalItems) itemsWithContent.forEach((item) => this.createItem(item));
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

      const { first_name, last_name, ratings, images_urls } = data;
      if (ratings < 1) return;

      const [content, images, author, stars, rating] = review.querySelectorAll("[ui-product-reviews-item]");

      this.setItemAuthor(author, { first_name, last_name });
      this.setItemContent(content, data.content);
      this.setItemRating(rating, ratings);
      this.setItemStars(stars, ratings);

      if (images_urls.length) {
        this.setItemImages(images, images_urls, `${first_name} ${last_name}`);
      } else {
        images.remove();
      }

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

    setItemImages(imagesElement, images, alt) {
      imagesElement.innerHTML = images.map((img, i) => `<img src="${img}" alt="${alt + "-" + i}" width="100" height="100" />`).join("");

      [...imagesElement.children].forEach((img, i) => img.addEventListener("click", () => this.setupImagesModal(images, i)));
    }

    setIsLoading() {
      this.showMore?.setAttribute("hidden", true);
      this.skeleton.removeAttribute("hidden");
    }

    setupImagesModal(images, activeIndex = 0) {
      const modal = this.showModal;
      const modalState = modal.firstElementChild.dataset;
      const imagesContainer = modal.querySelector("[ui-show-images='images']");
      const closeActions = modal.querySelectorAll("[ui-show-images='close']");
      const arrows = {
        prev: modal.querySelector('[aria-label="previous"]'),
        next: modal.querySelector('[aria-label="next"]'),
      };

      modalState.state = "open";
      imagesContainer.innerHTML = images.map((img) => `<img src="${img}" alt="preview" width="100%" height="100%">`).join("");

      closeActions.forEach((action) => (action.onclick = () => (modalState.state = "closed")));

      let scrollRAF = null;
      let index = activeIndex;
      const total = images.length;

      const isRTL = () => document.dir === "rtl";
      const clamp = (i) => Math.max(0, Math.min(i, total - 1));
      const scrollToIndex = () =>
        imagesContainer.scrollTo({
          left: imagesContainer.clientWidth * index * (isRTL() ? -1 : 1),
        });

      const updateArrows = () => {
        if (arrows.prev) arrows.prev.disabled = index <= 0;
        if (arrows.next) arrows.next.disabled = index >= total - 1;
      };

      const move = (dir) => {
        index = clamp(index + dir);
        scrollToIndex();
        updateArrows();
      };

      if (arrows.prev && arrows.next) {
        arrows.prev.onclick = () => move(-1);
        arrows.next.onclick = () => move(1);
      }

      imagesContainer.onscroll = () => {
        if (scrollRAF) return;
        scrollRAF = requestAnimationFrame(() => {
          const newIndex = clamp(Math.round(Math.abs(imagesContainer.scrollLeft / imagesContainer.clientWidth)));
          if (newIndex !== index) index = newIndex;
          updateArrows();
          scrollRAF = null;
        });
      };

      scrollToIndex();
      updateArrows();
    }
  }

  customElements.define("ui-product-reviews", ProductReviews);
}
