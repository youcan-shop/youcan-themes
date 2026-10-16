/*
 * <ui-reviews>: loads product reviews with youcanjs and handles the "write a review" dialog.
 */
if (!customElements.get("ui-reviews")) {
  class Reviews extends HTMLElement {
    static MAXIMUM_FILE_SIZE_MB = 2;

    connectedCallback() {
      this.productId = this.getAttribute("product-id");
      this.limit = parseInt(this.dataset.limit, 10) || 6;
      this.list = this.querySelector("[data-reviews-list]");
      this.more = this.querySelector("[data-reviews-more]");
      this.empty = this.querySelector("[data-reviews-empty]");
      this.count = this.querySelector("[data-reviews-count]");
      this.template = this.querySelector("template[data-review-template]");
      this.star = this.querySelector("template[data-star-template]");
      this.dialog = this.querySelector("[data-review-dialog]");
      this.form = this.querySelector("[data-review-form]");
      this.images = [];

      this.more?.addEventListener("click", () => this.load(null));
      this.querySelector("[data-open-review-form]")?.addEventListener("click", () => this.dialog?.showModal());
      this.form?.addEventListener("submit", (event) => this.submit(event));
      this.querySelector("[data-review-upload]")?.addEventListener("change", (event) => this.onUpload(event));

      this.load(this.limit);
    }

    async load(limit) {
      if (!window.youcanjs) return;

      this.more?.setAttribute("data-loading", "");

      try {
        const response = youcanjs.product.fetchReviews(this.productId, limit ? { limit } : {});
        const items = await response.data();
        const total = response.meta?.pagination?.total ?? items.length;

        this.render(items);
        this.empty.hidden = items.length > 0;
        this.more.hidden = !limit || total <= items.length;

        if (total > 0 && this.count) {
          this.count.hidden = false;
          this.count.textContent = `(${total})`;
        }
      } catch (error) {
        console.error(error);
        this.list.replaceChildren();
        this.empty.hidden = false;
      } finally {
        this.more?.removeAttribute("data-loading");
      }
    }

    render(items) {
      const fragment = new DocumentFragment();

      items.forEach((item) => {
        const review = this.template.content.cloneNode(true);
        const stars = review.querySelector("[data-review-stars]");
        const content = review.querySelector("[data-review-content]");
        const author = review.querySelector("[data-review-author]");
        const images = review.querySelector("[data-review-images]");

        for (let i = 0; i < 5; i++) {
          const star = this.star.content.cloneNode(true);
          if (item.ratings <= i) star.firstElementChild.classList.add("reviews__star--empty");
          stars.append(star);
        }
        review.querySelector("[data-review-rating-label]").textContent = `${item.ratings}/5`;

        content.innerHTML = item.content ?? "";

        const name = `${item.first_name ?? ""} ${item.last_name ?? ""}`.trim();
        if (name) author.textContent = name;

        if (item.images_urls?.length) {
          images.hidden = false;
          item.images_urls.forEach((src) => {
            const img = document.createElement("img");
            img.src = src;
            img.alt = "";
            img.loading = "lazy";
            images.append(img);
          });
        }

        fragment.append(review);
      });

      this.list.replaceChildren(fragment);
    }

    onUpload(event) {
      [...event.target.files].forEach((file) => {
        if (file.size / 1024 / 1024 > Reviews.MAXIMUM_FILE_SIZE_MB) {
          toast?.show(window.errorStrings.large_file.replace("[file]", `"${file.name}"`), "error");
          return;
        }

        const reader = new FileReader();
        reader.onload = () => this.addPreview(reader.result);
        reader.readAsDataURL(file);
      });

      event.target.value = "";
    }

    addPreview(source) {
      this.images.push(source);

      const preview = document.createElement("div");
      preview.className = "review-form__preview";

      const img = document.createElement("img");
      img.src = source;
      img.alt = "";

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "button button--secondary button--icon button--sm";
      remove.setAttribute("aria-label", "×");
      remove.textContent = "×";
      remove.addEventListener("click", () => {
        this.images = this.images.filter((image) => image !== source);
        preview.remove();
      });

      preview.append(img, remove);
      this.querySelector("[data-review-previews]").append(preview);
    }

    async submit(event) {
      event.preventDefault();

      const data = new FormData(this.form);
      const button = this.form.querySelector('button[type="submit"]');

      button.setAttribute("data-loading", "");

      try {
        await youcanjs.product.submitReview(this.productId, {
          images: this.images,
          first_name: data.get("first_name"),
          last_name: data.get("last_name"),
          email: data.get("email"),
          content: data.get("content"),
          ratings: Number(data.get("rating")),
        });

        this.form.reset();
        this.images = [];
        this.querySelectorAll(".review-form__preview").forEach((preview) => preview.remove());
        this.dialog.close();

        toast?.show(window.successStrings?.review_submitted ?? "", "success");
      } catch (error) {
        console.error(error);
        toast?.show(error.meta?.fields?.content?.[0] ?? error.message, "error");
      } finally {
        button.removeAttribute("data-loading");
      }
    }
  }

  customElements.define("ui-reviews", Reviews);
}
