/*
 * Custom select: enhances every <select class="select"> (except [data-native]).
 * - Desktop: a listbox popup anchored to the trigger.
 * - Mobile (< 750px): a bottom drawer.
 * The native <select> stays in the DOM (visually hidden) so forms, validation and
 * existing "change" listeners keep working. Programmatic option changes are synced.
 */
(() => {
  const MOBILE = window.matchMedia("(max-width: 749px)");
  const CHECK_ICON =
    '<svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  let uid = 0;

  function labelFor(select) {
    if (select.getAttribute("aria-label")) return select.getAttribute("aria-label");
    if (select.id) {
      const label = document.querySelector(`label[for="${CSS.escape(select.id)}"]`);
      if (label) return label.textContent.trim();
    }
    const field = select.closest("label, fieldset");
    const text = field?.querySelector(".field__label, legend, .sort__label, .variant-option__label");
    return text ? text.childNodes[0]?.textContent.trim() || text.textContent.trim() : "";
  }

  class EnhancedSelect {
    constructor(select) {
      this.select = select;
      this.id = `select-${++uid}`;
      this.highlighted = -1;
      this.typed = "";

      this.trigger = document.createElement("button");
      this.trigger.type = "button";
      this.trigger.className = `${select.className} select-trigger`;
      this.trigger.setAttribute("aria-haspopup", "listbox");
      this.trigger.setAttribute("aria-expanded", "false");
      this.trigger.setAttribute("aria-controls", this.id);
      this.trigger.innerHTML = '<span class="select-trigger__value"></span>';

      select.classList.add("select--enhanced");
      select.tabIndex = -1;
      select.setAttribute("aria-hidden", "true");
      select.after(this.trigger);

      this.trigger.addEventListener("click", () => this.toggle());
      this.trigger.addEventListener("keydown", (event) => this.onTriggerKey(event));
      select.addEventListener("change", () => this.sync());
      select.addEventListener("invalid", () => this.trigger.setAttribute("aria-invalid", "true"));

      new MutationObserver(() => this.sync()).observe(select, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["disabled", "selected", "label"],
      });

      this.sync();
    }

    get options() {
      return [...this.select.options];
    }

    sync() {
      const option = this.select.selectedOptions[0];
      this.trigger.querySelector(".select-trigger__value").textContent = option?.textContent.trim() ?? "";
      this.trigger.disabled = this.select.disabled;
      if (this.select.value) this.trigger.removeAttribute("aria-invalid");
      if (this.popup?.matches(":popover-open")) this.renderOptions();
    }

    buildPopup() {
      this.popup = document.createElement("div");
      this.popup.id = this.id;
      this.popup.className = "select-popup color-scheme";
      this.popup.setAttribute("popover", "");
      this.popup.setAttribute("role", "listbox");
      this.popup.tabIndex = -1;

      const scheme = [...(this.trigger.closest(".color-scheme")?.classList ?? [])].find((name) => name.startsWith("color-") && name !== "color-scheme");
      if (scheme) this.popup.classList.add(scheme);

      this.popup.innerHTML = `
        <div class="select-popup__header">
          <span class="select-popup__handle" aria-hidden="true"></span>
          <p class="select-popup__title"></p>
        </div>
        <div class="select-popup__list"></div>`;

      this.list = this.popup.querySelector(".select-popup__list");
      this.popup.addEventListener("keydown", (event) => this.onListKey(event));
      this.popup.addEventListener("click", (event) => {
        // The popup can sit inside a <label>: don't let the label forward the click to the hidden select
        event.preventDefault();
        const item = event.target.closest("[role='option']");
        if (item && item.getAttribute("aria-disabled") !== "true") this.choose(Number(item.dataset.index));
        if (event.target === this.popup) this.close();
      });
      this.popup.addEventListener("pointermove", (event) => {
        const item = event.target.closest("[role='option']");
        if (item) this.highlight(Number(item.dataset.index), false);
      });
      this.popup.addEventListener("toggle", (event) => {
        const open = event.newState === "open";
        this.trigger.setAttribute("aria-expanded", String(open));
        if (!open) {
          window.removeEventListener("resize", this.onReposition);
          window.removeEventListener("scroll", this.onReposition, true);
        }
      });

      this.onReposition = () => this.position();
      // Keep the popup next to its trigger: inside dialogs (not inert) and nested popovers (drawers stay open)
      this.trigger.after(this.popup);
    }

    renderOptions() {
      this.list.replaceChildren(
        ...this.options.map((option, index) => {
          const item = document.createElement("div");
          item.className = "select-popup__option";
          item.setAttribute("role", "option");
          item.dataset.index = index;
          item.id = `${this.id}-${index}`;
          item.setAttribute("aria-selected", String(option.selected));
          if (option.disabled) item.setAttribute("aria-disabled", "true");
          item.innerHTML = `<span class="select-popup__check">${CHECK_ICON}</span><span class="select-popup__label"></span>`;
          item.querySelector(".select-popup__label").textContent = option.textContent.trim();
          return item;
        }),
      );
    }

    toggle() {
      this.popup?.matches(":popover-open") ? this.close() : this.open();
    }

    open() {
      if (this.select.disabled) return;
      if (!this.popup) this.buildPopup();

      this.popup.querySelector(".select-popup__title").textContent = labelFor(this.select);
      this.popup.classList.toggle("select-popup--drawer", MOBILE.matches);
      this.renderOptions();
      this.popup.showPopover();
      this.position();

      if (!MOBILE.matches) {
        window.addEventListener("resize", this.onReposition);
        window.addEventListener("scroll", this.onReposition, true);
      }

      this.highlight(Math.max(0, this.select.selectedIndex), true);
      this.popup.focus({ preventScroll: true });
    }

    close(focusTrigger = true) {
      if (this.popup?.matches(":popover-open")) this.popup.hidePopover();
      if (focusTrigger) this.trigger.focus({ preventScroll: true });
    }

    position() {
      if (!this.popup || MOBILE.matches) {
        this.popup?.style.removeProperty("top");
        this.popup?.style.removeProperty("left");
        this.popup?.style.removeProperty("min-width");
        return;
      }

      const rect = this.trigger.getBoundingClientRect();
      const popupHeight = this.popup.offsetHeight;
      const spaceBelow = window.innerHeight - rect.bottom;
      const above = spaceBelow < popupHeight + 8 && rect.top > spaceBelow;
      const width = Math.max(rect.width, 160);
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);

      this.popup.style.minWidth = `${width}px`;
      this.popup.style.left = `${left}px`;
      this.popup.style.top = above ? `${Math.max(8, rect.top - popupHeight - 4)}px` : `${rect.bottom + 4}px`;
      this.popup.dataset.side = above ? "top" : "bottom";
    }

    highlight(index, scroll) {
      const items = [...this.list.children];
      if (!items.length) return;

      this.highlighted = Math.min(Math.max(index, 0), items.length - 1);
      items.forEach((item, i) => item.toggleAttribute("data-highlighted", i === this.highlighted));
      this.popup.setAttribute("aria-activedescendant", items[this.highlighted].id);
      if (scroll) items[this.highlighted].scrollIntoView({ block: "nearest" });
    }

    move(step) {
      const items = [...this.list.children];
      let index = this.highlighted;

      for (let i = 0; i < items.length; i++) {
        index = (index + step + items.length) % items.length;
        if (items[index].getAttribute("aria-disabled") !== "true") break;
      }

      this.highlight(index, true);
    }

    choose(index) {
      const option = this.options[index];
      if (!option || option.disabled) return;

      const changed = this.select.selectedIndex !== index;
      this.select.selectedIndex = index;
      this.sync();
      this.close();

      if (changed) {
        this.select.dispatchEvent(new Event("input", { bubbles: true }));
        this.select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }

    typeahead(key) {
      clearTimeout(this.typedTimer);
      this.typed += key.toLowerCase();
      this.typedTimer = setTimeout(() => (this.typed = ""), 600);

      const index = this.options.findIndex((option) => !option.disabled && option.textContent.trim().toLowerCase().startsWith(this.typed));
      if (index !== -1) this.highlight(index, true);
    }

    onTriggerKey(event) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        this.open();
      }
    }

    onListKey(event) {
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          this.move(1);
          break;
        case "ArrowUp":
          event.preventDefault();
          this.move(-1);
          break;
        case "Home":
          event.preventDefault();
          this.highlight(0, true);
          break;
        case "End":
          event.preventDefault();
          this.highlight(this.options.length - 1, true);
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          this.choose(this.highlighted);
          break;
        case "Tab":
          this.close(false);
          break;
        default:
          if (event.key.length === 1 && !event.metaKey && !event.ctrlKey) this.typeahead(event.key);
      }
    }
  }

  function enhance(root = document) {
    root.querySelectorAll?.("select.select:not([data-native]):not(.select--enhanced)").forEach((select) => {
      select.enhancedSelect = new EnhancedSelect(select);
    });
  }

  enhance();

  // Selects added later: quick add, section re-renders, cart refresh, theme editor
  new MutationObserver((mutations) => {
    mutations.forEach((mutation) =>
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        if (node.matches("select.select")) enhance(node.parentElement);
        else enhance(node);
      }),
    );
  }).observe(document.body, { childList: true, subtree: true });
})();
