class Modal extends HTMLElement {
  constructor() {
    super();

    this.startY = 0;
    this.currentY = 0;
    this.isDragging = false;

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
    this.useDrag();
    this.useActions();

    addEventListener("resize", () => this.initialPosition());
  }

  useActions() {
    const toggles = this.querySelectorAll("[data-toggle]");

    if (toggles.length) {
      toggles.forEach((toggle) => {
        toggle.addEventListener("click", () => {
          this.setState();
          this.setScroll();
          this.initialPosition();
        });
      });
    }
  }

  useDrag() {
    Object.entries(this.DRAG_EVENTS).forEach(([action, types]) => {
      types.forEach((type) => {
        this.addEventListener(
          type,
          (event) => {
            if (typeof this[action] === "function") this[action](event);
          },
          { passive: ["touchstart", "touchmove"].includes(type) },
        );
      });
    });
  }

  startDrag(event) {
    if (this.state || innerWidth > this.MOBILE_SCREEN) return;

    this.isDragging = true;
    this.startY = event.touches ? event.touches[0].clientY : event.clientY;
    this.currentY = this.startY;

    this.setTransitionDuration(0);
  }

  onDrag(event) {
    if (!this.isDragging || innerWidth > this.MOBILE_SCREEN) return;

    this.currentY = event.touches ? event.touches[0].clientY : event.clientY;
    const deltaY = this.currentY - this.startY;

    if (deltaY > 0) this.setPosition(`0% ${deltaY}px`);
  }

  endDrag() {
    if (!this.isDragging || innerWidth > this.MOBILE_SCREEN) return;

    const deltaY = this.currentY - this.startY;
    const threshold = (this.modal.offsetHeight * 15) / 100;

    if (deltaY > threshold) {
      this.setState(true);
      this.setScroll();
      this.setPosition("0% 100%");
    } else {
      this.setPosition("0%");
    }

    this.reset();
    this.setTransitionDuration(this.SPEED);
  }

  reset() {
    this.startY = 0;
    this.currentY = 0;
    this.isDragging = false;
  }

  setState(new_state = !this.state) {
    this.state = new_state;
    this.dataset.hidden = this.state;
  }

  setScroll() {
    this.state
      ? document.body.removeAttribute("data-scroll-locked")
      : document.body.setAttribute("data-scroll-locked", "");
  }

  setTransitionDuration(duration) {
    this.modal.style.transitionDuration = `${duration}ms`;
  }

  setPosition(position) {
    this.modal.style.translate = position;
  }

  initialPosition() {
    innerWidth <= this.MOBILE_SCREEN
      ? this.setPosition(this.state ? "0% 100%" : "0%")
      : this.setPosition(this.state ? "-50% -40%" : "-50% -50%");
  }
}

customElements.define("yc-modal", Modal);
