async function placeOrder() {
  const expressCheckoutForm = document.querySelector('#express-checkout-form');
  let fields = Object.fromEntries(new FormData(expressCheckoutForm));

  load('#loading__checkout');
  try {
    const productVariantId = document.getElementById('variantId')?.value;
    const quantity = document.getElementById('quantity')?.value || 1;
    const attachedImage = document.querySelector('#yc-upload-link')?.value;

    if (attachedImage) {
      fields = { ...fields, attachedImage };
    }

    const response = await youcanjs.checkout.placeExpressCheckoutOrder({ productVariantId, quantity, fields });

    response
      .onSuccess((data, redirectToThankyouPage) => {
        redirectToThankyouPage();
      })
      .onValidationErr((err) => {
        const form = document.querySelector('#express-checkout-form');
        const formFields = Object.keys(err.meta.fields);

        if (!form || !formFields) return;

        formFields.forEach(field => {
          const fieldName = field.indexOf('extra_fields') > -1 ? field.replace('extra_fields.', 'extra_fields[') + ']' : field;

          const formField = form.querySelector(`[name="${fieldName}"]`);
          const errorEl = form.querySelector(`.validation-error[data-error="${fieldName}"]`);
          if (formField) {
            formField.classList.add('error');
          }

          if (errorEl) {
            errorEl.innerHTML = err.meta.fields[field][0];
          }

          formField.addEventListener('formField', () => {
            formField.classList.remove('error');
            errorEl.innerHTML = '';
          });
        });

        const formTop = form.getBoundingClientRect().top;

        if (!document.querySelector('#yc-sticky-checkout')) {
          window.scrollBy({ top: formTop - window.innerHeight / 3, behavior: 'smooth' });
        }
      })
      .onSkipShippingStep((data, redirectToShippingPage) => {
        redirectToShippingPage();
      })
      .onSkipPaymentStep((data, redirectToPaymentPage) => {
        redirectToPaymentPage();
      });
  } catch (e) {
    notify(e.message, 'error');
  } finally {
    stopLoad('#loading__checkout');
  }
}

// PHONE VALIDATION
const DEFAULT_COUNTRY_CODE = 'MA';

const selectCountry = document.querySelector('#phone-field__country-code');
const inputNumber = document.querySelector('#phone-field__number');
const hiddenFullPhone = document.querySelector('#phone')

// SET INITIAL DISPLAY TO COUNTRY CODE ONLY
function updateSelectedOptionText() {
  const selected = selectCountry.selectedOptions[0];
  selected.textContent = selected.dataset.code;
}

// POPULATE COUNTRIES
async function populateCountries() {
  const { countries } = await youcanjs.misc.getStoreMarketCountries();

  if(!countries || !countries.length) return;

  countries.forEach(country => {
    const opt = document.createElement("option");
    opt.value = country.phone;
    opt.dataset.country = country.code;
    opt.dataset.code = `+${country.phone}`;
    opt.dataset.codeAndCountry = `${country.name} (+${country.phone})`;
    opt.textContent = opt.dataset.codeAndCountry;
    selectCountry.appendChild(opt);

    if (country.code === DEFAULT_COUNTRY_CODE) {
      opt.selected = true;
    }
  });

  updateSelectedOptionText(selectCountry);

  // Handle select open/close and styling
  let selectIsOpen = false;

  selectCountry.addEventListener("click", () => {
    selectIsOpen = !selectIsOpen;
    selectCountry.querySelectorAll("option").forEach(o => {
      o.textContent = o.dataset.codeAndCountry;
    });
    if (!selectIsOpen) updateSelectedOptionText(selectCountry);
  });

  selectCountry.addEventListener("blur", () => {
    selectIsOpen = false;
    updateSelectedOptionText(selectCountry);
  });
}

function getCurrentFullPhone() {
  const countryCode = selectCountry.value;
  const nationalNumber = inputNumber.value.trim();
  
  if(!nationalNumber || !countryCode) return '';

  return `+${countryCode}${nationalNumber}`
}

// UPDATE HIDDEN INPUT
function updateHiddenInput() {
  const fullNumber = getCurrentFullPhone();
  
  if (!fullNumber) {
    showError();
    return;
  }

  const parsed = libphonenumber.parsePhoneNumber(fullNumber)

  if(parsed && parsed.isValid()) {
    hiddenFullPhone.value = parsed.number;
    return;
  }

  hiddenFullPhone.value = "";
}

// SHOW ERROR
function showError(show = true) {
  const errorDiv = document.querySelector('#validation-error__phone_field');
  const inputGroup = document.querySelector('.phone-field__input-group');
  
  if (!errorDiv || !inputGroup) return;

  if (show) {
    errorDiv.style.display = 'block';
    inputGroup.classList.add('error');
    return;
  }

    errorDiv.style.display = 'none';
    inputGroup.classList.remove('error');
}

// CASE 1: User typed the full international number (including country code '+')
function syncSelectToNumberField() {
  const numberVal = inputNumber.value.trim();

  if(numberVal.startsWith('+')) {
    const parsed = libphonenumber.parsePhoneNumberFromString(numberVal);
    
    if(!parsed) return;
    
    inputNumber.value = parsed.nationalNumber;
    // Auto-update SELECT if country code exists 
    const optionToSelect = [...selectCountry.options].find(
      opt => opt.value === parsed.countryCallingCode
    );
  
    if (optionToSelect) {
      selectCountry.value = parsed.countryCallingCode;
    }
  
    updateSelectedOptionText();
    return;
  }

  detectAndFixCountryCodeFromInput()
}

// CASE 2: User type only the national number
function detectAndFixCountryCodeFromInput() {
  const val = inputNumber.value.trim();

  if(val.startsWith('+')) return; // already checked in syncSelectToNumberField

  const fullNumber = getCurrentFullPhone();

  if (!fullNumber) {
    showError();
    return;
  }
  
  const parsed = libphonenumber.parsePhoneNumber(fullNumber);

  if(!parsed.isValid()) {
    // Show error message
    showError();
    return;
  }
}

// LISTENERS
function initPhoneListeners() {

  selectCountry.addEventListener('change', () => {
    showError(false)
    syncSelectToNumberField();
    updateHiddenInput();
  })

  inputNumber.addEventListener('change', () => {
    showError(false);
    syncSelectToNumberField();
    updateHiddenInput();
  })
  
  inputNumber.addEventListener("blur", () => {
    updateHiddenInput();
  });
}

async function initPhoneFields() {
  await populateCountries();
  initPhoneListeners();
}

initPhoneFields()
