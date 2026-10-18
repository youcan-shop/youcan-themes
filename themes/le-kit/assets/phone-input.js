import { Component } from "@theme/component";
import { customerCountryCode, getStoreCountries } from "@theme/utilities";

const DEFAULT_COUNTRY_CODE = "MA";

/**
 * Phone field with a country calling code picker, validated with libphonenumber.
 * The full international number is written to the hidden input submitted with the form.
 *
 * Refs: `countrySelect`, `displayedCode`, `number`, `hiddenInput`, `error`.
 */
class PhoneInputComponent extends Component {
  requiredRefs = ["countrySelect", "displayedCode", "number", "hiddenInput"];

  async connectedCallback() {
    super.connectedCallback();
    const { countrySelect, number } = this.refs;

    await this.#renderCountries();
    this.#showSelectedCode();

    countrySelect.addEventListener(
      "change",
      () => {
        this.#toggleError(false);
        this.#updateValue();
        this.#showSelectedCode();
      },
      { signal: this.signal },
    );

    number.addEventListener(
      "input",
      () => {
        this.#toggleError(false);
        this.#syncCountryFromNumber();
      },
      { signal: this.signal },
    );

    number.addEventListener("blur", () => this.#updateValue(), { signal: this.signal });
  }

  /** The number with its calling code, e.g. "+212612345678", or "" while incomplete. */
  get fullNumber() {
    const callingCode = this.refs.countrySelect.value;
    const nationalNumber = this.refs.number.value.trim();
    return callingCode && nationalNumber ? `+${callingCode}${nationalNumber}` : "";
  }

  async #renderCountries() {
    try {
      const { countries } = await getStoreCountries();
      if (!countries?.length) return;

      const isRtl = document.documentElement.dir === "rtl";
      const selected = customerCountryCode || DEFAULT_COUNTRY_CODE;

      this.refs.countrySelect.replaceChildren(
        ...countries.map((country) => {
          const option = new Option(isRtl ? `${country.name} (${country.phone}+)` : `${country.name} (+${country.phone})`, country.phone);
          option.dataset.country = country.code;
          option.dataset.flag = country.code;
          option.dataset.short = `+${country.phone}`;
          option.selected = country.code === selected;
          return option;
        }),
      );
    } catch (error) {
      console.error("[le-kit] Phone country codes could not be loaded.", error);
    }
  }

  #showSelectedCode() {
    const option = this.refs.countrySelect.selectedOptions[0];
    if (option) this.refs.displayedCode.innerHTML = `<bdo dir="ltr">+${option.value}</bdo>`;
  }

  #updateValue() {
    const { hiddenInput } = this.refs;
    const fullNumber = this.fullNumber;

    if (!fullNumber) {
      hiddenInput.value = "";
      return;
    }

    let valid = false;
    try {
      const parsed = libphonenumber.parsePhoneNumber(fullNumber);
      valid = Boolean(parsed?.isValid());
      hiddenInput.value = valid ? parsed.number : "";
    } catch {
      hiddenInput.value = "";
    }

    this.#toggleError(!valid);
  }

  /** A number pasted with its "+" prefix selects the matching country. */
  #syncCountryFromNumber() {
    const { countrySelect, number } = this.refs;
    const value = number.value.trim();
    if (!value.startsWith("+")) return;

    try {
      const parsed = libphonenumber.parsePhoneNumberFromString(value);
      if (!parsed) return;

      number.value = parsed.nationalNumber;
      if ([...countrySelect.options].some((option) => option.value === parsed.countryCallingCode)) {
        countrySelect.value = parsed.countryCallingCode;
        countrySelect.dispatchEvent(new Event("change", { bubbles: true }));
      }
    } catch {
      // Incomplete while typing
    }
  }

  /** @param {boolean} show */
  #toggleError(show) {
    this.refs.error?.setAttribute("data-hidden", String(!show));
  }
}

if (!customElements.get("ui-phone-input")) customElements.define("ui-phone-input", PhoneInputComponent);
