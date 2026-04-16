if (!customElements.get("ui-phone-validation")) {
  class PhoneValidation extends HTMLElement {
    static DEFAULT_COUNTRY_CODE = "MA";
    static CUSTOMER_COUNTRY_CODE = CUSTOMER_COUNTRY_CODE || PhoneValidation.DEFAULT_COUNTRY_CODE;
    
    constructor() {
      super();

      this.phoneSelectCountryCode = this.querySelector("[ui-phone-select-country-code]");
      this.phoneDisplayedCountryCode = this.querySelector("[ui-phone-displayed-country-code]");
      this.phoneNumber = this.querySelector("[ui-phone-number]");
      this.phoneHiddenInput = this.querySelector("[ui-phone-hidden-input]");
      this.phoneErrorElement = this.querySelector("[ui-phone-error]");
    }

    async connectedCallback() {
      await this._render();
    }

    async _render() {
      if (!this.validateElements()) return;

      await this.buildCountryCodeOptions();
      this.attachListeners();
      this.displaySelectedCountryCode();
    }

    validateElements() {
      return (
        this.phoneSelectCountryCode &&
        this.phoneDisplayedCountryCode &&
        this.phoneNumber &&
        this.phoneHiddenInput
      );
    }

    displaySelectedCountryCode() {
      const selectedOption = this.phoneSelectCountryCode.options[this.phoneSelectCountryCode.selectedIndex];

      if (selectedOption) {
        this.phoneDisplayedCountryCode.innerHTML = `<bdo dir="ltr">+${selectedOption.value}</bdo>`;
      }
    }

    async buildCountryCodeOptions() {
      try {
        const { countries } = await window.storeMarketCountries;
        if (!countries || !countries.length) return;

        this.phoneSelectCountryCode.innerHTML = "";

        const isRtl = document.documentElement.dir === "rtl";
        const fragment = document.createDocumentFragment();

        countries.forEach((country) => {
          const option = document.createElement("option");

          option.value = country.phone;
          option.dataset.country = country.code;
          option.textContent = isRtl
            ? `${country.name} (${country.phone}+)`
            : `${country.name} (+${country.phone})`;

          if (country.code === PhoneValidation.CUSTOMER_COUNTRY_CODE) {
            option.selected = true;
          }

          fragment.appendChild(option);
        });

        this.phoneSelectCountryCode.appendChild(fragment);
      } catch (e) {
        console.error("Failed to populate countries", e);
      }
    }

    getFullPhoneNumber() {
      const countryCode = this.phoneSelectCountryCode.value;
      const nationalNumber = this.phoneNumber.value.trim();

      if (!nationalNumber || !countryCode) return "";

      return `+${countryCode}${nationalNumber}`;
    }

    toggleError(show) {
      if (this.phoneErrorElement) {
        this.phoneErrorElement.style.display = show ? "block" : "none";
      }
    }

    updatePhoneField() {
      const fullNumber = this.getFullPhoneNumber();

      if (!fullNumber) {
        this.phoneHiddenInput.value = "";
        return;
      }

      try {
        const parsed = libphonenumber.parsePhoneNumber(fullNumber);
        if (parsed && parsed.isValid()) {
          this.phoneHiddenInput.value = parsed.number;
          this.toggleError(false);
        } else {
          this.phoneHiddenInput.value = "";
          this.toggleError(true);
        }
      } catch (e) {
        this.phoneHiddenInput.value = "";
        this.toggleError(true);
      }
    }

    syncCountryCodeFromInput() {
      const inputValue = this.phoneNumber.value.trim();
      if (!inputValue.startsWith("+")) return;

      try {
        const parsed = libphonenumber.parsePhoneNumberFromString(inputValue);
        if (parsed) {
          this.phoneNumber.value = parsed.nationalNumber;

          const matchingOption = Array.from(this.phoneSelectCountryCode.options).find(
            (option) => option.value === parsed.countryCallingCode
          );

          if (matchingOption) {
            this.phoneSelectCountryCode.value = parsed.countryCallingCode;
            this.displaySelectedCountryCode();
          }
        }
      } catch (e) {
        // Ignore parsing errors during typing
      }
    }

    attachListeners() {
      this.phoneSelectCountryCode.addEventListener("change", () => {
        this.toggleError(false);
        this.updatePhoneField();
        this.displaySelectedCountryCode();
      });

      this.phoneNumber.addEventListener("input", () => {
        this.toggleError(false);
        this.syncCountryCodeFromInput();
      });

      this.phoneNumber.addEventListener("blur", () => this.updatePhoneField());
    }
  }

  customElements.define("ui-phone-validation", PhoneValidation);
}
