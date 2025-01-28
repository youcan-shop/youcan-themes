class Drawer extends HTMLElement {
  constructor() {
    super();
    this.drawerActions = this.querySelectorAll("[data-toggle]");
  }

  connectedCallback() {
    this.drawerActions.forEach((action) => {
      action.addEventListener("click", this.toggle.bind(this));
    });
  }

  toggle() {
    const isHidden = this.dataset.hidden === "true";
    if (isHidden) {
      this.open();
    } else {
      this.close();
    }
  }

  open() {
    this.dataset.hidden = "false";
    document.body.setAttribute("data-scroll-locked", "true");
  }

  close() {
    this.dataset.hidden = "true";
    document.body.removeAttribute("data-scroll-locked");
  }
}

customElements.define("yc-drawer", Drawer);
