import { Component } from "@theme/component";

const TIMING = { duration: 280, easing: "cubic-bezier(0.4, 0, 0.2, 1)" };

/**
 * Clamps long content to `--read-more-height` and reveals it on demand.
 * Refs: `content`, `toggle`, `moreLabel`, `lessLabel`.
 */
class ReadMoreComponent extends Component {
  requiredRefs = ["content", "toggle"];

  connectedCallback() {
    super.connectedCallback();

    requestAnimationFrame(() => {
      if (this.refs.content.scrollHeight <= this.limit + 24) return;

      this.setAttribute("data-clamped", "");
      this.refs.toggle.hidden = false;
      this.refs.toggle.addEventListener("click", () => this.toggle(), { signal: this.signal });
    });
  }

  get limit() {
    return parseFloat(getComputedStyle(this).getPropertyValue("--read-more-height")) || 160;
  }

  get isOpen() {
    return this.hasAttribute("data-open");
  }

  toggle() {
    const open = !this.isOpen;
    const { content, toggle, moreLabel, lessLabel } = this.refs;
    const from = content.getBoundingClientRect().height;

    this.toggleAttribute("data-open", open);
    content.animate([{ height: `${from}px` }, { height: `${open ? content.scrollHeight : this.limit}px` }], TIMING);

    toggle.setAttribute("aria-expanded", String(open));
    if (moreLabel) moreLabel.hidden = open;
    if (lessLabel) lessLabel.hidden = !open;
  }
}

if (!customElements.get("ui-read-more")) customElements.define("ui-read-more", ReadMoreComponent);
