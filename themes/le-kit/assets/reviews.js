import { Component } from "@theme/component";
import { showToast } from "@theme/toast";
import { translate } from "@theme/utilities";

const MAX_UPLOAD_MB = 2;

/**
 * Product reviews loaded with youcanjs, and the "write a review" dialog with a `product_review` form.
 *
 * Refs: `list`, `empty`, `count`, `moreButton`, `reviewTemplate`, `starTemplate`,
 * and for the form: `openFormButton`, `dialog`, `upload`, `previews`.
 */
class ReviewsComponent extends Component {
  requiredRefs = ["list", "empty", "reviewTemplate", "starTemplate"];

  connectedCallback() {
    super.connectedCallback();
    const { moreButton, openFormButton, upload, dialog } = this.refs;

    moreButton?.addEventListener("click", () => this.load(), { signal: this.signal });
    openFormButton?.addEventListener("click", () => dialog?.showModal(), { signal: this.signal });
    upload?.addEventListener("change", () => this.#onUpload(), { signal: this.signal });
    dialog?.querySelector("form")?.addEventListener("submit", (event) => {
      /** @type {SubmitEvent} */ (event).submitter?.setAttribute("data-loading", "");
    }, { signal: this.signal });

    if (this.querySelector("[data-review-submitted]")) showToast(this.dataset.submittedMessage ?? "", "success");

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

      this.#upload(file);
    });

    input.value = "";
  }

  /** @param {File} file */
  async #upload(file) {
    const token = /** @type {HTMLInputElement | null} */ (this.querySelector("input[name='_token']"))?.value ?? "";
    const body = new FormData();
    body.append("image", file);
    body.append("_token", token);

    try {
      const response = await fetch("/upload/image", { method: "POST", body, headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message ?? response.statusText);
      this.#addPreview((await response.json()).link);
    } catch (error) {
      showToast(/** @type {Error} */ (error).message, "error");
    }
  }

  /** @param {string} link */
  #addPreview(link) {
    const preview = document.createElement("div");
    preview.className = "review-form__preview";

    const remove = Object.assign(document.createElement("button"), {
      type: "button",
      className: "button button--secondary button--icon button--sm",
      textContent: "×",
    });
    remove.setAttribute("aria-label", "×");
    remove.addEventListener("click", () => preview.remove());

    preview.append(
      Object.assign(document.createElement("img"), { src: link, alt: "" }),
      Object.assign(document.createElement("input"), { type: "hidden", name: "images[]", value: link }),
      remove,
    );
    this.refs.previews?.append(preview);
  }
}

if (!customElements.get("ui-reviews")) customElements.define("ui-reviews", ReviewsComponent);
