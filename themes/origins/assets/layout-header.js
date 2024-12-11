class Header extends HTMLElement {
  constructor() {
    super();
    this.searchBtn = this.querySelector("[data-search-action]");
    this.searchField = this.querySelector("[data-search-field]");
  }

  connectedCallback() {
    this.searchHandler();
  }

  searchHandler() {
    this.searchBtn.addEventListener("click", () => {
      const isHidden = this.searchField.dataset.hidden === "true";
      this.searchField.dataset.hidden = !isHidden;
    });
  }
}

customElements.define("yc-header", Header);
