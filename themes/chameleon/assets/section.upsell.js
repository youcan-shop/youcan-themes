if (!customElements.get("ui-upsell")) {
  class Upsell extends HTMLElement {
    static observedAttributes = ["id", "order-id", "product-offers"];

    constructor() {
      super();

      this.actions = this.querySelectorAll("[ui-button][name]");
    }

    connectedCallback() {
      this._render();
    }

    _render() {
      this.actions.forEach((action) => {
        action.addEventListener("click", () => this.handleChoice(action));
      });
    }

    async handleChoice(action) {
      action.setAttribute("data-loading", true);
      this.disableActionButtons();

      const answer = action.name;

      if (answer !== "yes" && answer !== "no") return;

      const params = {
        answer,
        product_offers: this.productOffers,
        order_id: this.orderId,
        upsell_id: this.id,
      };

      try {
        await youcanjs.upsell.answer(params);

        window.location.reload();
      } catch (error) {
        window.location.href = "/checkout/thankyou";
      }
    }

    get upsellId() {
      return this.getAttribute("id");
    }

    get orderId() {
      return this.getAttribute("order-id");
    }

    get productOffers() {
      try {
        return JSON.parse(this.getAttribute("product-offers"));
      } catch (error) {
        console.error(error);
        return {};
      }
    }

    disableActionButtons() {
      this.actions.forEach((action) => (action.disabled = true));
    }
  }

  customElements.define("ui-upsell", Upsell);
}
