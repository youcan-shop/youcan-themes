class Slider extends HTMLElement {
  static observedAttributes = ["autoplay", "interval", "pause-on-hover"];

  constructor() {
    super();

    this.slider = this.querySelector("[data-slider]");
    this.sliderBox = this.querySelector("[data-slider-box]");
    this.leftArrow = this.querySelector("[data-arrow='left']");
    this.rightArrow = this.querySelector("[data-arrow='right']");

    this.index = 0;
    this.startX = 0;
    this.currentX = 0;
    this.interval = null;
    this.isSwiping = false;
    this.isBoundaryAllowed = true;

    this.TOTAL = this.slider.children.length;
    this.GAP = this._getStyle("slider-gap", 0);
    this.SPEED = this._getStyle("slider-speed", 600);
    this.PER_PAGE = this._getStyle("slider-per-page", 1);
    this.INTERVAL_DURATION =
      parseInt(this.getAttribute("interval"), 10) || 3000;

    this.SWIPE_EVENTS = {
      onSwipe: ["touchmove", "mousemove"],
      startSwipe: ["touchstart", "mousedown"],
      endSwipe: ["touchend", "mouseup", "mouseleave"],
    };
  }

  connectedCallback() {
    this._render();
  }

  _getStyle(variable, default_value) {
    return (
      parseInt(getComputedStyle(this).getPropertyValue(`--${variable}`), 10) ||
      default_value
    );
  }

  _render() {
    this.hasAttribute("auto-play") && this.autoPlay();

    this.leftArrow.addEventListener("click", () => this.setIndex(-1));
    this.rightArrow.addEventListener("click", () => this.setIndex(1));

    this.swipeHandler();
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

  swipeHandler() {
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

    this.currentX = event.touches ? event.touches[0].clientX : event.clientX;
    const deltaX = this.currentX - this.startX;

    if (
      (!this.canGoPrevious() && deltaX > 0) ||
      (!this.canGoNext() && deltaX < 0)
    ) {
      this.isBoundaryAllowed = false;
      this.move(deltaX / 4);
    } else {
      this.isBoundaryAllowed = true;
      this.move(deltaX);
    }
  }

  endSwipe() {
    if (!this.isSwiping) return;

    const deltaX = this.currentX - this.startX;
    const itemWidth = this.sliderBox.offsetWidth / this.PER_PAGE;
    const threshold = itemWidth / 4;
    const isValidSwipe = this.isBoundaryAllowed && Math.abs(deltaX) > threshold;

    isValidSwipe ? this.setIndex(deltaX > 0 ? -1 : 1) : this.move();

    this.setSwiping(false);
    this.setTransitionDuration(this.SPEED);
  }

  move(offset = 0) {
    const translateX = `calc(-${(100 / this.PER_PAGE) * this.index}% - ${
      (this.GAP / this.PER_PAGE) * this.index
    }px + ${offset}px)`;
    this.slider.style.transform = `translateX(${translateX})`;
  }

  setSwiping(state) {
    this.isSwiping = state;
  }

  setArrows() {
    this.rightArrow.disabled = !this.canGoNext();
    this.leftArrow.disabled = !this.canGoPrevious();
  }

  setTransitionDuration(duration) {
    this.slider.style.transitionDuration = `${duration}ms`;
  }

  setIndex(direction) {
    const previousIndex = this.index;
    this.index = Math.max(0, Math.min(this.TOTAL - 1, this.index + direction));

    if (this.index !== previousIndex) {
      this.move();
      this.setArrows();
    }
  }
}

customElements.define("yc-slider", Slider);
