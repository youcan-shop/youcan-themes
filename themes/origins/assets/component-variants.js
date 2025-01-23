if (!customElements.get("yc-select")) {
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
      this.VARIANT_NAME === "upload-image" && this.uploadImage();
    }

    uploadImage() {
      const input = this.querySelector("input[type='file']");
      const info = this.querySelector("[data-info]");
      const unset = info.querySelector("[data-unset]");

      const toKB = (size) => `${Math.ceil(size / 1024)} KB`;

      const createPreview = (file, image_src) => {
        info.insertAdjacentHTML(
          "afterbegin",
          `<div class="preview" data-preview>
            <img src="${image_src}" width="50" height="50" />
            <div class="info">
              <span class="name">${file.name}</span>
              <span class="size">${toKB(file.size)}</span>
            </div>
          </div>`,
        );
      };

      const setPreview = (file, image_src, element) => {
        element.querySelector("img").src = image_src;
        element.querySelector(".name").textContent = file.name;
        element.querySelector(".size").textContent = toKB(file.size);
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
          const base64 = reader.result;
          const preview = info.querySelector("[data-preview]");

          !preview
            ? createPreview(file, base64)
            : setPreview(file, base64, preview);
          unset.addEventListener("click", removePreview);
        };

        reader.readAsDataURL(file);
      });
    }
  }

  customElements.define("yc-variant", Variant);
}
