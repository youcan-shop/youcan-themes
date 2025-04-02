if (!customElements.get("yc-slider")) {
  class Slider extends HTMLElement {
    static observedAttributes = ["autoplay", "interval", "responsive", "per-move"];

    constructor() {
      super();

      this.slider = this.querySelector("[data-slider]");
      this.sliderBox = this.querySelector("[data-slider-box]");
      this.leftArrow = this.querySelector("[data-arrow='left']");
      this.rightArrow = this.querySelector("[data-arrow='right']");
      this.unDraggableLinks = this.querySelectorAll("a[draggable='false']");

      this.index = 0;
      this.startX = 0;
      this.currentX = 0;
      this.interval = null;
      this.isSwiping = false;
      this.isBoundaryAllowed = true;
      this.isRTL = document.dir === "rtl";
      this.isArrowsVisible = this.leftArrow && this.rightArrow;

      this.SWIPE_EVENTS = {
        onSwipe: ["touchmove", "mousemove"],
        startSwipe: ["touchstart", "mousedown"],
        endSwipe: ["touchend", "mouseup", "mouseleave"],
      };

      this.BREAKPOINTS = {
        default: "(min-width: 1024px)",
        lg: "(min-width: 768px) and (max-width: 1024px)",
        md: "(max-width: 768px)",
      };

      this.TOTAL = this.slider.children.length;
      this.GAP = this._getStyle("slider-gap", 0);
      this.PER_PAGE = this.breakpoints().initial();
      this.SPEED = this._getStyle("slider-speed", 600);
      this.INTERVAL_DURATION = parseInt(this.getAttribute("interval")) || 3000;
    }

    connectedCallback() {
      this._render();
    }

    _getStyle(v, default_v) {
      return parseInt(getComputedStyle(this).getPropertyValue(`--${v}`)) || default_v;
    }

    _render() {
      this.swipe();

      this.updateFooterVisibility();

      this.hasAttribute("autoplay") && this.autoPlay();

      this.hasAttribute("responsive") && this.breakpoints().listener();

      if (this.isArrowsVisible && this.hasAttribute("arrows")) {
        this.leftArrow.addEventListener("click", () => this.setIndex(-1));
        this.rightArrow.addEventListener("click", () => this.setIndex(1));
      }

      if (this.hasAttribute("autoplay")) {
        this.addEventListener("mouseenter", () => {
          clearInterval(this.interval);
        });

        this.addEventListener("mouseleave", () => {
          this.autoPlay();
        });
      }
    }

    canGoPrevious() {
      return this.index > 0;
    }

    canGoNext() {
      return this.index + this.PER_PAGE < this.TOTAL;
    }

    autoPlay() {
      this.interval = setInterval(() => {
        if (!this.canGoNext()) this.index = -1;
        this.setIndex(this.canGoNext() ? 1 : -1);
      }, this.INTERVAL_DURATION);
    }

    swipe() {
      Object.entries(this.SWIPE_EVENTS).forEach(([action, types]) => {
        types.forEach((type) => {
          this.sliderBox.addEventListener(
            type,
            (event) => {
              if (typeof this[action] === "function") this[action](event);
            },
            { passive: ["touchstart", "touchmove"].includes(type) },
          );
        });
      });
    }

    startSwipe(event) {
      this.setSwiping(true);
      this.setTransitionDuration(0);

      this.startX = event.touches ? event.touches[0].clientX : event.clientX;
      this.currentX = this.startX;
    }

    onSwipe(event) {
      if (!this.isSwiping) return;

      if (event.target.tagName === "A") this.setLinksAreDraggable(false);

      this.currentX = event.touches ? event.touches[0].clientX : event.clientX;
      let deltaX = this.currentX - this.startX;

      if (this.isRTL) deltaX = -deltaX;

      if ((!this.canGoPrevious() && deltaX > 0) || (!this.canGoNext() && deltaX < 0)) {
        this.isBoundaryAllowed = false;
        this.move(deltaX / 4);
      } else {
        this.isBoundaryAllowed = true;
        this.move(deltaX);
      }
    }

    endSwipe() {
      if (!this.isSwiping) return;

      const deltaX = (this.currentX - this.startX) * (this.isRTL ? -1 : 1);
      const itemWidth = this.sliderBox.offsetWidth / this.PER_PAGE;
      const threshold = this.PER_PAGE === 1 ? 50 : itemWidth / 3;
      const isValidSwipe = this.isBoundaryAllowed && Math.abs(deltaX) > threshold;

      isValidSwipe ? this.setIndex(deltaX > 0 ? -1 : 1) : this.move();

      this.setSwiping(false);
      this.setLinksAreDraggable(true);
      this.setTransitionDuration(this.SPEED);
    }

    breakpoints() {
      const initial = () => {
        let perPage = this._getStyle("slider-per-page");

        if (this.hasAttribute("responsive")) {
          Object.entries(this.BREAKPOINTS).forEach(([key, query]) => {
            if (matchMedia(query).matches) {
              perPage = this._getStyle(key === "default" ? "slider-per-page" : `slider-max-items-${key}`);
            }
          });
        }

        return perPage;
      };

      const listener = () => {
        Object.values(this.BREAKPOINTS).forEach((query) =>
          matchMedia(query).addEventListener("change", (e) => {
            if (e.matches) {
              this.setPerPage(Object.keys(this.BREAKPOINTS).find((key) => this.BREAKPOINTS[key] === query));
            }
          }),
        );
      };

      return { initial, listener };
    }

    move(offset = 0) {
      const translateX = `calc(-${(100 / this.PER_PAGE) * this.index}% - ${(this.GAP / this.PER_PAGE) * this.index}px + ${offset}px)`;

      this.slider.style.insetInlineStart = translateX;
    }

    reset(new_index = this.index) {
      this.index = new_index;
      this.move();

      this.isArrowsVisible && this.setArrows();
    }

    setSwiping(state) {
      this.isSwiping = state;
    }

    setLinksAreDraggable(state) {
      if (!this.unDraggableLinks.length) return;

      this.unDraggableLinks.forEach((link) => (link.style.pointerEvents = state ? "auto" : "none"));
    }

    updateFooterVisibility() {
      this.sliderFooter = this.querySelector("yc-slider-footer");
      if (!this.sliderFooter) return;

      this.sliderFooter.hidden = this.TOTAL <= this.PER_PAGE;
    }

    setArrows() {
      if (!this.hasAttribute("arrows")) return;

      this.rightArrow.disabled = !this.canGoNext();
      this.leftArrow.disabled = !this.canGoPrevious();
    }

    setPerPage = (key) => {
      this.PER_PAGE = this._getStyle(key === "default" ? "slider-per-page" : `slider-max-items-${key}`);

      this.updateFooterVisibility();
      this.reset(0);
    };

    setTransitionDuration(duration) {
      this.slider.style.transitionDuration = `${duration}ms`;
    }

    setIndex(direction) {
      const previousIndex = this.index;

      if (this.getAttribute("per-move") === "page") {
        this.index = Math.max(0, Math.min(this.TOTAL - this.PER_PAGE, this.index + direction * this.PER_PAGE));
      } else {
        this.index = Math.max(0, Math.min(this.TOTAL - 1, this.index + direction));
      }

      if (this.index !== previousIndex) {
        this.reset();
      }
    }
  }

  customElements.define("yc-slider", Slider);
}
