if (!customElements.get("ui-carousel")) {
  class Carousel extends HTMLElement {
    static observedAttributes = ["autoplay", "interval"];

    constructor() {
      super();

      this.index = 0;
      this.interval = null;
      this.ignoreScroll = false;

      this.wrapper = this.querySelector('[ui-carousel="wrapper"]');
      this.slides = this.wrapper.querySelectorAll('& > [ui-carousel="item"]');
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

        this.arrows.previous.addEventListener("click", () => this.swipe(Math.max(0, this.index - this.perPage)));
        this.arrows.next.addEventListener("click", () => this.swipe(Math.min(this.TOTAL - this.perPage, this.index + this.perPage)));
      }

      this.markers?.forEach((marker, i) => {
        marker.addEventListener("click", () => {
          const targetIndex = Math.min(i * this.perPage, Math.max(0, this.TOTAL - this.perPage));

          this.swipe(targetIndex);
        });
      });

      this.slides.forEach((slide, i) => {
        slide.addEventListener("click", () => this.swipe(i));
      });

      this.wrapper.addEventListener("scroll", () => this.onScroll());

      this.updateMarkers();
      window.addEventListener("resize", () => this.updateMarkers());

      if (this.hasAttribute("autoplay")) {
        this.autoPlay();
        this.addEventListener("mouseenter", () => clearInterval(this.interval));
        this.addEventListener("mouseleave", () => this.autoPlay());
      }
    }

    swipe(index) {
      this.ignoreScroll = true;

      this.wrapper.scrollTo({
        [this.orientation === "vertical" ? "left" : "top"]:
          ((this.wrapper[this.orientation === "vertical" ? "scrollWidth" : "scrollHeight"] * index) / this.TOTAL) *
          (this.orientation === "vertical" ? this.isRTL : 1),
        behavior: "smooth",
      });

      this.setIndex(index);

      const scrollEnd = () => {
        const currentIndex = Math.round(
          this.orientation === "vertical" ? this.wrapper.scrollLeft / this.slideWidth : this.wrapper.scrollTop / this.slideHeight,
        );

        if (currentIndex === index) {
          this.ignoreScroll = false;
        } else {
          requestAnimationFrame(scrollEnd);
        }
      };

      requestAnimationFrame(scrollEnd);
    }

    setIndex(index) {
      this.index = index;

      const totalPages = Math.ceil(this.TOTAL / this.perPage);
      let currentPage;

      if (this.perPage >= this.TOTAL) {
        currentPage = 0;
      } else if (index >= this.TOTAL - this.perPage) {
        currentPage = totalPages - 1;
      } else {
        currentPage = Math.floor(index / this.perPage);
      }

      this.markers?.forEach((marker, i) => {
        marker.setAttribute("aria-selected", currentPage === i);
      });

      if (this.arrows.previous && this.arrows.next) this.setArrowsState();
    }

    updateMarkers() {
      const totalPages = Math.ceil(this.TOTAL / this.perPage);

      this.markers?.forEach((marker, i) => {
        marker.setAttribute("aria-hidden", i >= totalPages);
      });

      this.slides.forEach((slide, i) => {
        slide.toggleAttribute("data-snap", i % this.perPage === 0);
      });

      this.setIndex(this.index);
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

      const newIndex = Math.round(
        this.orientation === "vertical" ? this.wrapper.scrollLeft / this.slideWidth : this.wrapper.scrollTop / this.slideHeight,
      );

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

    get isRTL() {
      return document.dir === "rtl" ? -1 : 1;
    }

    get slideWidth() {
      return (this.wrapper.scrollWidth / this.TOTAL) * this.isRTL;
    }

    get slideHeight() {
      return this.wrapper.scrollHeight / this.TOTAL;
    }

    get orientation() {
      return this.wrapper.getAttribute("aria-orientation");
    }
  }

  customElements.define("ui-carousel", Carousel);
}
