import { Component } from "@theme/component";

/**
 * Before / after image slider, the range input drives `--position`.
 * Refs: `range`.
 */
class ComparisonSliderComponent extends Component {
  requiredRefs = ["range"];

  connectedCallback() {
    super.connectedCallback();
    this.refs.range.addEventListener("input", () => this.style.setProperty("--position", `${this.refs.range.value}%`), { signal: this.signal });
  }
}

if (!customElements.get("ui-comparison")) customElements.define("ui-comparison", ComparisonSliderComponent);
