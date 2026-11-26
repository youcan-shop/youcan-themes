import { Component } from "@theme/component";
import { theme } from "@theme/utilities";

const DURATION = 4000;

/**
 * A single toast, shown with `showToast()`.
 * @extends {Component}
 */
class ToastComponent extends Component {
  requiredRefs = ["message"];

  /** @type {number | undefined} */
  #timeout;

  connectedCallback() {
    super.connectedCallback();
    this.refs.closeButton?.addEventListener("click", () => this.hide(), { signal: this.signal });

    if (theme.strings?.checkoutError) this.show(theme.strings.checkoutError, "error");
  }

  /**
   * @param {string} message
   * @param {"info" | "success" | "warning" | "error"} [type]
   */
  show(message, type = "info") {
    clearTimeout(this.#timeout);
    this.refs.message.textContent = message;
    this.dataset.type = type;
    if (!this.matches(":popover-open")) this.showPopover();
    this.#timeout = setTimeout(() => this.hide(), DURATION);
  }

  hide() {
    clearTimeout(this.#timeout);
    if (this.matches(":popover-open")) this.hidePopover();
  }
}

if (!customElements.get("ui-toast")) customElements.define("ui-toast", ToastComponent);

/**
 * @param {string} message
 * @param {"info" | "success" | "warning" | "error"} [type]
 */
export function showToast(message, type = "info") {
  /** @type {ToastComponent | null} */ (document.querySelector("ui-toast"))?.show(message, type);
}
