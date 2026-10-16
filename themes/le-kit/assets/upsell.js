if (!customElements.get("ui-upsell")) {
  class Upsell extends HTMLElement {
    connectedCallback() {
      this.actions = [...this.querySelectorAll("button[name]")];
      this.actions.forEach((action) => action.addEventListener("click", () => this.answer(action)));
    }

    async answer(action) {
      const answer = action.name;
      if (answer !== "yes" && answer !== "no") return;

      action.setAttribute("data-loading", "");
      this.actions.forEach((button) => (button.disabled = true));

      try {
        await youcanjs.upsell.answer({
          answer,
          product_offers: this.productOffers,
          order_id: this.getAttribute("order-id"),
          upsell_id: this.getAttribute("upsell-id"),
        });

        window.location.reload();
      } catch (error) {
        window.location.href = "/checkout/thankyou";
      }
    }

    get productOffers() {
      try {
        return JSON.parse(this.getAttribute("product-offers"));
      } catch (error) {
        console.error(error);
        return {};
      }
    }
  }

  customElements.define("ui-upsell", Upsell);
}
