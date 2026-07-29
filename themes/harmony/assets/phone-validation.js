const DEFAULT_COUNTRY_CODE = 'MA';
const customerCountryCode = CUSTOMER_COUNTRY_CODE || DEFAULT_COUNTRY_CODE;

function initPhoneValidation(fieldset) {
  if (fieldset._phoneInit) return;
  fieldset._phoneInit = true;

  const elements = {
    phoneSelectCountryCode: fieldset.querySelector('[data-phone-select-country-code]'),
    phoneDisplayedCountryCode: fieldset.querySelector('[data-phone-displayed-country-code]'),
    phoneNumber: fieldset.querySelector('[data-phone-number]'),
    phoneHiddenInput: fieldset.querySelector('[data-phone-hidden-input]'),
  };

  if (!elements.phoneSelectCountryCode || !elements.phoneDisplayedCountryCode || !elements.phoneNumber || !elements.phoneHiddenInput) return;

  function displaySelectedCountryCode() {
    const selectedOption = elements.phoneSelectCountryCode.options[elements.phoneSelectCountryCode.selectedIndex];
    if (selectedOption) {
      elements.phoneDisplayedCountryCode.innerHTML = `<bdo dir="ltr">+${selectedOption.value}</bdo>`;
    }
  }

  async function buildCountryCodeOptions() {
    try {
      const { countries } = await window.storeMarketCountries;

      if (!countries || !countries.length) return;

      elements.phoneSelectCountryCode.innerHTML = '';

      const isRtl = document.documentElement.dir === 'rtl';
      const fragment = document.createDocumentFragment();

      countries.forEach(country => {
        const option = document.createElement('option');

        option.value = country.phone;
        option.dataset.country = country.code;
        option.textContent = isRtl
          ? `${country.name} (${country.phone}+)`
          : `${country.name} (+${country.phone})`;

        if (country.code === customerCountryCode) {
          option.selected = true;
        }

        fragment.appendChild(option);
      });

      elements.phoneSelectCountryCode.appendChild(fragment);
    } catch (e) {
      console.error('Failed to populate countries', e);
    }
  }

  function getFullPhoneNumber() {
    const countryCode = elements.phoneSelectCountryCode.value;
    const nationalNumber = elements.phoneNumber.value.trim();

    if (!nationalNumber || !countryCode) return '';

    return `+${countryCode}${nationalNumber}`;
  }

  function toggleError(show) {
    const phoneErrorElement = fieldset.closest('form')?.querySelector('[data-phone-error]') || document.querySelector('[data-phone-error]');
    fieldset.classList.toggle('error', show);
    if (phoneErrorElement) phoneErrorElement.style.display = show ? 'block' : 'none';
  }

  function updatePhoneField() {
    const fullNumber = getFullPhoneNumber();

    if (!fullNumber) {
      elements.phoneHiddenInput.value = '';
      return;
    }

    try {
      const parsed = libphonenumber.parsePhoneNumber(fullNumber);
      if (parsed && parsed.isValid()) {
        elements.phoneHiddenInput.value = parsed.number;
        toggleError(false);
      } else {
        elements.phoneHiddenInput.value = '';
        toggleError(true);
      }
    } catch (e) {
      elements.phoneHiddenInput.value = '';
      toggleError(true);
    }
  }

  function syncCountryCodeFromInput() {
    const inputValue = elements.phoneNumber.value.trim();
    if (!inputValue.startsWith('+')) return;

    try {
      const parsed = libphonenumber.parsePhoneNumberFromString(inputValue);
      if (parsed) {
        elements.phoneNumber.value = parsed.nationalNumber;

        const matchingOption = Array.from(elements.phoneSelectCountryCode.options).find(
          option => option.value === parsed.countryCallingCode
        );

        if (matchingOption) {
          elements.phoneSelectCountryCode.value = parsed.countryCallingCode;
          displaySelectedCountryCode();
        }
      }
    } catch (e) {
      // Ignore parsing errors during typing
    }
  }

  function attachListeners() {
    elements.phoneSelectCountryCode.addEventListener('change', () => {
      toggleError(false);
      updatePhoneField();
      displaySelectedCountryCode();
    });

    elements.phoneNumber.addEventListener('input', () => {
      toggleError(false);
      syncCountryCodeFromInput();
    });

    elements.phoneNumber.addEventListener('blur', updatePhoneField);
  }

  async function init() {
    await buildCountryCodeOptions();
    attachListeners();
    displaySelectedCountryCode();
  }

  init();
}

document.querySelectorAll('[data-phone-fieldset]').forEach(fieldset => initPhoneValidation(fieldset));
