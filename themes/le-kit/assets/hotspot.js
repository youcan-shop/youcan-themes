import { Component } from "@theme/component";

const OPEN_EVENT = "hotspot:open";

/**
 * Image marker that grows into a product card: hover or tap opens it, leaving, clicking outside or Escape closes it.
 * Refs: `box`, `toggle`, `card`.
 */
class HotspotComponent extends Component {
  requiredRefs = ["box", "toggle", "card"];

  connectedCallback() {
    super.connectedCallback();
    const { signal } = this;
    const hover = window.matchMedia("(hover: hover)");

    this.refs.toggle.addEventListener("click", () => (this.isOpen ? this.close() : this.open()), { signal });
    this.addEventListener("pointerenter", (event) => event.pointerType === "mouse" && hover.matches && this.open(), { signal });
    this.addEventListener("pointerleave", (event) => event.pointerType === "mouse" && hover.matches && this.close(), { signal });
    this.addEventListener("focusout", (event) => !this.contains(/** @type {Node | null} */ (event.relatedTarget)) && this.close(), { signal });
    this.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !this.isOpen) return;
      this.close();
      this.refs.toggle.focus();
    }, { signal });

    document.addEventListener("click", (event) => this.isOpen && !this.contains(/** @type {Node} */ (event.target)) && this.close(), { signal });
    document.addEventListener(OPEN_EVENT, (event) => event.target !== this && this.close(), { signal });
  }

  get isOpen() {
    return this.hasAttribute("data-open");
  }

  open() {
    if (this.isOpen) return;
    this.#placeCard();
    this.toggleAttribute("data-open", true);
    this.refs.toggle.setAttribute("aria-expanded", "true");
    this.refs.card.tabIndex = 0;
    this.dispatchEvent(new CustomEvent(OPEN_EVENT, { bubbles: true }));
  }

  close() {
    if (!this.isOpen) return;
    this.removeAttribute("data-open");
    this.refs.toggle.setAttribute("aria-expanded", "false");
    this.refs.card.tabIndex = -1;
  }

  /** Centers the card on the marker, kept inside the image. */
  #placeCard() {
    const canvas = this.offsetParent ?? this.parentElement;
    if (!canvas) return;

    const bounds = canvas.getBoundingClientRect();
    const point = this.getBoundingClientRect();
    this.style.setProperty("--canvas-width", `${bounds.width}px`);

    const { width, height } = this.#cardSize();
    const gap = 8;
    const left = point.left - width / 2;
    const top = point.top - height / 2;
    let shiftX = Math.max(0, bounds.left + gap - left) - Math.max(0, left + width - (bounds.right - gap));
    const shiftY = Math.max(0, bounds.top + gap - top) - Math.max(0, top + height - (bounds.bottom - gap));
    if (document.documentElement.dir === "rtl") shiftX = -shiftX;

    this.style.setProperty("--shift-x", `${shiftX}px`);
    this.style.setProperty("--shift-y", `${shiftY}px`);
  }

  #cardSize() {
    const styles = getComputedStyle(this);
    const probe = document.createElement("div");
    probe.style.cssText = "position:absolute;visibility:hidden;width:var(--card-width);height:var(--card-height)";
    this.append(probe);
    const size = { width: probe.offsetWidth, height: probe.offsetHeight };
    probe.remove();
    return size.width ? size : { width: parseFloat(styles.getPropertyValue("--card-width")) || 400, height: 132 };
  }
}

if (!customElements.get("ui-hotspot")) customElements.define("ui-hotspot", HotspotComponent);
