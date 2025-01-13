class Toast {
  constructor() {
    this.container =
      document.querySelector("yc-toast-container") || this.createContainer();

    this.ICONS = {
      close: `<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />`,
      warning: `<path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm-8,56a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm8,104a12,12,0,1,1,12-12A12,12,0,0,1,128,184Z" />`,
      success: `<path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm45.66,85.66-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z" />`,
      info: `<path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm-4,48a12,12,0,1,1-12,12A12,12,0,0,1,124,72Zm12,112a16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40a8,8,0,0,1,0,16Z" />`,
      error: `<path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm37.66,130.34a8,8,0,0,1-11.32,11.32L128,139.31l-26.34,26.35a8,8,0,0,1-11.32-11.32L116.69,128,90.34,101.66a8,8,0,0,1,11.32-11.32L128,116.69l26.34-26.35a8,8,0,0,1,11.32,11.32L139.31,128Z" />`,
    };
  }

  createContainer() {
    return document.body.appendChild(
      document.createElement("yc-toast-container"),
    );
  }

  create(message = "Hello world", type = "info", duration = 3000) {
    const template = document.createElement("template");

    template.innerHTML = `
      <yc-toast data-type="${type}">
        <div class="toast-content">
          <div class="icon">${this.icon(type)}</div>
          ${message}
        </div>
        <button class="ghost" aria-label="close" data-close>
          ${this.icon("close", false, 18)}
        </button>
      </yc-toast>
    `;

    const toast = template.content.firstElementChild.cloneNode(true);
    this.container.appendChild(toast);
    
    toast.toggleAttribute("data-multiline", toast.offsetHeight > 49);

    setTimeout(() => this.remove(toast), duration);
    toast
      .querySelector("[data-close]")
      .addEventListener("click", () => this.remove(toast));
  }

  remove(toast) {
    const previous = toast.previousElementSibling;

    const getInsetBlockEnd = (element) => {
      const inset =
        getComputedStyle(element).getPropertyValue("inset-block-end");
      return inset === "auto" ? 0 : inset;
    };

    if (previous) {
      previous.style.insetBlockEnd = getInsetBlockEnd(toast);
      if (previous.previousElementSibling) {
        previous.previousElementSibling.style.insetBlockEnd =
          getInsetBlockEnd(previous);
      }
    }

    toast.toggleAttribute("data-removed", true);
    setTimeout(() => toast.remove(), 300);
  }

  icon(name = "info", fill = true, size = 26) {
    return `
      <svg
        width="${size}" height="${size}" 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" viewBox="${fill ? "0 0 256 256" : "0 0 24 24"}" 
        stroke-width="1.5" stroke="currentColor">
        ${this.ICONS[name]}       
      </svg>
    `;
  }
}

const toast = new Toast();
["error", "info", "success", "warning"].forEach((type, index) =>
  setTimeout(() => {
    toast.create(
      "You can customize the type of toast you want to render",
      type,
    );
  }, 500 * index),
);
