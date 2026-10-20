import { Component } from "@theme/component";
import { showToast } from "@theme/toast";
import { translate } from "@theme/utilities";

const MAX_UPLOAD_MB = 2;

/**
 * Product reviews loaded with youcanjs, and the "write a review" dialog.
 *
 * Refs: `list`, `empty`, `count`, `moreButton`, `reviewTemplate`, `starTemplate`,
 * and for the form: `openFormButton`, `dialog`, `form`, `upload`, `previews`.
 */
class ReviewsComponent extends Component {
  requiredRefs = ["list", "empty", "reviewTemplate", "starTemplate"];

  /** @type {string[]} Uploaded images as data URLs */
  images = [];

  connectedCallback() {
    super.connectedCallback();
    const { moreButton, openFormButton, form, upload, dialog } = this.refs;

    moreButton?.addEventListener("click", () => this.load(), { signal: this.signal });
    openFormButton?.addEventListener("click", () => dialog?.showModal(), { signal: this.signal });
    form?.addEventListener("submit", (/** @type {SubmitEvent} */ event) => this.#onSubmit(event), { signal: this.signal });
    upload?.addEventListener("change", () => this.#onUpload(), { signal: this.signal });

    this.load(this.limit);
  }

  get productId() {
    return this.getAttribute("product-id") ?? "";
  }

  get limit() {
    return Number(this.dataset.limit) || 6;
  }

  /** @param {number} [limit] All reviews when omitted */
  async load(limit) {
    if (!window.youcanjs) return;

    const { list, empty, count, moreButton } = this.refs;
    moreButton?.setAttribute("data-loading", "");

    try {
      const response = youcanjs.product.fetchReviews(this.productId, limit ? { limit } : {});
      const reviews = await response.data();
      const total = response.meta?.pagination?.total ?? reviews.length;

      list.replaceChildren(...reviews.map((/** @type {any} */ review) => this.#renderReview(review)));
      empty.hidden = reviews.length > 0;
      if (moreButton) moreButton.hidden = !limit || total <= reviews.length;

      if (count && total > 0) {
        count.hidden = false;
        count.textContent = `(${total})`;
      }
    } catch (error) {
      console.error(error);
      list.replaceChildren();
      empty.hidden = false;
    } finally {
      moreButton?.removeAttribute("data-loading");
    }
  }

  /** @param {any} review */
  #renderReview(review) {
    const fragment = /** @type {DocumentFragment} */ (this.refs.reviewTemplate.content.cloneNode(true));
    const find = (/** @type {string} */ name) => /** @type {HTMLElement} */ (fragment.querySelector(`[data-review-${name}]`));

    for (let i = 0; i < 5; i++) {
      const star = /** @type {DocumentFragment} */ (this.refs.starTemplate.content.cloneNode(true));
      if (review.ratings <= i) star.firstElementChild?.classList.add("reviews__star--empty");
      find("stars").append(star);
    }
    find("rating-label").textContent = `${review.ratings}/5`;
    find("content").innerHTML = review.content ?? "";

    const name = `${review.first_name ?? ""} ${review.last_name ?? ""}`.trim();
    if (name) find("author").textContent = name;

    if (review.images_urls?.length) {
      const images = find("images");
      images.hidden = false;
      images.append(
        ...review.images_urls.map((/** @type {string} */ src) => Object.assign(document.createElement("img"), { src, alt: "", loading: "lazy" })),
      );
    }

    return fragment;
  }

  #onUpload() {
    /** @type {HTMLInputElement} */
    const input = this.refs.upload;

    [...(input.files ?? [])].forEach((file) => {
      if (file.size / 1024 / 1024 > MAX_UPLOAD_MB) {
        showToast(translate("largeFile", { file: `"${file.name}"` }), "error");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => this.#addPreview(/** @type {string} */ (reader.result));
      reader.readAsDataURL(file);
    });

    input.value = "";
  }

  /** @param {string} source */
  #addPreview(source) {
    this.images.push(source);

    const preview = document.createElement("div");
    preview.className = "review-form__preview";

    const remove = Object.assign(document.createElement("button"), {
      type: "button",
      className: "button button--secondary button--icon button--sm",
      textContent: "×",
    });
    remove.setAttribute("aria-label", "×");
    remove.addEventListener("click", () => {
      this.images = this.images.filter((image) => image !== source);
      preview.remove();
    });

    preview.append(Object.assign(document.createElement("img"), { src: source, alt: "" }), remove);
    this.refs.previews?.append(preview);
  }

  /** @param {SubmitEvent} event */
  async #onSubmit(event) {
    event.preventDefault();

    /** @type {HTMLFormElement} */
    const form = this.refs.form;
    const data = new FormData(form);
    const button = form.querySelector("button[type='submit']");
    button?.setAttribute("data-loading", "");

    try {
      await youcanjs.product.submitReview(this.productId, {
        images: this.images,
        first_name: data.get("first_name"),
        last_name: data.get("last_name"),
        email: data.get("email"),
        content: data.get("content"),
        ratings: Number(data.get("rating")),
      });

      form.reset();
      this.images = [];
      this.querySelectorAll(".review-form__preview").forEach((preview) => preview.remove());
      this.refs.dialog?.close();
      showToast(this.dataset.submittedMessage ?? "", "success");
    } catch (/** @type {any} */ error) {
      console.error(error);
      showToast(error.meta?.fields?.content?.[0] ?? error.message, "error");
    } finally {
      button?.removeAttribute("data-loading");
    }
  }
}

if (!customElements.get("ui-reviews")) customElements.define("ui-reviews", ReviewsComponent);
