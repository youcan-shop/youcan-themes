if (!customElements.get("ui-carousel")) {
  class Carousel extends HTMLElement {
    static observedAttributes = ["autoplay", "interval"];

    constructor() {
      super();

      this.index = 0;
      this.interval = null;
      this.ignoreScroll = false;

      this.wrapper = this.querySelector('[ui-carousel="wrapper"]');
      this.slides = this.querySelectorAll('[ui-carousel="item"]');
      this.arrows = {
        previous: this.querySelector('[ui-carousel="arrow-previous"]'),
        next: this.querySelector('[ui-carousel="arrow-next"]'),
      };
      this.markers = this.querySelectorAll('[ui-carousel="marker"]');

      this.TOTAL = this.slides.length;
      this.INTERVAL_DURATION = parseInt(this.getAttribute("interval")) || 3000;
    }

    connectedCallback() {
      this._render();
    }

    _render() {
      if (this.arrows.previous && this.arrows.next) {
        this.setArrowsState();

        this.arrows.previous.addEventListener("click", () => this.swipe(--this.index));
        this.arrows.next.addEventListener("click", () => this.swipe(++this.index));
      }

      this.markers?.forEach((marker, i) => {
        marker.addEventListener("click", () => this.swipe(i));
      });

      this.wrapper.addEventListener("scroll", () => this.onScroll());

      if (this.hasAttribute("autoplay")) {
        this.autoPlay();
        this.addEventListener("mouseenter", () => clearInterval(this.interval));
        this.addEventListener("mouseleave", () => this.autoPlay());
      }
    }

    swipe(index) {
      this.ignoreScroll = true;
      this.wrapper.scrollTo({
        left: (this.wrapper.scrollWidth * index) / this.TOTAL,
        behavior: "smooth",
      });

      this.setIndex(index);
      setTimeout(() => (this.ignoreScroll = false), 300);
    }

    setIndex(index) {
      this.index = index;

      this.markers?.forEach((marker, i) => {
        marker.setAttribute("aria-selected", index === i);
      });

      if (this.arrows.previous && this.arrows.next) this.setArrowsState();
    }

    setArrowsState() {
      this.arrows.previous.disabled = !this.canGoPrevious();
      this.arrows.next.disabled = !this.canGoNext();
    }

    canGoPrevious() {
      return this.index > 0;
    }

    canGoNext() {
      return this.index + this.perPage < this.TOTAL;
    }

    onScroll() {
      if (this.ignoreScroll) return;

      const slideWidth = this.wrapper.scrollWidth / this.TOTAL;
      const newIndex = Math.round(this.wrapper.scrollLeft / slideWidth);

      if (newIndex !== this.index) {
        this.setIndex(newIndex);
      }
    }

    autoPlay() {
      this.interval = setInterval(() => {
        this.swipe(this.canGoNext() ? ++this.index : -1);
      }, this.INTERVAL_DURATION);
    }

    get perPage() {
      return Number(getComputedStyle(this).getPropertyValue("--per-page")) || 1;
    }
  }

  customElements.define("ui-carousel", Carousel);
}
