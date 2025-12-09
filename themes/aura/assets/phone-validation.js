const DEFAULT_COUNTRY_CODE = 'MA';
const elements = {
  phoneSelectContryCode: null,
  phoneDisplayedCountryCode: null,
  phoneNumber: null,
  phoneHiddenInput: null
};

function getElements() {
  elements.phoneSelectContryCode = document.querySelector('[data-phone-select-country-code]');
  elements.phoneDisplayedCountryCode = document.querySelector('[data-phone-displayed-country-code]');
  elements.phoneNumber = document.querySelector('[data-phone-number]');
  elements.phoneHiddenInput = document.querySelector('[data-phone-hidden-input]');

  return elements.phoneSelectContryCode && elements.phoneDisplayedCountryCode && elements.phoneNumber && elements.phoneHiddenInput;
}

function displaySelectedCountryCode() {
  const selectedOption = elements.phoneSelectContryCode.options[elements.phoneSelectContryCode.selectedIndex];
  if (selectedOption) {
    elements.phoneDisplayedCountryCode.textContent = `+${selectedOption.value}`;
  }
}

async function buildCountryCodeOptions() {
  try {
    const { countries } = await youcanjs.misc.getStoreMarketCountries();

    if (!countries || !countries.length) return;

    elements.phoneSelectContryCode.innerHTML = '';

    countries.forEach(country => {
      const option = document.createElement('option');

      option.value = country.phone;
      option.dataset.country = country.code;
      option.textContent = `${country.name} (+${country.phone})`;

      if (country.code === DEFAULT_COUNTRY_CODE) {
        option.selected = true;
      }

      elements.phoneSelectContryCode.appendChild(option);
    });
  } catch (e) {
    console.error('Failed to populate countries', e);
  }
}

function getFullPhoneNumber() {
  const countryCode = elements.phoneSelectContryCode.value;
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

      const matchingOption = Array.from(elements.phoneSelectContryCode.options).find(
        option => option.value === parsed.countryCallingCode
      );

      if (matchingOption) {
        elements.phoneSelectContryCode.value = parsed.countryCallingCode;
        displaySelectedCountryCode();
      }
    }
  } catch (e) {
    // Ignore parsing errors during typing
  }
}

function attachListeners() {
  elements.phoneSelectContryCode.addEventListener('change', () => {
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
