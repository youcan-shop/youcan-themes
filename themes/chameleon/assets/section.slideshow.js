if (!customElements.get("ui-slideshow")) {
  class Slideshow extends HTMLElement {
    constructor() {
      super();

      this.index = 0;
      this.wrapper = this.firstElementChild.firstElementChild;
      this.slides = this.wrapper.querySelectorAll("li");
      this.arrows = {
        previous: this.querySelector('[aria-label="previous"]'),
        next: this.querySelector('[aria-label="next"]'),
      };
      this.dots = this.querySelectorAll('[aria-label*="slide"]');

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

      this.dots.forEach((dot, idx) => {
        dot.addEventListener("click", () => this.swipe(idx));
      });
    }

    swipe(index) {
      this.wrapper.style.insetInlineStart = `calc(-${100 * index}%`;
      this.setIndex(index);
    }

    setIndex(index) {
      this.index = index;

      this.dots.forEach((dot, idx) => {
        dot.setAttribute("aria-selected", index === idx);
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
  }

  customElements.define("ui-slideshow", Slideshow);
}
