if (!customElements.get("ui-special-offer")) {
  class SpecialOffer extends HTMLElement {
    constructor() {
      super();

      this.submitButton = this.querySelector("[ui-special-offer='submit']");
      this.skipButtons = this.querySelectorAll("[ui-special-offer='skip']");
      this.items = this.querySelectorAll("[ui-special-offer='item']");
      this.triggerShopButton = null;
    }

    connectedCallback() {
      this.submitButton?.addEventListener("click", this.onSubmit.bind(this));

      this.skipButtons.forEach((button) => {
        button.addEventListener("click", this.onSkip.bind(this));
      });

      this.items.forEach((item) => {
        if (item.matches("input[type='checkbox']")) {
          item.addEventListener("change", this.updateSubmitState.bind(this));
        }
      });
    }

    get checkedItems() {
      return [...this.items].filter((item) => item.matches("input[type='checkbox']") && item.checked).map((item) => item.value);
    }

    updateSubmitState() {
      if (!this.submitButton) return;

      this.submitButton.disabled = this.checkedItems.length === 0;
    }

    open(shopButton) {
      this.triggerShopButton = shopButton;
      this.updateSubmitLabel();
      this.showPopover();
    }

    updateSubmitLabel() {
      const label = this.submitButton?.querySelector("span");
      if (!label) return;

      label.textContent =
        this.triggerShopButton.getAttribute("checkout-type") === "express" || this.triggerShopButton.hasAttribute("skip-to-checkout")
          ? window.specialOffer.add_items_to_cart
          : window.specialOffer.add_to_order;
    }

    onSubmit() {
      if (!this.triggerShopButton) return;

      if (this.checkedItems.length) {
        const baseId = this.triggerShopButton.getAttribute("variant-id").split(",")[0];
        const ids = [baseId, ...this.checkedItems];

        this.triggerShopButton.setAttribute("variant-id", ids.join(","));
        this.triggerShopButton.toggleAttribute("bulk", ids.length > 1);
      }

      this.triggerShopButton.onBuyClicked(new Event("click"));
      this.close();
    }

    onSkip() {
      if (!this.triggerShopButton) return;

      this.triggerShopButton.setAttribute("skip-offer", "");
      this.triggerShopButton.onBuyClicked(new Event("click"));
      this.close();
    }

    close() {
      this.hidePopover();
      this.clearItems();
      this.updateSubmitState();
      this.triggerShopButton = null;
      this.updateSubmitLabel();
    }

    clearItems() {
      [...this.items].filter((item) => item.matches("input[type='checkbox']")).forEach((item) => (item.checked = false));
    }
  }

  customElements.define("ui-special-offer", SpecialOffer);
}
