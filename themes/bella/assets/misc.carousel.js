if (!customElements.get("ui-carousel")) {
  class Carousel extends HTMLElement {
    constructor() {
      super();

      this.index = 0;
      this.ignoreScroll = false;
      this.wrapper = this.querySelector('[ui-carousel="wrapper"]');
      this.slides = this.querySelectorAll('[ui-carousel="item"]');
      this.arrows = {
        previous: this.querySelector('[ui-carousel="arrow-previous"]'),
        next: this.querySelector('[ui-carousel="arrow-next"]'),
      };
      this.markers = this.querySelectorAll('[ui-carousel="marker"]');

      this.TOTAL = this.slides.length;
    }

    connectedCallback() {
      this._render();
    }

    _render() {
      if (this.arrows.previous && this.arrows.next) {
        this.canGoNext();
        this.canGoPrevious();

        this.arrows.previous.addEventListener("click", () => this.swipe(--this.index));
        this.arrows.next.addEventListener("click", () => this.swipe(++this.index));
      }

      this.markers?.forEach((marker, i) => {
        marker.addEventListener("click", () => this.swipe(i));
      });

      this.wrapper.addEventListener("scroll", () => this.onScroll());
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

      if (this.arrows.previous && this.arrows.next) {
        this.canGoNext();
        this.canGoPrevious();
      }
    }

    canGoPrevious() {
      this.arrows.previous.disabled = this.index <= 0;
    }

    canGoNext() {
      this.arrows.next.disabled = this.index >= this.TOTAL - 1;
    }

    onScroll() {
      if (this.ignoreScroll) return;

      const slideWidth = this.wrapper.scrollWidth / this.TOTAL;
      const newIndex = Math.round(this.wrapper.scrollLeft / slideWidth);

      if (newIndex !== this.index) {
        this.setIndex(newIndex);
      }
    }

    get perPage() {
      return Number(getComputedStyle(this).getPropertyValue("--per-page")) || 1;
    }
  }

  customElements.define("ui-carousel", Carousel);
}
