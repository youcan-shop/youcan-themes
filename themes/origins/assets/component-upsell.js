class Upsell extends HTMLElement {
  static observedAttributes = ["id", "order-id", "product-offers"];

  constructor() {
    super();
  }

  connectedCallback() {
    this._render();
  }

  _render() {
    this.addEventListener("click", this.handleChoice.bind(this));
  }

  async handleChoice(event) {
    event.target.setAttribute("data-loading", true);
    this.disableActionButtons();

    const answer = event.target.name;

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
    const actionButtons = document.querySelectorAll('[data-upsell-submit]');

    if (!actionButtons.length) return;

    actionButtons.forEach(button => {
      button.disabled = true;
    });
  }
}

customElements.define("yc-upsell", Upsell);
