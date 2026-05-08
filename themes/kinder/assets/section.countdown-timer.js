if (!customElements.get("ui-countdown")) {
  class Countdown extends HTMLElement {
    constructor() {
      super();
    }

    connectedCallback() {
      this._render();
    }

    _render() {
      console.log("hi from countdown");
    }
  }

  customElements.define("ui-countdown", Countdown);
}
