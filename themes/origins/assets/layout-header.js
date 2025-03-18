class Header extends HTMLElement {
  constructor() {
    super();
    this.searchBtn = this.querySelector("[data-search-action]");
    this.searchField = this.querySelector("[data-search-field]");
  }

  connectedCallback() {
    this.searchBtn.addEventListener("click", () => this.toggle());
    document.addEventListener("click", (e) => this.onClickOutside(e));
  }

  toggle() {
    this.searchField.dataset.visibility = this.searchField.dataset.visibility !== "true";
  }

  onClickOutside(e) {
    if (![this.searchBtn, this.searchField].some((el) => e.composedPath().includes(el))) {
      this.searchField.dataset.visibility = false;
    }
  }
}

customElements.define("yc-header", Header);
