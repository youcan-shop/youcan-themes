if (!customElements.get("ui-dev-toolbar")) {
  class DevToolbar extends HTMLElement {
    static observedAttributes = ["is-global"];

    constructor() {
      super();

      this.highlightIsActive = false;
      this.selectedElement = null;

      this.highlightTrigger = this.querySelector('[data-dev-toolbar="highlight-trigger"]');
      this.highlight = this.querySelector('[data-dev-toolbar="highlight"]');
    }

    connectedCallback() {
      this._render();
    }

    _render() {
      this.setTheme();
      this.getStructureTree();
      this.onThemeChange();

      this.highlightTrigger.addEventListener("click", () => this.toggleHighlight());

      document.addEventListener("mousemove", this.onMouseMove.bind(this));
      document.addEventListener("click", this.onDocumentClick.bind(this));
    }

    toggleHighlight() {
      this.highlightIsActive = !this.highlightIsActive;
      this.highlightTrigger.setAttribute("aria-checked", String(this.highlightIsActive));

      if (!this.highlightIsActive) this.clearHighlight();
    }

    onMouseMove(event) {
      if (!this.highlightIsActive || this.selectedElement) return;

      const target = this.hasAttribute("is-global") ? event.target : event.target.closest("[ui-section],[ui-block],[ui-layout]");

      if (!this.hasAttribute("is-global") && !target) return;

      this.onHighlight(target);
    }

    onDocumentClick(event) {
      if (!this.highlightIsActive) return;

      const target = event.target.closest("[ui-section],[ui-block],[ui-layout]");

      if (target) {
        this.selectedElement = target;
        this.onHighlight(target);

        return;
      }

      if (this.selectedElement && !this.selectedElement.contains(event.target)) {
        this.selectedElement = null;
        this.clearHighlight();
      }
    }

    onHighlight(element) {
      const label = element.getAttribute("ui-section") || element.getAttribute("ui-block") || element.getAttribute("ui-layout");

      this.highlight.setAttribute("data-liquid-element", String(this.isLiquidElement(element)));
      this.highlight.querySelector("span").textContent = label?.toUpperCase() ?? `<${element.tagName.toLowerCase()}>`;

      const updatePosition = () => {
        const rect = element.getBoundingClientRect();

        Object.assign(this.highlight.style, {
          left: `${rect.left}px`,
          top: `${rect.top}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          display: "block",
        });

        const isTop = rect.top > 30;

        Object.assign(this.highlight.querySelector("div").style, {
          left: `${rect.left}px`,
          top: !isTop ? `${rect.top + rect.height + 8}px` : `${rect.top - this.highlight.querySelector("div").getBoundingClientRect().height - 8}px`,
        });
      };

      updatePosition();

      window.addEventListener("resize", () => updatePosition());
      document.addEventListener("scroll", () => updatePosition(), {
        passive: true,
      });
    }

    clearHighlight() {
      this.highlight.style.display = "none";
    }

    isLiquidElement(element) {
      return element.hasAttribute("ui-section") || element.hasAttribute("ui-block") || element.hasAttribute("ui-layout");
    }

    getStructureTree() {
      const structure = this.querySelector("[data-structure]");

      const sections = document.querySelectorAll("[ui-layout], [ui-section]");

      sections.forEach((element) => {
        const section = document.createElement("li");
        section.className = "section";

        section.innerHTML = `
          <label ui-slot="button" data-variant="primary" data-mode="ghost" data-size="xs" data-as-icon>
            <input type="checkbox" name="collapse">
            <i class="hgi hgi-stroke hgi-arrow-right-01"></i>
          </label>
          <button ui-slot="button" data-variant="primary" data-mode="stroke" data-size="xs">
            <i class="hgi hgi-stroke hgi-layers-01"></i>
            ${element.getAttribute("ui-layout") || element.getAttribute("ui-section")}
          </button>`;

        structure.appendChild(section);

        const blocks = element.querySelectorAll("[ui-block]");

        if (blocks.length) {
          const blocksWrapper = `
            <li class="blocks-wrapper">
              <ul class="blocks"></ul>
            </li>`;

          structure.innerHTML += blocksWrapper;

          blocks.forEach((ele) => {
            const block = document.createElement("li");
            block.className = "block";

            block.innerHTML = `
              <button ui-slot="button" data-variant="primary" data-mode="ghost" data-size="xs">
                <i class="hgi hgi-stroke hgi-layer-add"></i>
                ${ele.getAttribute("ui-block")}
              </button>`;

            structure.lastChild.querySelector("ul").appendChild(block);
          });
        }
      });
    }

    onThemeChange() {
      const themes = this.querySelectorAll('input[name="theme"]');

      themes.forEach((option) => {
        option.checked = (localStorage.getItem("theme") || "light") == option.value;
        option.addEventListener("change", () => this.setTheme(option.value));
      });
    }

    setTheme(theme = localStorage.getItem("theme") || "light") {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("theme", theme);
    }
  }

  customElements.define("ui-dev-toolbar", DevToolbar);
}
