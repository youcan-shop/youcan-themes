if (!customElements.get("ui-address-fields")) {
  class AddressFields extends HTMLElement {
    constructor() {
      super();
      this.loadId = 0;
    }

    connectedCallback() {
      if (this.country) return;

      this.country = this.querySelector("select[data-address-country]");
      this.region = this.querySelector("[data-address-region]");
      if (!this.country) return;

      this.country.addEventListener("change", () => this.loadRegions());
      this.loadCountries();
    }

    async loadCountries() {
      const countries = await this.fetchCountries();
      if (!countries.length) return;

      const saved = this.dataset.country;
      const preferred = [saved, typeof CUSTOMER_COUNTRY_CODE !== "undefined" ? CUSTOMER_COUNTRY_CODE : ""].find((code) =>
        countries.some((country) => country.code === code),
      );

      this.fillSelect(
        this.country,
        countries.map(({ code, name }) => ({ value: code, label: name })),
        preferred || countries[0].code,
      );
      await this.loadRegions(this.dataset.region);
    }

    async fetchCountries() {
      try {
        const data = await window.storeMarketCountries;
        if (data?.countries?.length) return data.countries;
      } catch {}

      console.error("Store countries could not be loaded.");
      return [];
    }

    async fetchRegions(countryCode) {
      const locale = document.documentElement.lang || "en";
      const key = `${countryCode}_${locale}`;
      window.storeRegions ??= {};

      if (!window.storeRegions[key]) {
        window.storeRegions[key] = youcanjs.misc.getCountryRegions(countryCode, locale);
      }

      try {
        return await window.storeRegions[key];
      } catch (error) {
        delete window.storeRegions[key];
        throw error;
      }
    }

    async loadRegions(saved = "") {
      if (!this.region) return;
      const loadId = ++this.loadId;
      try {
        if (this.region.tagName === "SELECT") this.region.disabled = true;
        const response = await this.fetchRegions(this.country.value);
        if (loadId !== this.loadId) return;

        const states = response?.states || [];
        if (states.length) this.useRegionSelect();
        if (this.region.tagName === "SELECT") {
          this.fillSelect(this.region, states.map((state) => ({ value: state.name, label: state.name })), saved);
        } else {
          this.region.value = "";
        }
        this.setRegionVisible(states.length > 0);
      } catch (error) {
        if (loadId !== this.loadId) return;
        console.warn("Regions could not be loaded, falling back to a text field.", error);
        this.useRegionInput(saved);
      } finally {
        if (loadId === this.loadId && this.region.tagName === "SELECT") this.region.disabled = false;
      }
    }

    useRegionInput(saved) {
      if (this.region.tagName === "SELECT") {
        const input = document.createElement("input");
        input.type = "text";
        input.name = "region";
        input.autocomplete = "address-level1";
        input.setAttribute("data-address-region", "");
        if (this.region.id) input.id = this.region.id;
        this.region.replaceWith(input);
        this.region = input;
      }

      this.region.value = saved || this.dataset.region || "";
      this.setRegionVisible(true);
    }

    useRegionSelect() {
      if (this.region.tagName === "SELECT") return;

      const select = document.createElement("select");
      select.name = "region";
      select.autocomplete = "address-level1";
      select.setAttribute("data-address-region", "");
      if (this.region.id) select.id = this.region.id;
      this.region.replaceWith(select);
      this.region = select;
    }

    setRegionVisible(visible) {
      const wrapper = this.querySelector("[data-address-region-field]");
      if (wrapper) wrapper.hidden = !visible;
    }

    fillSelect(select, options, selected) {
      select.replaceChildren(
        ...options.map(({ value, label }) => {
          const option = new Option(label, value);
          option.selected = value === selected;
          return option;
        }),
      );
    }
  }

  customElements.define("ui-address-fields", AddressFields);
}
