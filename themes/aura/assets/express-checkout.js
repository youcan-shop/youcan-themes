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

function updateSelectedOptionText(select) {
  const selected = select.selectedOptions[0];
  selected.textContent = selected.dataset.code;
}

function updatePhoneHidden(countryCode) {
  const hiddenInput = document.querySelector('#phone');
  const phoneNumberInput = document.querySelector('#phone-field__number');

  if(hiddenInput && phoneNumberInput) {
    hiddenInput.value = `+${countryCode}${phoneNumberInput.value}`;
  }

  phoneNumberInput.addEventListener('change', e => {
    hiddenInput.value = `+${countryCode}${e.target?.value}`
  })
}

const DEFAULT_COUNTRY_CODE = 'MA';

async function populateCountries() {

  try {
    const { countries } = await youcanjs.misc.getStoreMarketCountries();
    const selectCountry = document.querySelector('#phone-field__country-code');
  
    if(!selectCountry) return;

    const fragment = document.createDocumentFragment();
  
    countries.forEach(country => {
      const option = document.createElement('option');
      option.value = country.phone;
      option.textContent = `${country.name} (+${country.phone})`;
      option.dataset.code = `+${country.phone}`;
      option.dataset.codeAndCountry = `${country.name} (+${country.phone})`;
      
      if (country.code === DEFAULT_COUNTRY_CODE) {
          option.selected = true;
          updatePhoneHidden(country.phone);
      }
  
      fragment.appendChild(option);
    });
  
      selectCountry.appendChild(fragment);
  
      updateSelectedOptionText(selectCountry);
  
      let selectIsOpen = false;
  
      selectCountry.addEventListener('blur', () => {
        selectIsOpen = false;
        updateSelectedOptionText(selectCountry);
      });
  
      selectCountry.addEventListener('change', (e) => {
        updateSelectedOptionText(selectCountry);
        updatePhoneHidden(e.target?.value);
      });
  
      selectCountry.addEventListener('click', () => {
        selectIsOpen = !selectIsOpen;
  
        selectCountry.querySelectorAll('option').forEach(opt => {
          opt.textContent = opt.dataset.codeAndCountry;
        });
  
        if (!selectIsOpen) {
          updateSelectedOptionText(selectCountry);
        }

      });
  } catch (error) {
    notify(error.message, 'error');
  }

}

populateCountries()