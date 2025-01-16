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
    this.VARIANT_NAME === "upload-image" && this.uploadImage();
  }

  dropdown() {
    const trigger = this.querySelector("[data-trigger]");
    const content = this.querySelector("[data-content]");
    const options = content.querySelectorAll("[data-option]");
    const placeholder = trigger.querySelector("[data-placeholder]");
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

  uploadImage() {
    const input = this.querySelector("input[type='file']");
    const info = this.querySelector("[data-info]");
    const unset = info.querySelector("[data-unset]");

    const toKB = (size) => `${Math.ceil(size / 1024)} KB`;

    const createPreview = () => {
      info.insertAdjacentHTML(
        "afterbegin",
        `<div class="preview" data-preview>
          <img src="${reader.result}" width="50" height="50" />
          <div class="info">
            <span class="name">${file.name}</span>
            <span class="size">${toKB(file.size)}</span>
          </div>
        </div>`,
      );
    };

    const setPreview = () => {
      preview.querySelector("img").src = reader.result;
      preview.querySelector(".name").textContent = file.name;
      preview.querySelector(".size").textContent = toKB(file.size);
    };

    const removePreview = () => {
      info.querySelector("[data-preview]")?.remove();
      input.value = null;
    };

    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return;

      const reader = new FileReader();

      reader.onload = () => {
        const preview = info.querySelector("[data-preview]");

        !preview ? createPreview() : setPreview();
        unset.addEventListener("click", removePreview);
      };

      reader.readAsDataURL(file);
    });
  }
}

customElements.define("yc-variant", Variant);
