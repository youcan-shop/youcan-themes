class Variant extends HTMLElement {
  static observedAttributes = ["name"];

  constructor() {
    super();
    this.VARIANT_NAME = this.getAttribute("name");
  }

  connectedCallback() {
    this._render();
  }

  _render() {
    this.VARIANT_NAME === "dropdown" && this.dropdown();
    this.VARIANT_NAME === "upload-image" && this.dropdown();
  }

  dropdown() {
    const trigger = this.querySelector("[data-trigger]");
    const placeholder = trigger.querySelector("[data-placeholder]");
    const content = this.querySelector("[data-content]");
    const options = content.querySelectorAll("[data-option]");
    let state = content.dataset.hidden === "true";

    const setPlaceholder = (option) => {
      placeholder.textContent = option.querySelector("span").textContent;
    };

    const setState = (hidden) => {
      state = hidden;
      content.dataset.hidden = hidden;
      document.body.toggleAttribute("data-scroll-locked", !hidden);
    };

    const clickOutside = (e) =>
      !e.composedPath().includes(trigger) && setState(true);

    const toggle = () => {
      content.toggleAttribute(
        "is-above",
        innerHeight - trigger.getBoundingClientRect().bottom <
          content.offsetHeight,
      );

      setState(!state);
    };

    trigger.addEventListener("click", toggle);
    document.addEventListener("click", clickOutside);

    options.forEach((opt) =>
      opt.addEventListener("change", () => setPlaceholder(opt)),
    );
  }

  upload_image() {}
}

customElements.define("yc-variant", Variant);
