if (!customElements.get("ui-navbar")) {
  class Navbar extends HTMLElement {
    constructor() {
      super();

      this.stickyType = this.getAttribute("data-sticky-mode");
    }

    connectedCallback() {
      this._render();
    }

    _render() {
      this.safeArea = 400; //px
      this.lastScrollDistance = 0;

      window.addEventListener("scroll", () => {
        const { pageYOffset: scrollYOffset } = window;

        if (this.stickyType === "always") {
          return;
        }

        const isOutsideSafeArea = scrollYOffset >= this.safeArea;

        if (!isOutsideSafeArea) {
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
  }

  customElements.define("ui-navbar", Navbar);
}
