if (!customElements.get("ui-navbar")) {
  class Navbar extends HTMLElement {
    constructor() {
      super();

      this.stickyType = Boolean(this.getAttribute("data-sticky-mode"));
    }

    connectedCallback() {
      this._render();
    }

    _render() {
      const rect = this.getBoundingClientRect();
      this.shouldCastShadow(rect.top === 0);

      this.safeArea = 400; //px
      this.lastScrollDistance = 0;

      window.addEventListener("scroll", () => {
        const rect = this.getBoundingClientRect();
        this.shouldCastShadow(rect.top === 0);

        const { pageYOffset: scrollYOffset } = window;

        if (this.stickyType === "always") {
          return;
        }

        const isOutsideSafearea = scrollYOffset >= this.safeArea;

        if (!isOutsideSafearea) {
          this.shouldHideHeader(false);

          return;
        }

        this.shouldHideHeader(this.lastScrollDistance < scrollYOffset);

        this.lastScrollDistance = scrollYOffset;
      });
    }

    shouldHideHeader(shouldHide) {
      this.setAttribute("aria-hidden", shouldHide);
    }

    shouldCastShadow(shouldCast) {
      this.setAttribute("data-shadow", shouldCast);
    }
  }

  customElements.define("ui-navbar", Navbar);
}
