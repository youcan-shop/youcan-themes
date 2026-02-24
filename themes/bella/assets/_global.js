// Constants
const CURRENCY_SYMBOL = Dotshop.currency;
const CUSTOMER_LOCALE = Dotshop.customer_locale || "en-US";
const CUSTOMER_COUNTRY_CODE = new Intl.Locale(CUSTOMER_LOCALE).region;
const ON_CHANGE_DEBOUNCE_TIMER = 300;
const STORE_LANGUAGE = document.documentElement.lang || "en";

const PUB_SUB_EVENTS = {
  cartUpdate: "cart/update",
  cartError: "cart/error",
  couponUpdate: "coupon/update",
};

// Toast
const toast = document.querySelector("ui-toast");

// Handle global errors
if (window.errorStrings.checkout) {
  toast.show(window.errorStrings.checkout, "error");
}

// Custom validation messages
const TRANSLATED_MESSAGES = {
  en: {
    required: "Please fill out this field.",
    email: "Please enter a valid email address.",
    short: (min) => `Please enter at least ${min} characters.`,
  },
  fr: {
    required: "Veuillez remplir ce champ.",
    email: "Veuillez entrer une adresse e-mail valide.",
    short: (min) => `Veuillez entrer au moins ${min} caractères.`,
  },
  ar: {
    required: "يرجى ملء هذه الخانة.",
    email: "يرجى إدخال عنوان بريد إلكتروني صالح.",
    short: (min) => `يرجى إدخال ما لا يقل عن ${min} حرفًا.`,
  },
};

function setCustomMessage(input) {
  input.setCustomValidity("");

  const { validity, type, minLength } = input;
  const messages = TRANSLATED_MESSAGES[STORE_LANGUAGE];

  if (validity.valueMissing) {
    input.setCustomValidity(messages.required);
  } else if (type === "email" && validity.typeMismatch) {
    input.setCustomValidity(messages.email);
  } else if (validity.tooShort) {
    input.setCustomValidity(messages.short(minLength));
  }
}

for (const input of document.querySelectorAll("input[required], input[type='email'], textarea[required]")) {
  for (const event of ["invalid", "input"]) {
    input.addEventListener(event, () => {
      setCustomMessage(input);
    });
  }
}

// Utilities
function debounce(func, wait) {
  let time;
  return (...args) => {
    clearTimeout(time);
    time = setTimeout(() => func.apply(this, args), wait);
  };
}

function shouldUsePrecision(amount) {
  const { multicurrency_settings } = Dotshop.store;
  const { isMulticurrencyActive, usePrecision } = multicurrency_settings;

  if (!isMulticurrencyActive) {
    return !Number.isInteger(amount);
  }

  return isMulticurrencyActive && usePrecision;
}

function formatNumber(amount, withPrecision = false) {
  const formatter = new Intl.NumberFormat(CUSTOMER_LOCALE, {
    style: "decimal",
    roundingMode: "floor",
    maximumFractionDigits: withPrecision ? 2 : 0,
    minimumFractionDigits: withPrecision ? 2 : 0,
  });

  return formatter.format(amount);
}

function formatCurrency(amount) {
  const formattedValue = formatNumber(amount, shouldUsePrecision(amount));

  const determineSymbolPositionFormatter = new Intl.NumberFormat(CUSTOMER_LOCALE, {
    style: "currency",
    currency: "USD",
    currencyDisplay: "symbol",
  });

  const parts = determineSymbolPositionFormatter.formatToParts(1); // format with 1 USD just to determine the position of the currency symbol
  const symbolIndex = parts.findIndex((part) => part.type === "currency");

  return symbolIndex === 0 ? `${CURRENCY_SYMBOL} ${formattedValue}` : `${formattedValue} ${CURRENCY_SYMBOL}`;
}
