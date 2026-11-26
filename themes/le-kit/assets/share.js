import { Component } from "@theme/component";

/**
 * Social share links and a copy-link button for the current page.
 * Refs: `links[]` (with `data-network`), `copyButton` (with `data-copied-label`), `copyLabel`.
 */
class ShareComponent extends Component {
  connectedCallback() {
    super.connectedCallback();

    const url = encodeURIComponent(this.url);
    const text = encodeURIComponent(this.dataset.title ?? document.title);
    /** @type {Record<string, string>} */
    const shareUrls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      x: `https://x.com/intent/post?url=${url}&text=${text}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
    };

    (this.refs.links ?? []).forEach((/** @type {HTMLAnchorElement} */ link) => (link.href = shareUrls[link.dataset.network ?? ""] ?? "#"));
    this.refs.copyButton?.addEventListener("click", () => this.copy(), { signal: this.signal });
  }

  get url() {
    return window.location.href.split("?")[0];
  }

  async copy() {
    const { copyButton, copyLabel } = this.refs;

    try {
      await navigator.clipboard.writeText(this.url);
    } catch (error) {
      console.error(error);
      return;
    }

    if (!copyLabel) return;
    const original = copyLabel.textContent;
    copyLabel.textContent = copyButton.dataset.copiedLabel;
    setTimeout(() => (copyLabel.textContent = original), 2000);
  }
}

if (!customElements.get("ui-share")) customElements.define("ui-share", ShareComponent);
