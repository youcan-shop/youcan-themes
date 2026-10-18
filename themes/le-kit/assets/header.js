import { Component } from "@theme/component";

/**
 * Site header: closes desktop dropdowns on outside click / Escape, hides on scroll down
 * (`data-sticky="scroll-up"`) and swaps the transparent scheme once the page scrolls.
 */
class HeaderComponent extends Component {
  #lastScroll = 0;

  connectedCallback() {
    super.connectedCallback();
    const { signal } = this;

    this.dropdowns.forEach((dropdown) =>
      dropdown.addEventListener(
        "toggle",
        () => {
          if (dropdown.open) this.dropdowns.filter((other) => other !== dropdown).forEach((other) => (other.open = false));
          this.#updateTransparency();
        },
        { signal },
      ),
    );

    document.addEventListener("click", (event) => !this.contains(/** @type {Node} */ (event.target)) && this.closeDropdowns(), { signal });
    document.addEventListener("keyup", (event) => event.key === "Escape" && this.closeDropdowns(), { signal });

    if (this.dataset.sticky === "scroll-up" || this.hasAttribute("data-transparent")) {
      window.addEventListener("scroll", () => this.#onScroll(), { passive: true, signal });
      this.#onScroll();
    }
  }

  /** @returns {HTMLDetailsElement[]} */
  get dropdowns() {
    return this.refs.dropdowns ?? [];
  }

  closeDropdowns() {
    this.dropdowns.forEach((dropdown) => (dropdown.open = false));
  }

  #onScroll() {
    const current = window.scrollY;

    if (this.dataset.sticky === "scroll-up") {
      const scrollingDown = current > this.#lastScroll && current > this.offsetHeight;
      this.toggleAttribute("data-hidden", scrollingDown);
      if (scrollingDown) this.closeDropdowns();
    }

    this.#lastScroll = current;
    this.#updateTransparency();
  }

  #updateTransparency() {
    if (!this.hasAttribute("data-transparent")) return;

    const solid = window.scrollY > 8 || this.dropdowns.some((dropdown) => dropdown.open);
    const { schemeClass = "", transparentClass = "" } = this.dataset;

    this.toggleAttribute("data-transparent-active", !solid);
    this.classList.toggle(schemeClass, solid);
    this.classList.toggle(transparentClass, !solid);
  }
}

if (!customElements.get("ui-header")) customElements.define("ui-header", HeaderComponent);
