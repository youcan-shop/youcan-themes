/*
 * Address forms: load the store's countries and the regions of the selected country
 * (youcanjs location helpers) into the country_code and region selects.
 */
if (!customElements.get("ui-address-fields")) {
  const LOCALE = document.documentElement.lang || "en";
  const cache = { countries: null, regions: {} };

  // ISO 3166-1 alpha-2 codes, used when the store's market countries can't be loaded
  const ISO_CODES =
    "AD AE AF AG AI AL AM AO AR AT AU AW AZ BA BB BD BE BF BG BH BI BJ BM BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FR GA GB GD GE GH GI GM GN GQ GR GT GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KM KN KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NZ OM PA PE PG PH PK PL PS PT PY QA RO RS RU RW SA SC SD SE SG SI SK SL SN SO SR SS SV SY SZ TD TG TH TJ TL TM TN TR TT TW TZ UA UG US UY UZ VE VN YE ZA ZM ZW".split(" ");

  function fallbackCountries() {
    const names = new Intl.DisplayNames([LOCALE], { type: "region" });
    return ISO_CODES.map((code) => ({ code, name: names.of(code) ?? code })).sort((a, b) => a.name.localeCompare(b.name, LOCALE));
  }

  const getCountries = () =>
    (cache.countries ??= (window.youcanjs ? youcanjs.misc.getStoreMarketCountries() : Promise.reject(new Error("youcanjs is not loaded")))
      .then((data) => (data?.countries?.length ? data.countries : fallbackCountries()))
      .catch((error) => {
        console.warn("[le-kit] Store countries could not be loaded, using the full country list.", error);
        return fallbackCountries();
      }));
  const getRegions = (code) => (cache.regions[code] ??= youcanjs.misc.getCountryRegions(code, LOCALE).then((data) => data?.states ?? []));

  class AddressFields extends HTMLElement {
    connectedCallback() {
      this.country = this.querySelector("[data-country-select]");
      this.region = this.querySelector("[data-region-select]");
      if (!this.country) return;

      this.country.addEventListener("change", () => this.loadRegions());
      this.loadCountries();
    }

    fill(select, items, selected, getValue, getLabel) {
      const fragment = new DocumentFragment();
      items.forEach((item) => {
        const option = new Option(getLabel(item), getValue(item));
        option.selected = getValue(item) === selected || getLabel(item) === selected;
        fragment.append(option);
      });
      select.replaceChildren(fragment);
    }

    async loadCountries() {
      try {
        const countries = await getCountries();

        const current = this.dataset.country || (typeof CUSTOMER_COUNTRY_CODE !== "undefined" ? CUSTOMER_COUNTRY_CODE : "");
        const selected = countries.some((country) => country.code === current) ? current : countries[0].code;

        this.fill(this.country, countries, selected, (country) => country.code, (country) => country.name);
        await this.loadRegions(this.dataset.region);
      } catch (error) {
        console.error(error);
      }
    }

    async loadRegions(selected = "") {
      if (!this.region || this.region.tagName !== "SELECT") return;

      this.region.disabled = true;
      try {
        if (!window.youcanjs) throw new Error("youcanjs is not loaded");
        const regions = await getRegions(this.country.value);
        this.region.closest(".field").hidden = regions.length === 0;
        this.fill(this.region, regions, selected, (region) => region.name, (region) => region.name);
      } catch (error) {
        console.warn("[le-kit] Regions could not be loaded, falling back to a text field.", error);
        this.useRegionInput(selected);
      } finally {
        this.region.disabled = false;
      }
    }

    // Replace the region select (and its custom trigger) with a plain text input
    useRegionInput(value) {
      const input = document.createElement("input");
      input.className = "input";
      input.type = "text";
      input.name = "region";
      input.autocomplete = "address-level1";
      input.value = value || this.dataset.region || "";

      this.region.enhancedSelect?.trigger.remove();
      this.region.replaceWith(input);
      this.region = input;
      input.closest(".field").hidden = false;
    }
  }

  customElements.define("ui-address-fields", AddressFields);
}
