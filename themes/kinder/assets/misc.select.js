if (!customElements.get("ui-select")) {
  class DevToolbar extends HTMLElement {
    constructor() {
      super();

      this.trigger = this.querySelector('[ui-slot="select-trigger"]');
      this.content = this.querySelector('[ui-slot="select-content"]');
    }

    connectedCallback() {
      this._render();
    }

    _render() {
      this.updatePosition();

      window.addEventListener("resize", () => this.updatePosition());
      document.addEventListener("scroll", () => this.updatePosition(), {
        passive: true,
      });

      this.findSelectedElement();
      this.content.addEventListener("toggle", (e) => {
        if (e.newState === "closed") this.findSelectedElement();
      });
    }

    findSelectedElement() {
      const selectedElement = this.content.querySelector(
        'input[type="radio"]:checked'
      );

      if (selectedElement) {
        this.trigger.textContent = selectedElement.nextSibling.textContent;
      }
    }

    updatePosition() {
      const rect = this.trigger.getBoundingClientRect();

      Object.assign(this.content.style, {
        left: `${rect.left}px`,
        top: `${rect.top + rect.height}px`,
        width: `${rect.width}px`,
      });
    }
  }

  customElements.define("ui-select", DevToolbar);
}
