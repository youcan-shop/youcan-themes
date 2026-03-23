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

      [...this.markers, ...this.slides].forEach((slide, i) => {
        slide.addEventListener("click", () => {
          const targetIndex = Math.min(i * this.perPage, Math.max(0, this.TOTAL - this.perPage));
          this.swipe(targetIndex);
        });
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
        left: (this.wrapper.scrollWidth * index) / this.TOTAL,
        behavior: "smooth",
      });

      this.setIndex(index);

      const scrollEnd = () => {
        const slideWidth = this.wrapper.scrollWidth / this.TOTAL;
        const currentIndex = Math.round(this.wrapper.scrollLeft / slideWidth);

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
        marker.style.display = i < totalPages ? "" : "none";
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

    get isRTL() {
      return document.dir === "rtl";
    }
  }

  customElements.define("ui-carousel", Carousel);
}
