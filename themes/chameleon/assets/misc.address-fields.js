if (!customElements.get("ui-address-fields")) {
  class AddressFields extends HTMLElement {
    static ISO_CODES = "AD AE AF AG AI AL AM AO AR AT AU AW AZ BA BB BD BE BF BG BH BI BJ BM BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FR GA GB GD GE GH GI GM GN GQ GR GT GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KM KN KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NZ OM PA PE PG PH PK PL PS PT PY QA RO RS RU RW SA SC SD SE SG SI SK SL SN SO SR SS SV SY SZ TD TG TH TJ TL TM TN TR TT TW TZ UA UG US UY UZ VE VN YE ZA ZM ZW".split(" ");

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
        if (!data?.countries?.length) throw new Error("No market countries");
        return data.countries;
      } catch (error) {
        console.warn("Store countries could not be loaded, using the full country list.", error);
        return this.allCountries();
      }
    }

    allCountries() {
      const locale = document.documentElement.lang || "en";
      let names;
      try {
        names = new Intl.DisplayNames([locale], { type: "region" });
      } catch {
        names = null;
      }

      return AddressFields.ISO_CODES.map((code) => ({ code, name: names?.of(code) ?? code })).sort((a, b) =>
        a.name.localeCompare(b.name, locale),
      );
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
