if (!customElements.get("ui-toast")) {
  class Toast extends HTMLElement {
    constructor() {
      super();

      this.timeout = null;
      this.CLOSE_DURATION = 3000;
      this.close = () => this.setVisibility(false);
    }

    connectedCallback() {
      this.message = this.querySelector('[ui-toast="message"]');
      this.action = this.querySelector('[ui-toast="action"]');

      this.action.addEventListener("click", this.close);
    }

    disconnectedCallback() {
      this.action.removeEventListener("click", this.close);
      clearTimeout(this.timeout);
    }

    show(message, status = "info") {
      clearTimeout(this.timeout);
      this.setVisibility(true);

      this.message.textContent = message;
      this.setAttribute("data-state", status);

      this.timeout = setTimeout(() => this.setVisibility(false), this.CLOSE_DURATION);
    }

    setVisibility(state) {
      state ? this.showPopover() : this.hidePopover();
    }
  }

  customElements.define("ui-toast", Toast);
}
