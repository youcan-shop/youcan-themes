class Motion extends HTMLElement {
  constructor() {
    super();

    this.sections = this.querySelectorAll(".youcan-section");
  }

  connectedCallback() {
    this._render();
  }

  _render() {
    if (this.inIframe()) {
      this.dataset.status = "ignore";

      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.setAttribute("data-motion", "in-view");
        }
      });
    });

    this.sections.forEach((section) => observer.observe(section));
  }

  inIframe() {
    return window.self != window.top;
  }
}

customElements.define("ui-motion", Motion);
