if (!customElements.get("ui-video-reviews")) {
  class VideoReviews extends HTMLElement {
    constructor() {
      super();

      this.items = this.querySelectorAll("[ui-video-reviews='item']");
      this.player = this.querySelector("#video-player");
      this.video = this.player?.querySelector("video");
    }

    connectedCallback() {
      this.items.forEach((item) => {
        item.addEventListener("click", () => this.onItemClick(item));
      });

      this.player?.addEventListener("toggle", (event) => {
        if (event.newState === "closed") this.onPlayerClose();
      });
    }

    onItemClick(item) {
      const src = item.getAttribute("data-video-src");

      if (!src || !this.video) return;

      this.video.src = src;
      this.video.load();
      this.player.showPopover();

      this.video.addEventListener("loadeddata", () => this.video.play(), { once: true });
    }

    onPlayerClose() {
      if (!this.video) return;

      this.video.pause();
      this.video.removeAttribute("src");
      this.video.load();
    }
  }

  customElements.define("ui-video-reviews", VideoReviews);
}
