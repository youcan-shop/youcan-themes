import { Component } from "@theme/component";
import { customerCountryCode, getCountryRegions, getStoreCountries } from "@theme/utilities";

const locale = document.documentElement.lang || "en";

/** ISO 3166-1 alpha-2 codes, used when the store's market countries can't be loaded. */
const ISO_CODES =
  "AD AE AF AG AI AL AM AO AR AT AU AW AZ BA BB BD BE BF BG BH BI BJ BM BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FR GA GB GD GE GH GI GM GN GQ GR GT GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KM KN KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NZ OM PA PE PG PH PK PL PS PT PY QA RO RS RU RW SA SC SD SE SG SI SK SL SN SO SR SS SV SY SZ TD TG TH TJ TL TM TN TR TT TW TZ UA UG US UY UZ VE VN YE ZA ZM ZW".split(
    " ",
  );

/** @returns {Array<{ code: string, name: string }>} */
function allCountries() {
  const names = new Intl.DisplayNames([locale], { type: "region" });
  return ISO_CODES.map((code) => ({ code, name: names.of(code) ?? code })).sort((a, b) => a.name.localeCompare(b.name, locale));
}

/** @type {Promise<Array<{ code: string, name: string }>> | undefined} */
let countries;

function getCountries() {
  countries ??= getStoreCountries()
    .then((data) => (data?.countries?.length ? data.countries : allCountries()))
    .catch((error) => {
      console.warn("[le-kit] Store countries could not be loaded, using the full country list.", error);
      return allCountries();
    });
  return countries;
}

/**
 * @param {HTMLSelectElement} select
 * @param {Array<{ value: string, label: string }>} options
 * @param {string} selected Matches a value or a label
 */
function fillSelect(select, options, selected) {
  select.replaceChildren(
    ...options.map(({ value, label }) => {
      const option = new Option(label, value);
      option.selected = value === selected || label === selected;
      return option;
    }),
  );
}

/**
 * Fills the country and region selects of an address form with youcanjs location data.
 * Refs: `country`, `region`. The saved values come from `data-country` and `data-region`.
 */
class AddressFieldsComponent extends Component {
  requiredRefs = ["country"];

  connectedCallback() {
    super.connectedCallback();
    this.refs.country.addEventListener("change", () => this.loadRegions(), { signal: this.signal });
    this.loadCountries();
  }

  async loadCountries() {
    const list = await getCountries();
    const current = this.dataset.country || customerCountryCode;
    const selected = list.some((country) => country.code === current) ? current : list[0].code;

    fillSelect(
      this.refs.country,
      list.map(({ code, name }) => ({ value: code, label: name })),
      selected,
    );
    await this.loadRegions(this.dataset.region);
  }

  /** @param {string} [selected] */
  async loadRegions(selected = "") {
    /** @type {HTMLSelectElement | undefined} */
    const region = this.refs.region;
    if (!(region instanceof HTMLSelectElement)) return;

    region.disabled = true;
    try {
      if (!window.youcanjs) throw new Error("youcanjs is not loaded");
      const { states = [] } = (await getCountryRegions(this.refs.country.value)) ?? {};

      /** @type {HTMLElement} */ (region.closest(".field")).hidden = states.length === 0;
      fillSelect(
        region,
        states.map((/** @type {{ name: string }} */ state) => ({ value: state.name, label: state.name })),
        selected,
      );
    } catch (error) {
      console.warn("[le-kit] Regions could not be loaded, falling back to a text field.", error);
      this.#useRegionInput(selected);
    } finally {
      region.disabled = false;
    }
  }

  /** @param {string} value */
  #useRegionInput(value) {
    /** @type {HTMLSelectElement & { enhancedSelect?: { trigger: HTMLElement } }} */
    const select = this.refs.region;
    const input = Object.assign(document.createElement("input"), {
      className: "input",
      type: "text",
      name: "region",
      autocomplete: "address-level1",
      value: value || this.dataset.region || "",
    });
    input.setAttribute("ref", "region");

    select.enhancedSelect?.trigger.remove();
    select.replaceWith(input);
    /** @type {HTMLElement} */ (input.closest(".field")).hidden = false;
  }
}

if (!customElements.get("ui-address-fields")) customElements.define("ui-address-fields", AddressFieldsComponent);
