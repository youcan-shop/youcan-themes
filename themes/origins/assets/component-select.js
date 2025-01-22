class Select extends HTMLElement {
  static observedAttributes = ["name"];

  constructor() {
    super();

    this.state = false;
    this.trigger = this.querySelector("yc-select-trigger");
    this.content = this.querySelector("yc-select-content");
    this.search = this.querySelector("yc-select-search");
  }

  connectedCallback() {
    this._render();
  }

  _render() {
    this.setup();
    this.control();
    this.onSelect();
    this.search && this.onSearch();
  }

  onSelect() {
    const options = this.content.querySelectorAll("label");

    options.forEach((opt) =>
      opt.addEventListener("change", () => {
        this.trigger.textContent = opt.textContent;
      }),
    );
  }

  onSearch() {
    const placeholder = this.search.getAttribute("placeholder");
    const noResults = this.search.getAttribute("no-results");

    const template = document.createElement("template");
    template.innerHTML = `<input type="text" name="search" placeholder="${placeholder}" />`;

    const searchInput = template.content.firstElementChild.cloneNode(true);
    this.search.replaceWith(searchInput);

    const options = this.content.querySelectorAll("label");

    searchInput.addEventListener("input", (e) => {
      const isValid = (option) =>
        option.textContent.toLowerCase().includes(e.target.value.toLowerCase());

      Array.from(options).forEach((opt) => {
        opt.toggleAttribute("hidden-item", !isValid(opt));
      });

      Array.from(options).filter((opt) => isValid(opt)).length
        ? this.content.removeAttribute("data-no-results")
        : this.content.setAttribute("data-no-results", noResults);
    });
  }

  control() {
    const setState = (visible) => {
      this.state = visible;
      this.content.dataset.visible = visible;
      document.body.toggleAttribute("data-scroll-locked", visible);
    };

    const clickOutside = (e) =>
      !e.composedPath().includes(this.trigger) && setState(false);

    const toggle = () => {
      this.content.toggleAttribute(
        "is-above",
        innerHeight - this.trigger.getBoundingClientRect().bottom <
          this.content.offsetHeight,
      );

      setState(!this.state);
    };

    this.trigger.addEventListener("click", toggle);
    document.addEventListener("click", clickOutside);
  }

  setup() {
    const items = this.content.querySelectorAll("yc-select-item");

    items.forEach((item) => {
      const label = item.textContent;
      const value = item.getAttribute("value");
      const disabled = item.hasAttribute("disabled");

      const template = document.createElement("template");
      template.innerHTML = `
        <label for="${value}">
          ${label}
          <input 
            hidden
            ${disabled && "disabled"}
            name="${this.getAttribute("name")}"
            type="radio" id="${value}" value="${value}" 
          >
        </label>
      `;

      const option = template.content.firstElementChild.cloneNode(true);
      item.replaceWith(option);
    });
  }
}

customElements.define("yc-select", Select);
