import { Component } from "@theme/component";

/**
 * Progressive enhancement over a CSS scroll-snap track.
 *
 * Refs: `track` (scroll container), `previous`, `next`, `dots[]`, `counter`, `progress` (scroll position bar),
 * `nextPreview` with `nextImage` and `nextTitle` (a card showing the next slide's image and first heading).
 * Slides are the track children with `data-carousel-item` (or every child with `data-all-items`).
 * Attributes: `autoplay`, `interval` (ms), `data-static` (grid layout, no behaviour).
 *
 * @fires CustomEvent#carousel:change
 */
export class CarouselComponent extends Component {
  index = 0;

  /** @type {number | undefined} */
  #timer;

  /** @type {number | undefined} */
  #frame;

  connectedCallback() {
    super.connectedCallback();
    if (this.hasAttribute("data-static") || !this.refs.track) return;

    const { signal } = this;
    const { previous, next, dots = [], track } = this.refs;

    previous?.addEventListener("click", () => this.goTo(this.index - this.perPage), { signal });
    this.refs.nextPreview?.addEventListener("click", () => this.goTo((this.index + 1) % this.items.length), { signal });
    next?.addEventListener("click", () => this.goTo(this.index + this.perPage), { signal });
    dots.forEach((/** @type {HTMLElement} */ dot, /** @type {number} */ index) => dot.addEventListener("click", () => this.goTo(index), { signal }));
    this.refs.progress?.addEventListener("click", (event) => this.#seek(event), { signal });

    track.addEventListener(
      "scroll",
      () => {
        cancelAnimationFrame(this.#frame ?? 0);
        this.#frame = requestAnimationFrame(() => {
          this.#syncIndex();
          this.#updateProgress();
        });
      },
      { passive: true, signal },
    );

    this.#update();
    if (this.refs.progress) new ResizeObserver(() => this.#updateProgress()).observe(track);

    if (this.hasAttribute("autoplay") && this.items.length > 1) {
      this.play();
      this.addEventListener("mouseenter", () => this.pause(), { signal });
      this.addEventListener("mouseleave", () => this.play(), { signal });
      this.addEventListener("focusin", () => this.pause(), { signal });
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.pause();
  }

  /** @returns {HTMLElement[]} */
  get items() {
    const children = [...this.refs.track.children];
    return this.hasAttribute("data-all-items") ? children : children.filter((item) => item.hasAttribute("data-carousel-item"));
  }

  get perPage() {
    const property = window.matchMedia("(min-width: 750px)").matches ? "--per-page" : "--per-page-mobile";
    return Math.max(1, Math.floor(parseFloat(getComputedStyle(this).getPropertyValue(property)) || 1));
  }

  get #isRtl() {
    return document.documentElement.dir === "rtl";
  }

  get #maxIndex() {
    return Math.max(0, this.items.length - this.perPage);
  }

  /** @param {number} index */
  goTo(index) {
    const items = this.items;
    if (!items.length) return;

    const loop = this.hasAttribute("autoplay");
    let target = index;
    if (target > this.#maxIndex) target = loop && this.index >= this.#maxIndex ? 0 : this.#maxIndex;
    if (target < 0) target = loop && this.index <= 0 ? this.#maxIndex : 0;

    const item = items[target];
    const first = items[0];
    const left = this.#isRtl ? item.offsetLeft + item.offsetWidth - (first.offsetLeft + first.offsetWidth) : item.offsetLeft - first.offsetLeft;

    this.refs.track.scrollTo({ left, behavior: "smooth" });
    this.index = target;
    this.#update();
  }

  play() {
    this.pause();
    const interval = parseInt(this.getAttribute("interval") ?? "", 10) || 5000;
    this.#timer = setInterval(() => this.goTo(this.index + 1), interval);
  }

  pause() {
    clearInterval(this.#timer);
  }

  #syncIndex() {
    const trackRect = this.refs.track.getBoundingClientRect();
    let closest = 0;
    let closestDistance = Infinity;

    this.items.forEach((item, index) => {
      const rect = item.getBoundingClientRect();
      const distance = this.#isRtl ? Math.abs(rect.right - trackRect.right) : Math.abs(rect.left - trackRect.left);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = index;
      }
    });

    if (closest !== this.index) {
      this.index = closest;
      this.#update();
    }
  }

  #updateNextPreview() {
    const { nextPreview, nextImage, nextTitle } = this.refs;
    if (!nextPreview || this.items.length < 2) return;

    const next = this.items[(this.index + 1) % this.items.length];
    const image = next.querySelector("img");
    const heading = next.querySelector("h1, h2, h3, h4, h5, h6, .h1, .h2, .h3, .h4");

    if (nextImage) this.#swapNextImage(nextImage, image);
    if (nextTitle) nextTitle.textContent = heading?.textContent?.trim() ?? "";
    nextPreview.hidden = false;
  }

  /** Scrolls the track to the clicked point of the progress bar. @param {MouseEvent} event */
  #seek(event) {
    const { track, progress } = this.refs;
    const rect = progress.getBoundingClientRect();
    let ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    if (this.#isRtl) ratio = 1 - ratio;

    const left = ratio * (track.scrollWidth - track.clientWidth);
    track.scrollTo({ left: this.#isRtl ? -left : left, behavior: "smooth" });
  }

  /**
   * Shows the next slide's image once it's decoded, so the card never flashes.
   * @param {HTMLImageElement} target
   * @param {HTMLImageElement | null} image
   */
  #swapNextImage(target, image) {
    if (!image) {
      target.hidden = true;
      delete target.dataset.source;
      return;
    }

    const source = image.srcset || image.src;
    if (target.dataset.source === source) return;
    target.dataset.source = source;

    const loader = new Image();
    loader.sizes = "124px";
    if (image.srcset) loader.srcset = image.srcset;
    loader.src = image.src;
    loader
      .decode()
      .catch(() => {})
      .then(() => {
        if (target.dataset.source !== source) return;
        target.src = loader.currentSrc || image.src;
        target.hidden = false;
      });
  }

  #updateProgress() {
    const { track, progress } = this.refs;
    if (!progress) return;

    const size = track.scrollWidth ? Math.min(1, track.clientWidth / track.scrollWidth) : 1;
    const scrollable = track.scrollWidth - track.clientWidth;
    progress.style.setProperty("--progress-size", String(size));
    progress.style.setProperty("--progress-offset", String(scrollable > 0 ? Math.abs(track.scrollLeft) / scrollable : 0));
    progress.hidden = size >= 1;
  }

  #update() {
    const { previous, next, dots = [], counter } = this.refs;
    const loop = this.hasAttribute("autoplay");

    if (previous) previous.disabled = this.index <= 0 && !loop;
    if (next) next.disabled = this.index >= this.#maxIndex && !loop;
    dots.forEach((/** @type {HTMLElement} */ dot, /** @type {number} */ index) => dot.setAttribute("aria-current", String(index === this.index)));
    if (counter) counter.textContent = String(this.index + 1);
    this.items.forEach((item, index) => {
      item.toggleAttribute("data-active", index === this.index);
      // Lazy images in a horizontal track load late
      if (index === this.index || index === (this.index + 1) % this.items.length) {
        item.querySelectorAll("img[loading='lazy']").forEach((img) => (img.loading = "eager"));
      }
    });
    this.#updateNextPreview();

    this.dispatchEvent(new CustomEvent("carousel:change", { detail: { index: this.index } }));
  }
}

if (!customElements.get("ui-carousel")) customElements.define("ui-carousel", CarouselComponent);
