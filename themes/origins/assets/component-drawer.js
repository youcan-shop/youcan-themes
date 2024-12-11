class Drawer extends HTMLElement {
  constructor() {
    super();
    this.drawerActions = this.querySelectorAll("[data-toggle]");
  }

  connectedCallback() {
    this.drawerActions.forEach((action) => {
      action.addEventListener("click", () => {
        const isHidden = this.dataset.hidden === "true";
        this.dataset.hidden = !isHidden;
      });
    });
  }
}

customElements.define("yc-drawer", Drawer);
