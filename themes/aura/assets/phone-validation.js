const DEFAULT_COUNTRY_CODE = 'MA';
const elements = {
  phoneSelectCountryCode: null,
  phoneDisplayedCountryCode: null,
  phoneNumber: null,
  phoneHiddenInput: null
};

let customerCountryCode = DEFAULT_COUNTRY_CODE;

function getElements() {
  elements.phoneSelectCountryCode = document.querySelector('[data-phone-select-country-code]');
  elements.phoneDisplayedCountryCode = document.querySelector('[data-phone-displayed-country-code]');
  elements.phoneNumber = document.querySelector('[data-phone-number]');
  elements.phoneHiddenInput = document.querySelector('[data-phone-hidden-input]');

  return elements.phoneSelectCountryCode && elements.phoneDisplayedCountryCode && elements.phoneNumber && elements.phoneHiddenInput;
}

async function getCustomerCountryCode() {
  try {
    const response = await fetch('https://api.country.is');
    const data = await response.json();

    if (data?.country) {
      customerCountryCode = data.country;
    }
  } catch (error) {
    // Fallback to default country code
  }
}

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

    const startLtr = '\u202A';
    const endLtr = '\u202C';

    countries.forEach(country => {
      const option = document.createElement('option');

      option.value = country.phone;
      option.dataset.country = country.code;
      option.textContent = `${country.name} (${startLtr}+${country.phone}${endLtr})`;

      if (country.code === customerCountryCode) {
        option.selected = true;
      }

      elements.phoneSelectCountryCode.appendChild(option);
    });
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
  if (document.readyState === 'loading') {
    await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
  }

  if (!getElements()) return;

  await getCustomerCountryCode();
  await buildCountryCodeOptions();
  attachListeners();
  displaySelectedCountryCode();
}

init();
