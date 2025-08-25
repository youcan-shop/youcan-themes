class LinkedFields extends HTMLElement {
  static TYPES = ["country", "region", "city"];

  constructor() {
    super();
    this.locale = document.documentElement.lang || "en";
    this.countryCode = CUSTOMER_COUNTRY_CODE;
    this.regionCode = null;

    for (const name of LinkedFields.TYPES) {
      this[name] = this.querySelector(`select[name='${name}']`);
    }
  }

  connectedCallback() {
    this._render();
  }

  _render() {
    this.fetchOptions();
  }

  async fetchOptions() {
    for (const type of LinkedFields.TYPES) {
      this[type] && (await this.fetchLocationByType(type));
    }
  }

  setUpOptions(type, options) {
    const select = this[type];
    select.innerHTML = "";

    options.forEach((opt, index) => {
      const isDefault = {
        country: opt.code == this.countryCode,
        region: index === 0,
        city: index === 0,
      };
      const label = typeof opt === "string" ? opt : opt.name;
      const value = typeof opt === "string" ? opt : opt.code;

      const option = new Option(label, value, isDefault[type]);
      select.add(option);
    });

    select.addEventListener("change", (e) => this.onChange(e.target.value, type));
  }

  async onChange(value, type) {
    if (type === "country") this.countryCode = value;
    if (type === "region") this.regionCode = value;
    for (const next of { country: LinkedFields.TYPES.slice(1), region: LinkedFields.TYPES.slice(2) }[type] || []) {
      this[next] && (await this.fetchLocationByType(next));
    }
  }

  async fetchLocationByType(type) {
    const fetchMap = {
      country: () => youcanjs.misc.getCountries(this.locale),
      region: () => youcanjs.misc.getCountryRegions(this.countryCode, this.locale),
      city: () => youcanjs.misc.getCountryCities(this.countryCode, this.regionCode, this.locale),
    };

    this.setIsLoading(type, true);

    try {
      const response = await fetchMap[type]?.call();
      if (!response) throw new Error(`Unknown fetch type: ${type}`);

      const map = {
        country: () => this.setUpOptions(type, response.countries),
        region: () => {
          this.regionCode = response.states[0].code;
          this.setUpOptions(type, response.states);
        },
        city: () => this.setUpOptions(type, response.cities),
      };

      map[type]?.call();
    } catch (error) {
      console.error(error);
    } finally {
      this.setIsLoading(type, false);
    }
  }

  setIsLoading(type, is_loading) {
    is_loading
      ? this.querySelector(`select[name='${type}']`).setAttribute("disabled", true)
      : this.querySelector(`select[name='${type}']`).removeAttribute("disabled");
  }
}

customElements.define("ui-linked-fields", LinkedFields);
