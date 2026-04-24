if (!customElements.get("ui-marquee")) {
  class Marquee extends HTMLElement {
    static observedAttributes = ["playback-state"];

    constructor() {
      super();
      this.cloud = this.querySelector('[ui-marquee="cloud"]');
      this.track = this.querySelector('[ui-marquee="track"]');
    }

    connectedCallback() {
      requestAnimationFrame(() => this._render());
    }

    _render() {
      const items = Array.from(this.cloud.children);
      const marqueeWidth = this.offsetWidth;
      const totalItemsWidth = items.reduce((sum, el) => sum + el.offsetWidth, 0);
      const copiesToMake = Math.ceil(marqueeWidth / totalItemsWidth);

      for (let i = 0; i < copiesToMake; i++) {
        items.forEach((item) => this.cloud.appendChild(item.cloneNode(true)));
      }

      this.track.appendChild(this.cloud.cloneNode(true));

      this.setAttribute("play-state", "running");
    }
  }

  customElements.define("ui-marquee", Marquee);
}
