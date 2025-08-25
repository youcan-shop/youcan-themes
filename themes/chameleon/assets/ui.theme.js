if (!customElements.get("ui-theme")) {
  class Theme extends HTMLElement {
    constructor() {
      super();

      this.DARK_MODE = "dark";
      this.LIGHT_MODE = "light";
      this.switch = this.querySelector("input[type='checkbox']");
    }

    connectedCallback() {
      this._render();
    }

    _render() {
      this.switch.checked = this.getThemeMode() === this.DARK_MODE;

      this.switch.addEventListener("change", (e) => {
        this.setThemeMode(e.target.checked ? this.DARK_MODE : this.LIGHT_MODE);
        document.querySelector("body").style.colorScheme = this.getThemeMode();
      });
    }

    getThemeMode() {
      return localStorage.getItem("theme-mode") || this.LIGHT_MODE;
    }

    setThemeMode(mode) {
      localStorage.setItem("theme-mode", mode);
    }
  }

  customElements.define("ui-theme", Theme);
}
