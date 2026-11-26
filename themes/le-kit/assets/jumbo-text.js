/** Scales the font so the text fills the available width on one line (`data-fit`). */
class JumboTextComponent extends HTMLElement {
  #width = 0;

  #observer = new ResizeObserver(() => this.fit());

  connectedCallback() {
    if (!this.hasAttribute("data-fit")) return;

    this.#observer.observe(this);
    document.fonts?.ready.then(() => this.fit(true));
  }

  disconnectedCallback() {
    this.#observer.disconnect();
  }

  /** @param {boolean} [force] Refit even when the width didn't change */
  fit(force = false) {
    if (!force && this.clientWidth === this.#width) return;

    this.#width = this.clientWidth;
    this.style.fontSize = "100px";
    this.style.fontSize = `${Math.floor(100 * (this.clientWidth / this.scrollWidth) * 0.98)}px`;
    this.setAttribute("data-fitted", "");
  }
}

if (!customElements.get("ui-jumbo-text")) customElements.define("ui-jumbo-text", JumboTextComponent);
