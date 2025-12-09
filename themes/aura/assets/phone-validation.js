const DEFAULT_COUNTRY_CODE = 'MA';
const elements = {
  phoneCountryCodes: null,
  phoneDisplayedCountryCode: null,
  phoneNumber: null,
  phoneHiddenInput: null
};

function getElements() {
  elements.phoneCountryCodes = document.querySelector('[data-phone-country-codes]');
  elements.phoneDisplayedCountryCode = document.querySelector('[data-phone-displayed-country-code]');
  elements.phoneNumber = document.querySelector('[data-phone-number]');
  elements.phoneHiddenInput = document.querySelector('[data-phone-hidden-input]');

  return elements.phoneCountryCodes && elements.phoneDisplayedCountryCode && elements.phoneNumber && elements.phoneHiddenInput;
}

function displaySelectedCountryCode() {
  const selectedOption = elements.phoneCountryCodes.options[elements.phoneCountryCodes.selectedIndex];
  if (selectedOption) {
    elements.phoneDisplayedCountryCode.textContent = `+${selectedOption.value}`;
  }
}

async function buildCountryCodeOptions() {
  try {
    const { countries } = await youcanjs.misc.getStoreMarketCountries();

    if (!countries || !countries.length) return;

    elements.phoneCountryCodes.innerHTML = '';

    countries.forEach(country => {
      const option = document.createElement('option');

      option.value = country.phone;
      option.dataset.country = country.code;
      option.textContent = `${country.name} (+${country.phone})`;

      if (country.code === DEFAULT_COUNTRY_CODE) {
        option.selected = true;
      }

      elements.phoneCountryCodes.appendChild(option);
    });
  } catch (e) {
    console.error('Failed to populate countries', e);
  }
}

function getFullPhoneNumber() {
  const countryCode = elements.phoneCountryCodes.value;
  const nationalNumber = elements.phoneNumber.value.trim();

  if (!nationalNumber || !countryCode) return '';

  return `+${countryCode}${nationalNumber}`;
}

function toggleError(show) {
  const phoneErrorElement = document.querySelector('[data-phone-error]');
  const fieldsetElement = document.querySelector('[data-phone-fieldset]');

  if (phoneErrorElement) phoneErrorElement.style.display = show ? 'block' : 'none';
  if (fieldsetElement) fieldsetElement.classList.toggle('error', show);
}

function updatePhoneField() {
  const fullNumber = getFullPhoneNumber();

  if (!fullNumber) {
    toggleError(true);
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
  const val = elements.phoneNumber.value.trim();
  if (!val.startsWith('+')) return;

  try {
    const parsed = libphonenumber.parsePhoneNumberFromString(val);
    if (parsed) {
      elements.phoneNumber.value = parsed.nationalNumber;

      const matchingOption = Array.from(elements.phoneCountryCodes.options).find(
        opt => opt.value === parsed.countryCallingCode
      );

      if (matchingOption) {
        elements.phoneCountryCodes.value = parsed.countryCallingCode;
      }
    }
  } catch (e) {
    // Ignore parsing errors during typing
  }
}

function attachListeners() {
  elements.phoneCountryCodes.addEventListener('change', () => {
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
  if (document.readyState === 'loading') {
    await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
  }

  if (!getElements()) return;

  await buildCountryCodeOptions();
  attachListeners();
  displaySelectedCountryCode();
}

init();
