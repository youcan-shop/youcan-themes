if (!customElements.get("ui-media")) {
  class Media extends HTMLElement {
    constructor() {
      super();
      this.index = 0;
      this.scrollRAF = null;
    }

    connectedCallback() {
      this._render();
    }

    _render() {
      this.imgWrapper = this.querySelector("[ui-media-images]");
      this.images = this.imgWrapper.querySelectorAll("img");
      this.pagination = [
        this.querySelectorAll("[ui-media-pagination='dots'] button"),
        this.querySelectorAll("[ui-media-pagination='images'] button"),
      ];

      this.pagination.forEach((pages, index) => {
        pages.forEach((page, i) => page.addEventListener("click", () => this.move(i, index === 0 ? "left" : "top")));
      });

      this.addEventListener("scroll", () => this.onScroll("top"));
      this.imgWrapper.addEventListener("scroll", () => this.onScroll("left"));
    }

    move(i, dir) {
      if (this.index === i) return;

      this.setIndex(i);
      this.setPosition(dir);
      this.setState();
    }

    setPosition(dir) {
      const el = this.isDirectionTop(dir) ? this : this.imgWrapper;
      const size = this.isDirectionTop(dir) ? el.clientHeight : el.clientWidth;

      el.scrollTo({ [dir]: size * this.index * (1 | -this.isRTL()) });
    }

    setState() {
      for (const pages of this.pagination) {
        pages.forEach((page, i) => page.setAttribute("aria-selected", String(i === this.index)));
      }
    }

    setIndex(index) {
      const max = Math.max(0, this.images.length - 1);
      this.index = Math.min(Math.max(0, index), max);
    }

    isDirectionTop(dir) {
      return dir === "top";
    }

    isRTL() {
      return document.dir === "rtl";
    }

    onScroll(dir) {
      if (this.scrollRAF) return;

      this.scrollRAF = requestAnimationFrame(() => {
        const el = this.isDirectionTop(dir) ? this : this.imgWrapper;
        let pos = this.isDirectionTop(dir) ? el.scrollTop : el.scrollLeft;
        const size = this.isDirectionTop(dir) ? el.clientHeight : el.clientWidth;

        let newIndex = Math.abs(Math.round(pos / Math.max(1, size)));
        const max = Math.max(0, this.images.length - 1);
        if (newIndex > max) newIndex = max;

        if (newIndex !== this.index) {
          this.index = newIndex;
          this.setState();
        }
        this.scrollRAF = null;
      });
    }
  }

  customElements.define("ui-media", Media);
}
