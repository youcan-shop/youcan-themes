if (!customElements.get("yc-upload")) {
  class Upload extends HTMLElement {
    static observedAttributes = ["name"];
    static MAXIMUM_FILE_SIZE = 2;
    static BYTES_IN_KB = 1024;
    static KB_IN_MB = 1024;

    constructor() {
      super();
      this.input = this.querySelector("input[type='file']");
      this.info = this.querySelector("[data-info]");
      this.unset = this.info.querySelector("[data-unset]");
    }

    connectedCallback() {
      this._render();
    }

    _render() {
      this.onUpload();
    }

    onUpload() {
      this.input.addEventListener("change", () => {
        const file = this.input.files?.[0];
        if (!file) return;

        const fileSizeInKB = file.size / Upload.BYTES_IN_KB;
        const fileSizeInMB = fileSizeInKB / Upload.KB_IN_MB;

        if (fileSizeInMB > WriteReview.MAXIMUM_FILE_SIZE) {
          const message = window.errorStrings.large_file;
          toast.show(message.replace("[file]", `"${file.name}"`), "error");

          return;
        }

        const reader = new FileReader();

        reader.onload = () => {
          const base64 = reader.result;
          const preview = this.info.querySelector("[data-preview]");

          !preview ? this.create(file, base64) : this.update(file, base64, preview);
          this.unset.addEventListener("click", () => this.remove());
        };

        reader.readAsDataURL(file);
      });
    }

    toKB(size) {
      return `${Math.ceil(size / 1024)} KB`;
    }

    create(file, image_src) {
      this.info.insertAdjacentHTML(
        "afterbegin",
        `<div class="preview" data-preview>
          <img src="${image_src}" width="50" height="50" />
          <div class="metadata">
            <span class="name">${file.name}</span>
            <span class="size">${this.toKB(file.size)}</span>
          </div>
        </div>`,
      );
    }

    update(file, image_src, element) {
      element.querySelector("img").src = image_src;
      element.querySelector(".name").textContent = file.name;
      element.querySelector(".size").textContent = this.toKB(file.size);
    }

    remove() {
      this.info.querySelector("[data-preview]")?.remove();
      this.input.value = null;
    }
  }

  customElements.define("yc-upload", Upload);
}
