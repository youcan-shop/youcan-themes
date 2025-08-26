if (!customElements.get("ui-toast")) {
  class Toast extends HTMLElement {
    constructor() {
      super();

      this.timeout = null;
      this.CLOSE_DURATION = 3000;
      this.close = () => this.setState(false);
    }

    connectedCallback() {
      this.message = this.querySelector("[ui-toast-message]");
      this.status = this.querySelector("[ui-toast-status]");
      this.action = this.querySelector("[ui-toast-action]");

      this.action.addEventListener("click", this.close);
    }

    disconnectedCallback() {
      this.action.removeEventListener("click", this.close);
      clearTimeout(this.timeout);
    }

    show(message, status = "info") {
      clearTimeout(this.timeout);
      this.setState(true);

      this.message.textContent = message;
      this.status.setAttribute("ui-toast-status", status);

      this.timeout = setTimeout(() => this.setState(false), this.CLOSE_DURATION);
    }

    setState(state) {
      this.setAttribute("data-state", state ? "open" : "closed");
    }
  }

  customElements.define("ui-toast", Toast);
}
