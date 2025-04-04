if (!customElements.get("yc-combobox")) {
  class Combobox extends HTMLElement {
    static observedAttributes = ["name"];

    constructor() {
      super();
      this.state = false;
      this.trigger = this.querySelector("yc-combobox-trigger");
      this.placeholder = this.trigger.querySelector("yc-combobox-value");
      this.content = this.querySelector("yc-combobox-content");
      this.search = this.querySelector("yc-combobox-search");
    }

    connectedCallback() {
      this.setup();
      this.attachListeners();
      this.search && this.enableSearch();
    }

    setup() {
      const items = this.content.querySelectorAll("yc-combobox-item");

      items.forEach((item) => {
        const { value } = item.attributes;
        const label = item.textContent.trim();
        const checked = item.hasAttribute("checked");
        const disabled = item.hasAttribute("disabled");
        const required = item.hasAttribute("required");

        if (checked) this.placeholder.textContent = label;

        item.outerHTML = `
          <label role="option">
            <span>${label}</span>
            <input type="radio" name="${this.getAttribute("name")}" value="${value?.value}" 
              ${disabled ? "disabled" : ""} ${checked ? "checked" : ""} ${required ? "required" : ""} hidden>
          </label>`;
      });
    }

    attachListeners() {
      this.onSelect();
      this.onTrigger();
      this.onClickOutSide();
    }

    enableSearch() {
      const placeholder = this.search.getAttribute("placeholder");
      const noResultsMsg = this.search.getAttribute("no-results");
      const searchInput = document.createElement("input");
      searchInput.type = "search";
      searchInput.name = "search";
      searchInput.placeholder = placeholder;

      this.search.replaceWith(searchInput);
      this.search = searchInput;

      const options = [...this.content.querySelectorAll("label")];
      this.onSearch(options, noResultsMsg);
    }

    toggleState(visible) {
      this.state = visible;
      this.content.dataset.visible = visible;
    }

    onSelect() {
      const options = this.content.querySelectorAll("label");

      options.forEach((opt) =>
        opt.addEventListener("change", () => {
          this.placeholder.textContent = opt.textContent.trim();
          this.toggleState(false);
        }),
      );
    }

    onTrigger() {
      this.trigger.addEventListener("click", () => {
        this.content.toggleAttribute("is-above", innerHeight - this.trigger.getBoundingClientRect().bottom < this.content.offsetHeight);
        this.toggleState(!this.state);
      });
    }

    onClickOutSide() {
      document.addEventListener("click", (e) => {
        const isTrigger = e.composedPath().includes(this.trigger);
        const isSearch = e.target.tagName === "INPUT";

        if (!isTrigger && !isSearch) this.toggleState(false);
      });
    }

    onSearch(options, no_results_message) {
      this.search.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase();
        let hasMatch = false;

        options.forEach((opt) => {
          const isMatch = opt.textContent.toLowerCase().includes(query);
          opt.hidden = !isMatch;
          hasMatch ||= isMatch;
        });

        this.content.dataset.noResults = hasMatch ? "" : no_results_message;
      });
    }
  }

  customElements.define("yc-combobox", Combobox);
}
