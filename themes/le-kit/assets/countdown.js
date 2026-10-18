import { Component } from "@theme/component";

const UNITS = /** @type {const} */ ([
  ["days", 86_400_000],
  ["hours", 3_600_000],
  ["minutes", 60_000],
  ["seconds", 1_000],
]);

/**
 * Counts down to the `end` attribute (YYYY-MM-DDTHH:MM, the visitor's local time).
 * Refs: `days`, `hours`, `minutes`, `seconds`.
 */
class CountdownComponent extends Component {
  /** @type {number | undefined} */
  #timer;

  connectedCallback() {
    super.connectedCallback();
    if (Number.isNaN(this.end)) return;

    this.#tick();
    this.#timer = setInterval(() => this.#tick(), 1000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this.#timer);
  }

  get end() {
    return new Date(this.getAttribute("end") ?? "").getTime();
  }

  #tick() {
    let remaining = Math.max(0, this.end - Date.now());

    for (const [unit, ms] of UNITS) {
      const value = Math.floor(remaining / ms);
      remaining -= value * ms;
      if (this.refs[unit]) this.refs[unit].textContent = String(value).padStart(2, "0");
    }

    if (this.end > Date.now()) return;
    clearInterval(this.#timer);
    if (this.hasAttribute("hide-when-expired")) this.hidden = true;
  }
}

if (!customElements.get("ui-countdown")) customElements.define("ui-countdown", CountdownComponent);
