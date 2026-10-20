import { Component } from "@theme/component";

/**
 * Progressive enhancement over a CSS scroll-snap track.
 *
 * Refs: `track` (scroll container), `previous`, `next`, `dots[]`, `counter`.
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
    next?.addEventListener("click", () => this.goTo(this.index + this.perPage), { signal });
    dots.forEach((/** @type {HTMLElement} */ dot, /** @type {number} */ index) => dot.addEventListener("click", () => this.goTo(index), { signal }));

    track.addEventListener(
      "scroll",
      () => {
        cancelAnimationFrame(this.#frame ?? 0);
        this.#frame = requestAnimationFrame(() => this.#syncIndex());
      },
      { passive: true, signal },
    );

    this.#update();

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

  #update() {
    const { previous, next, dots = [], counter } = this.refs;
    const loop = this.hasAttribute("autoplay");

    if (previous) previous.disabled = this.index <= 0 && !loop;
    if (next) next.disabled = this.index >= this.#maxIndex && !loop;
    dots.forEach((/** @type {HTMLElement} */ dot, /** @type {number} */ index) => dot.setAttribute("aria-current", String(index === this.index)));
    if (counter) counter.textContent = String(this.index + 1);
    this.items.forEach((item, index) => item.toggleAttribute("data-active", index === this.index));

    this.dispatchEvent(new CustomEvent("carousel:change", { detail: { index: this.index } }));
  }
}

if (!customElements.get("ui-carousel")) customElements.define("ui-carousel", CarouselComponent);
