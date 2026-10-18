import { Component } from "@theme/component";

/**
 * Replaces the poster with the `data-embed` iframe when the play button is clicked.
 * Refs: `playButton`.
 */
class VideoComponent extends Component {
  connectedCallback() {
    super.connectedCallback();
    this.refs.playButton?.addEventListener("click", () => this.play(), { once: true, signal: this.signal });
  }

  play() {
    if (!this.dataset.embed) return;

    const iframe = document.createElement("iframe");
    iframe.src = this.dataset.embed;
    iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    iframe.allowFullscreen = true;
    iframe.title = this.querySelector("img")?.alt || "Video";

    this.replaceChildren(iframe);
  }
}

/**
 * Video review card: plays with sound on tap and pauses the other cards.
 * Refs: `video`, `playButton`.
 */
class VideoCardComponent extends Component {
  connectedCallback() {
    super.connectedCallback();
    this.refs.playButton?.addEventListener("click", () => this.toggle(), { signal: this.signal });
  }

  toggle() {
    /** @type {HTMLVideoElement | undefined} */
    const video = this.refs.video;
    if (!video) return;

    if (!video.paused) {
      this.pause();
      return;
    }

    document.querySelectorAll("ui-video-card[data-playing]").forEach((card) => card !== this && /** @type {VideoCardComponent} */ (card).pause());
    video.muted = false;
    video.play();
    this.setAttribute("data-playing", "");
  }

  pause() {
    this.refs.video?.pause();
    this.removeAttribute("data-playing");
  }
}

if (!customElements.get("ui-video")) customElements.define("ui-video", VideoComponent);
if (!customElements.get("ui-video-card")) customElements.define("ui-video-card", VideoCardComponent);
