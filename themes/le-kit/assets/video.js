import { Component } from "@theme/component";

/**
 * Embed URL for a YouTube, Vimeo, TikTok, Instagram or Facebook link. Background embeds autoplay muted on loop without controls.
 * @param {string} url
 * @param {boolean} background
 * @returns {{ src: string, ratio: number } | null}
 */
export function videoEmbed(url, background) {
  let match;

  if ((match = url.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/))) {
    const id = match[1];
    const params = background ? `autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&disablekb=1` : "autoplay=1";
    return { src: `https://www.youtube-nocookie.com/embed/${id}?${params}&playsinline=1&rel=0`, ratio: url.includes("/shorts/") ? 9 / 16 : 16 / 9 };
  }

  if ((match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/))) {
    return { src: `https://player.vimeo.com/video/${match[1]}?${background ? "background=1" : "autoplay=1"}`, ratio: 16 / 9 };
  }

  if ((match = url.match(/tiktok\.com\/(?:@[\w.-]+\/video|embed(?:\/v2)?|player\/v1)\/(\d+)/))) {
    const chrome = background
      ? "autoplay=1&muted=1&loop=1&controls=0&progress_bar=0&play_button=0&volume_control=0&fullscreen_button=0&timestamp=0"
      : "autoplay=1";
    return { src: `https://www.tiktok.com/player/v1/${match[1]}?${chrome}&music_info=0&description=0&rel=0&native_context_menu=0&closed_caption=0`, ratio: 9 / 16 };
  }

  if ((match = url.match(/instagram\.com\/(?:[\w.]+\/)?(?:p|reels?|tv)\/([\w-]+)/))) {
    return background ? null : { src: `https://www.instagram.com/p/${match[1]}/embed/`, ratio: 9 / 16 };
  }

  if (/facebook\.com\/(?:.+\/videos\/|watch|reel\/)|fb\.watch\//.test(url)) {
    const params = background ? "autoplay=true&mute=true&loop=true" : "autoplay=true";
    return { src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&${params}`, ratio: url.includes("/reel/") ? 9 / 16 : 16 / 9 };
  }

  return null;
}

/**
 * Video from a link (snippets/video-player.liquid). Provider players load near the screen (background) or on play.
 * Refs: `video`, `playButton`.
 */
class VideoComponent extends Component {
  connectedCallback() {
    super.connectedCallback();
    const { signal } = this;
    this.refs.playButton?.addEventListener("click", () => this.play(), { signal });

    if (this.hasAttribute("data-auto-poster")) this.#loadPoster();

    if (this.dataset.mode === "background" && !this.refs.video) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer.disconnect();
          this.#embed(true);
        },
        { rootMargin: "200px" },
      );
      observer.observe(this);
      signal.addEventListener("abort", () => observer.disconnect());
    }
  }

  play() {
    /** @type {HTMLVideoElement | undefined} */
    const video = this.refs.video;
    if (!video) {
      this.#embed(false);
      return;
    }

    if (!video.paused) {
      this.pause();
      return;
    }

    document.querySelectorAll("ui-video[data-playing]").forEach((other) => other !== this && /** @type {VideoComponent} */ (other).pause());
    video.muted = false;
    video.controls = this.hasAttribute("data-controls");
    video.play();
    this.setAttribute("data-playing", "");
  }

  pause() {
    this.refs.video?.pause();
    this.removeAttribute("data-playing");
  }

  /** Uses the video's thumbnail as the cover (Vimeo and TikTok publish it through oEmbed). */
  async #loadPoster() {
    const url = this.dataset.url ?? "";
    const endpoint = /vimeo\.com/.test(url)
      ? "https://vimeo.com/api/oembed.json?url="
      : /tiktok\.com/.test(url)
        ? "https://www.tiktok.com/oembed?url="
        : null;
    if (!endpoint) return;

    try {
      const response = await fetch(endpoint + encodeURIComponent(url), { signal: this.signal });
      const { thumbnail_url: src } = await response.json();
      if (!src) return;

      const image = Object.assign(new Image(), { src, alt: "", loading: "lazy" });
      await image.decode();
      this.querySelector(".placeholder-svg")?.replaceWith(image);
    } catch {
      // The placeholder stays
    }
  }

  /** @param {boolean} background */
  #embed(background) {
    const embed = videoEmbed(this.dataset.url ?? "", background);
    if (!embed) return;

    const iframe = document.createElement("iframe");
    iframe.className = "video-player__frame";
    iframe.src = embed.src;
    iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    iframe.allowFullscreen = true;
    iframe.title = this.querySelector("img")?.alt || "Video";
    if (background) {
      iframe.tabIndex = -1;
      iframe.style.setProperty("--embed-ratio", String(embed.ratio));
    }

    this.append(iframe);
    this.setAttribute("data-playing", "");
    this.refs.playButton?.remove();
  }
}

if (!customElements.get("ui-video")) customElements.define("ui-video", VideoComponent);
