/*
 * Address forms: load the store's countries and the regions of the selected country
 * (youcanjs location helpers) into the country_code and region selects.
 */
if (!customElements.get("ui-address-fields")) {
  const LOCALE = document.documentElement.lang || "en";
  const cache = { countries: null, regions: {} };

  const getCountries = () => (cache.countries ??= youcanjs.misc.getStoreMarketCountries().then((data) => data?.countries ?? []));
  const getRegions = (code) => (cache.regions[code] ??= youcanjs.misc.getCountryRegions(code, LOCALE).then((data) => data?.states ?? []));

  class AddressFields extends HTMLElement {
    connectedCallback() {
      this.country = this.querySelector("[data-country-select]");
      this.region = this.querySelector("[data-region-select]");
      if (!this.country || !window.youcanjs) return;

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
        if (!countries.length) return;

        const current = this.dataset.country || (typeof CUSTOMER_COUNTRY_CODE !== "undefined" ? CUSTOMER_COUNTRY_CODE : "");
        const selected = countries.some((country) => country.code === current) ? current : countries[0].code;

        this.fill(this.country, countries, selected, (country) => country.code, (country) => country.name);
        await this.loadRegions(this.dataset.region);
      } catch (error) {
        console.error(error);
      }
    }

    async loadRegions(selected = "") {
      if (!this.region) return;

      this.region.disabled = true;
      try {
        const regions = await getRegions(this.country.value);
        this.region.closest(".field").hidden = regions.length === 0;
        this.fill(this.region, regions, selected, (region) => region.name, (region) => region.name);
      } catch (error) {
        console.error(error);
      } finally {
        this.region.disabled = false;
      }
    }
  }

  customElements.define("ui-address-fields", AddressFields);
}
