if (!customElements.get("ui-carousel")) {
  class Carousel extends HTMLElement {
    static observedAttributes = ["autoplay", "interval"];

    constructor() {
      super();

      this.index = 0;
      this.interval = null;
      this.ignoreScroll = false;

      // Sections reuse <ui-carousel> as a plain grid when the slideshow is off;
      // in that mode there's no wrapper and no carousel behavior to wire up.
      this.wrapper = this.querySelector('[ui-carousel="wrapper"]');
      if (!this.wrapper) return;

      this.slides = this.wrapper.querySelectorAll(':scope > [ui-carousel="item"]');
      this.arrows = {
        previous: this.querySelector('[ui-carousel="arrow-previous"]'),
        next: this.querySelector('[ui-carousel="arrow-next"]'),
      };
      this.markers = this.querySelectorAll('[ui-carousel="marker"]');

      this.TOTAL = this.slides.length;
      this.INTERVAL_DURATION = parseInt(this.getAttribute("interval")) || 3000;
    }

    connectedCallback() {
      if (!this.wrapper) return;

      this._render();
    }

    _render() {
      if (this.arrows.previous && this.arrows.next) {
        this.setArrowsState();

        this.arrows.previous.addEventListener("click", () => {
          const prevPage = Math.floor((this.index - 1) / this.perPage);
          this.swipe(Math.max(0, prevPage * this.perPage));
        });
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
        left: ((this.wrapper.scrollWidth * index) / this.TOTAL) * this.isRTL,
        behavior: "smooth",
      });

      this.setIndex(index);

      const scrollEnd = () => {
        const currentIndex = Math.round(this.wrapper.scrollLeft / this.slideWidth);

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
        const selected = currentPage === i;
        marker.setAttribute("aria-selected", selected);
        if (selected) this.scrollMarkerIntoView(marker);
      });

      if (this.arrows.previous && this.arrows.next) this.setArrowsState();
    }

    // When the markers strip overflows, keep the selected marker visible without scrolling the page.
    scrollMarkerIntoView(marker) {
      const container = marker.parentElement;
      if (!container || container.scrollWidth <= container.clientWidth) return;

      const containerRect = container.getBoundingClientRect();
      const markerRect = marker.getBoundingClientRect();
      if (markerRect.left >= containerRect.left && markerRect.right <= containerRect.right) return;

      const delta = markerRect.left + markerRect.width / 2 - (containerRect.left + containerRect.width / 2);

      container.style.scrollSnapType = "none";
      container.scrollBy({ left: delta, behavior: "smooth" });

      const restoreSnap = () => (container.style.scrollSnapType = "");
      container.addEventListener("scrollend", restoreSnap, { once: true });
      clearTimeout(this._snapRestoreTimer);
      this._snapRestoreTimer = setTimeout(restoreSnap, 600);
    }

    updateMarkers() {
      const totalPages = Math.ceil(this.TOTAL / this.perPage);

      this.markers?.forEach((marker, i) => {
        marker.setAttribute("aria-hidden", i >= totalPages);
      });

      const lastPageStart = this.TOTAL - this.perPage;
      this.slides.forEach((slide, i) => {
        const isRegularPageStart = i % this.perPage === 0 && i < lastPageStart;
        slide.toggleAttribute("data-snap", isRegularPageStart || i === lastPageStart);
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

      const newIndex = Math.round(this.wrapper.scrollLeft / this.slideWidth);

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
  }

  customElements.define("ui-carousel", Carousel);
}
