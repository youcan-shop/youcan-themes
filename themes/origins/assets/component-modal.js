class Modal extends HTMLElement {
  static observedAttributes = ["as-drawer", "detachable"];

  constructor() {
    super();

    this.moved = false;
    this.isDragging = false;
    this.startY = this.currentY = 0;
    this.overlay = document.querySelector("yc-overlay");
    this.state = this.hasAttribute("[data-visible]");
    this.detachable = this.hasAttribute("detachable");

    this.SPEED = 300;
    this.MOBILE_SCREEN = 768;
    this.DRAG_EVENTS = {
      onDrag: ["touchmove", "mousemove"],
      startDrag: ["touchstart", "mousedown"],
      endDrag: ["touchend", "mouseup", "mouseleave"],
    };
  }

  connectedCallback() {
    if (this.detachable) {
      if (this.moved) return;
      this.moved = true;
      document.body.appendChild(this);
    }

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
    const threshold = this.clientHeight * 0.2;

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

  inheritSectionColors(section) {
    const originalSectionStyles = getComputedStyle(section);

    this.style.setProperty("--section-bg-color", originalSectionStyles.getPropertyValue("--section-bg-color"));
    this.style.setProperty("--section-text-color", originalSectionStyles.getPropertyValue("--section-text-color"));
  }

  show(trigger) {
    const originalSection = document.getElementById(trigger.getAttribute("data-section"));

    if (this.detachable) {
      this.inheritSectionColors(originalSection);
    }

    const isMobile = window.innerWidth <= this.MOBILE_SCREEN;

    if (isMobile) {
      this.openOnMobile();

      return;
    }

    this.open();
  }

  open() {
    this.setIsVisible(true);
    this.updatePosition();
  }

  openOnMobile() {
    this.setIsVisible(true);
    this.setPosition("0%");
  }

  close() {
    this.setIsVisible(false);
    this.updatePosition();
  }

  closeOnMobile() {
    this.setIsVisible(false);
    this.setPosition("0% 100%");
  }

  setIsVisible(isVisible) {
    this.state = isVisible;
    this.toggleAttribute("data-visible", isVisible);
    this.overlay.toggleAttribute("data-active", isVisible);
  }

  setTransition(duration) {
    this.style.transitionDuration = `${duration}ms`;
  }

  setPosition(position) {
    this.style.translate = position;
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

class ModalTrigger extends HTMLElement {
  constructor() {
    super();

    this.trigger = this.querySelector("[data-trigger]");
  }

  connectedCallback() {
    if (!this.trigger) return;

    this.trigger.addEventListener("click", () => {
      const modal = document.querySelector(this.getAttribute("data-modal"));

      this.trigger.setAttribute("data-section", this.closest("yc-section").id);

      if (modal) modal.show(this.trigger);
    });
  }
}

customElements.define("yc-modal-trigger", ModalTrigger);
