class Modal extends HTMLElement {
  static observedAttributes = ["as-drawer"];

  constructor() {
    super();

    this.isDragging = false;
    this.startY = this.currentY = 0;
    this.overlay = document.querySelector("yc-overlay");
    this.modal = this.querySelector("yc-modal-content");
    this.state = this.modal.hasAttribute("[data-visible]");
    this.parentSection = this.closest("yc-section");

    this.SPEED = 300;
    this.MOBILE_SCREEN = 768;
    this.DRAG_EVENTS = {
      onDrag: ["touchmove", "mousemove"],
      startDrag: ["touchstart", "mousedown"],
      endDrag: ["touchend", "mouseup", "mouseleave"],
    };
  }

  connectedCallback() {
    this._render();
  }

  _render() {
    this.dragHandler();
    this.triggerHandler();
    window.addEventListener("resize", () => this.updatePosition());
  }

  triggerHandler() {
    [...this.querySelectorAll("[data-trigger]"), this.overlay].forEach((trigger) =>
      trigger.addEventListener("click", () => {
        this.setIsVisible(trigger.tagName === "YC-OVERLAY" ? false : !this.state);
        this.updatePosition();
      }),
    );
  }

  dragHandler() {
    Object.entries(this.DRAG_EVENTS).forEach(([action, types]) =>
      types.forEach((type) =>
        this.addEventListener(type, (event) => this[action]?.(event), {
          passive: ["touchstart", "touchmove"].includes(type),
        }),
      ),
    );
  }

  startDrag(event) {
    if (!this.state || window.innerWidth > this.MOBILE_SCREEN) return;

    this.isDragging = true;
    this.startY = this.currentY = this.getEventY(event);
    this.setTransition(0);
  }

  onDrag(event) {
    if (!this.isDragging || window.innerWidth > this.MOBILE_SCREEN) return;

    const deltaY = (this.currentY = this.getEventY(event)) - this.startY;
    if (deltaY > 0) this.setPosition(`0% ${deltaY}px`);
  }

  endDrag() {
    if (!this.isDragging || window.innerWidth > this.MOBILE_SCREEN) return;

    const deltaY = this.currentY - this.startY;
    const threshold = this.modal.clientHeight * 0.2;

    deltaY > threshold ? this.closeOnMobile() : this.openOnMobile();
    this.resetDrag();
    this.setTransition(this.SPEED);
  }

  resetDrag() {
    this.isDragging = this.startY = this.currentY = 0;
  }

  getEventY(event) {
    return event.touches ? event.touches[0].clientY : event.clientY;
  }

  close() {
    this.setIsVisible(false);
    this.updatePosition();
  }

  closeOnMobile() {
    this.setIsVisible(false);
    this.setPosition("0% 100%");
  }

  openOnMobile() {
    this.setPosition("0%");
  }

  setIsVisible(isVisible) {
    const ycSlider = this.parentSection.querySelector("yc-slider");

    if (isVisible && ycSlider) {
      this.dispatchEvent(new CustomEvent("modal:willOpen", { bubbles: true }));
    }

    this.state = isVisible;
    this.modal.toggleAttribute("data-visible", isVisible);
    this.overlay.toggleAttribute("data-active", isVisible);

    if (!isVisible && ycSlider) {
      ycSlider.dispatchEvent(new CustomEvent("modal:didClose", { bubbles: true }));
    }
  }

  setTransition(duration) {
    this.modal.style.transitionDuration = `${duration}ms`;
  }

  setPosition(position) {
    this.modal.style.translate = position;
  }

  updatePosition() {
    const positions = {
      mobile: { open: "0%", closed: "0% 100%" },
      desktop: { open: "-50% -50%", closed: "-50% -40%" },
    };

    const isMobile = window.innerWidth <= this.MOBILE_SCREEN;
    const key = isMobile ? "mobile" : "desktop";
    const state = !this.state ? "closed" : "open";

    if (!isMobile && this.hasAttribute("as-drawer")) {
      this.setPosition(0);
    } else {
      this.setPosition(positions[key][state]);
    }
  }
}

customElements.define("yc-modal", Modal);
