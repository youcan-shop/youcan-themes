if (!customElements.get("yc-countdown-timer")) {
  class CountdownTimer extends HTMLElement {
    // constructor() {
    //   super();
    // }

    connectedCallback() {
      this._render();
    }

    _render() {
      // eslint-disable-next-line no-console
      console.log("hi");
    }
  }

  customElements.define("yc-countdown-timer", CountdownTimer);
}
