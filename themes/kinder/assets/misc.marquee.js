if (!customElements.get("ui-marquee")) {
  class Marquee extends HTMLElement {
    static observedAttributes = ["playback-state", "speed"];

    constructor() {
      super();
      this.cloud = this.querySelector('[ui-marquee="cloud"]');
      this.track = this.querySelector('[ui-marquee="track"]');
    }

    connectedCallback() {
      this._render();
    }

    _render() {
      const items = Array.from(this.cloud.children);

      if (items.length < 1) return;

      const marqueeWidth = this.offsetWidth;
      const totalItemsWidth = items.reduce((sum, el) => sum + el.offsetWidth, 0);

      const copiesToMake = Math.floor(marqueeWidth / totalItemsWidth);

      const fragment = new DocumentFragment();

      for (let i = 0; i < copiesToMake; i++) {
        items.forEach((item) => fragment.appendChild(item.cloneNode(true)));
      }

      this.cloud.appendChild(fragment);
      this.track.appendChild(this.cloud.cloneNode(true));

      const pxPerSecond = parseFloat(this.getAttribute("speed")) || 60;
      const filledCloudWidth = totalItemsWidth * (1 + copiesToMake);

      this.style.setProperty("--playback-speed", `${Math.ceil(filledCloudWidth / pxPerSecond)}s`);

      this.setAttribute("play-state", "running");
    }
  }

  customElements.define("ui-marquee", Marquee);
}
