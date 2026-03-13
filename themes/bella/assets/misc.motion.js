class Motion extends HTMLElement {
  constructor() {
    super();

    this.sections = this.querySelectorAll(".youcan-section");
  }

  connectedCallback() {
    this._render();
  }

  _render() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.setAttribute("data-motion", "in-view");
        }
      });
    });

    this.sections.forEach((section) => observer.observe(section));
  }
}

customElements.define("ui-motion", Motion);
