/*
 * <ui-carousel>: progressive enhancement over a CSS scroll-snap track.
 *
 * Markup:
 *   [data-carousel-track]  scroll container
 *   [data-carousel-item]   slides (children of the track)
 *   [data-carousel-prev]   / [data-carousel-next] arrows (optional)
 *   [data-carousel-dot]    one per slide (optional), aria-current on the active one
 *
 * Attributes: autoplay, interval (ms), data-static (grid layout, no behaviour)
 */
if (!customElements.get("ui-carousel")) {
  class Carousel extends HTMLElement {
    connectedCallback() {
      if (this.hasAttribute("data-static")) return;

      this.track = this.querySelector("[data-carousel-track]");
      if (!this.track) return;

      this.index = 0;
      this.prev = this.querySelector("[data-carousel-prev]");
      this.next = this.querySelector("[data-carousel-next]");
      this.dots = [...this.querySelectorAll("[data-carousel-dot]")];

      this.prev?.addEventListener("click", () => this.goTo(this.index - this.perPage));
      this.next?.addEventListener("click", () => this.goTo(this.index + this.perPage));
      this.dots.forEach((dot, i) => dot.addEventListener("click", () => this.goTo(i)));

      this.onScroll = () => {
        cancelAnimationFrame(this.frame);
        this.frame = requestAnimationFrame(() => this.syncIndex());
      };
      this.track.addEventListener("scroll", this.onScroll, { passive: true });

      this.update();

      if (this.hasAttribute("autoplay") && this.items.length > 1) {
        this.play();
        this.addEventListener("mouseenter", () => this.pause());
        this.addEventListener("mouseleave", () => this.play());
        this.addEventListener("focusin", () => this.pause());
      }
    }

    disconnectedCallback() {
      this.pause();
      this.track?.removeEventListener("scroll", this.onScroll);
    }

    get items() {
      return [...this.track.children].filter((item) => item.hasAttribute("data-carousel-item"));
    }

    get isRtl() {
      return document.documentElement.dir === "rtl";
    }

    get perPage() {
      const styles = getComputedStyle(this);
      const isDesktop = window.matchMedia("(min-width: 750px)").matches;
      const perPage = parseFloat(styles.getPropertyValue(isDesktop ? "--per-page" : "--per-page-mobile"));

      return Math.max(1, Math.floor(perPage || 1));
    }

    get maxIndex() {
      return Math.max(0, this.items.length - this.perPage);
    }

    goTo(index) {
      const items = this.items;
      if (!items.length) return;

      const loop = this.hasAttribute("autoplay");
      let target = index;

      if (target > this.maxIndex) target = loop && this.index >= this.maxIndex ? 0 : this.maxIndex;
      if (target < 0) target = loop && this.index <= 0 ? this.maxIndex : 0;

      const item = items[target];
      const first = items[0];
      const offset = this.isRtl
        ? item.offsetLeft + item.offsetWidth - (first.offsetLeft + first.offsetWidth)
        : item.offsetLeft - first.offsetLeft;

      this.track.scrollTo({ left: offset, behavior: "smooth" });
      this.index = target;
      this.update();
    }

    syncIndex() {
      const items = this.items;
      if (!items.length) return;

      const trackRect = this.track.getBoundingClientRect();
      let closest = 0;
      let closestDistance = Infinity;

      items.forEach((item, i) => {
        const rect = item.getBoundingClientRect();
        const distance = this.isRtl ? Math.abs(rect.right - trackRect.right) : Math.abs(rect.left - trackRect.left);

        if (distance < closestDistance) {
          closestDistance = distance;
          closest = i;
        }
      });

      if (closest !== this.index) {
        this.index = closest;
        this.update();
      }
    }

    update() {
      const atStart = this.index <= 0;
      const atEnd = this.index >= this.maxIndex;
      const loop = this.hasAttribute("autoplay");

      if (this.prev) this.prev.disabled = atStart && !loop;
      if (this.next) this.next.disabled = atEnd && !loop;

      this.dots.forEach((dot, i) => dot.setAttribute("aria-current", String(i === this.index)));
      this.items.forEach((item, i) => item.toggleAttribute("data-active", i === this.index));

      this.dispatchEvent(new CustomEvent("carousel:change", { detail: { index: this.index } }));
    }

    play() {
      this.pause();
      const interval = parseInt(this.getAttribute("interval"), 10) || 5000;
      this.timer = setInterval(() => this.goTo(this.index + 1), interval);
    }

    pause() {
      clearInterval(this.timer);
    }
  }

  customElements.define("ui-carousel", Carousel);
}
