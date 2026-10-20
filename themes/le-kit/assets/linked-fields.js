import { Component } from "@theme/component";
import { customerCountryCode, getCountryCities, getCountryRegions, getStoreCountries } from "@theme/utilities";

/**
 * Checkout country, region and city selects, each filled from the one before it.
 * Refs: `country`, `region`, `city` (each optional). Option values are names, the codes are in `data-code`.
 */
class LinkedFieldsComponent extends Component {
  countryCode = "";
  regionCode = "";

  connectedCallback() {
    super.connectedCallback();

    this.refs.country?.addEventListener("change", () => this.#onChange("country"), { signal: this.signal });
    this.refs.region?.addEventListener("change", () => this.#onChange("region"), { signal: this.signal });

    this.#load(["country", "region", "city"]);
  }

  /** @param {"country" | "region"} type */
  #onChange(type) {
    const code = this.refs[type].selectedOptions[0]?.dataset.code ?? "";

    if (type === "country") {
      this.countryCode = code;
      this.#load(["region", "city"]);
    } else {
      this.regionCode = code;
      this.#load(["city"]);
    }
  }

  /** @param {Array<"country" | "region" | "city">} types Loaded in order, each depends on the previous one */
  async #load(types) {
    for (const type of types) {
      /** @type {HTMLSelectElement | undefined} */
      const select = this.refs[type];
      if (!select) continue;

      select.disabled = true;
      try {
        if (type === "country") {
          const { countries } = await getStoreCountries();
          this.countryCode = countries.some((country) => country.code === customerCountryCode) ? customerCountryCode : countries[0].code;
          this.#fill(select, countries, (country) => country.code === this.countryCode);
        } else if (type === "region") {
          const { states } = await getCountryRegions(this.countryCode);
          this.regionCode = states[0]?.code ?? "";
          this.#fill(select, states, (_, index) => index === 0);
        } else {
          const { cities } = await getCountryCities(this.countryCode, this.regionCode);
          this.#fill(select, cities, (_, index) => index === 0);
        }
      } catch (error) {
        console.error(error);
      } finally {
        select.disabled = false;
      }
    }
  }

  /**
   * @param {HTMLSelectElement} select
   * @param {Array<string | { code: string, name: string }>} items
   * @param {(item: any, index: number) => boolean} isSelected
   */
  #fill(select, items, isSelected) {
    select.replaceChildren(
      ...items.map((item, index) => {
        const name = typeof item === "string" ? item : item.name;
        const selected = isSelected(item, index);
        const option = new Option(name, name, selected, selected);
        option.dataset.code = typeof item === "string" ? item : item.code;
        return option;
      }),
    );
  }
}

if (!customElements.get("ui-linked-fields")) customElements.define("ui-linked-fields", LinkedFieldsComponent);
