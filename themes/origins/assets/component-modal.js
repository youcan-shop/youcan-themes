class Modal extends HTMLElement {
  static observedAttributes = ["as-drawer"];

  constructor() {
    super();

    this.isDragging = false;
    this.startY = this.currentY = 0;
    this.state = this.dataset.hidden === "true";
    this.modal = this.querySelector("[data-modal]");

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
    this.toggleHandler();
    window.addEventListener("resize", () => this.updatePosition());
  }

  toggleHandler() {
    this.querySelectorAll("[data-toggle]").forEach((toggle) =>
      toggle.addEventListener("click", () => {
        this.toggleState();
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
    if (this.state || window.innerWidth > this.MOBILE_SCREEN) return;

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
    const threshold = this.modal.offsetHeight * 0.15;

    deltaY > threshold ? this.close() : this.open();
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
    this.setState(true);
    this.setPosition("0% 100%");
  }

  open() {
    this.setPosition("0%");
  }

  toggleState() {
    this.setState(!this.state);
  }

  setState(hidden) {
    this.state = hidden;
    this.dataset.hidden = hidden;
    document.body.toggleAttribute("data-scroll-locked", !hidden);
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
    const state = this.state ? "closed" : "open";

    this.setPosition(
      !isMobile && this.hasAttribute("as-drawer") ? 0 : positions[key][state],
    );
  }
}

customElements.define("yc-modal", Modal);
