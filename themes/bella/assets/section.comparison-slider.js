if (!customElements.get("ui-comparison-slider")) {
  class ComparisonSlider extends HTMLElement {
    constructor() {
      super();

      this.position = 50;
      this.pointerId = null;
      this.handle = this.querySelector('[ui-comparison-slider="handle"]');
    }

    connectedCallback() {
      if (!this.handle) return;

      this._render();
    }

    get isVertical() {
      return this.dataset.direction === "vertical";
    }

    get isRtl() {
      return getComputedStyle(this).direction === "rtl";
    }

    _render() {
      this.addEventListener("pointerdown", (event) => this.onPointerDown(event));
      this.addEventListener("pointermove", (event) => this.onPointerMove(event));
      this.addEventListener("pointerup", (event) => this.onPointerEnd(event));
      this.addEventListener("pointercancel", (event) => this.onPointerEnd(event));
      this.handle.addEventListener("keydown", (event) => this.onKeyDown(event));
    }

    onPointerDown(event) {
      if (event.button !== 0) return;
      if (this.isVertical && event.pointerType === "touch" && !this.handle.contains(event.target)) return;

      this.pointerId = event.pointerId;
      this.setPointerCapture(event.pointerId);
      this.moveTo(event);
    }

    onPointerMove(event) {
      if (event.pointerId !== this.pointerId) return;

      this.moveTo(event);
    }

    onPointerEnd(event) {
      if (event.pointerId !== this.pointerId) return;

      this.pointerId = null;
    }

    onKeyDown(event) {
      const step = event.shiftKey ? 10 : 2;
      const next = this.isVertical ? "ArrowDown" : this.isRtl ? "ArrowLeft" : "ArrowRight";
      const previous = this.isVertical ? "ArrowUp" : this.isRtl ? "ArrowRight" : "ArrowLeft";
      const positions = {
        [next]: this.position + step,
        [previous]: this.position - step,
        Home: 0,
        End: 100,
      };

      if (!(event.key in positions)) return;

      event.preventDefault();
      this.setPosition(positions[event.key]);
    }

    moveTo(event) {
      const rect = this.getBoundingClientRect();
      const ratio = this.isVertical ? (event.clientY - rect.top) / rect.height : (event.clientX - rect.left) / rect.width;

      this.setPosition((this.isRtl && !this.isVertical ? 1 - ratio : ratio) * 100);
    }

    setPosition(value) {
      this.position = Math.min(100, Math.max(0, value));
      this.style.setProperty("--position", `${this.position}%`);
      this.handle.setAttribute("aria-valuenow", Math.round(this.position));
    }
  }

  customElements.define("ui-comparison-slider", ComparisonSlider);
}
