// Constants
const CURRENCY_SYMBOL = Dotshop.currency;
const CUSTOMER_LOCALE = Dotshop.customer_locale;
const ON_CHANGE_DEBOUNCE_TIMER = 300;

const PUB_SUB_EVENTS = {
  cartUpdate: "cart/update",
  cartError: "cart/error",
};

// Toast
const toast = new Toast();

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
  const usePrecision = withPrecision && shouldUsePrecision(amount);
  const formatter = new Intl.NumberFormat(CUSTOMER_LOCALE, {
    style: "decimal",
    roundingMode: "floor",
    maximumFractionDigits: usePrecision ? 2 : 0,
    minimumFractionDigits: usePrecision ? 2 : 0,
  });

  return formatter.format(amount);
}

function formatCurrency(amount) {
  const formattedValue = formatNumber(amount, true);

  const determineSymbolPositionFormatter = new Intl.NumberFormat(CUSTOMER_LOCALE, {
    style: "currency",
    currency: "USD",
    currencyDisplay: "symbol",
  });

  const parts = determineSymbolPositionFormatter.formatToParts(1); // format with 1 USD just to determine the position of the currency symbol
  const symbolIndex = parts.findIndex((part) => part.type === "currency");

  return symbolIndex === 0
    ? `${CURRENCY_SYMBOL} ${formattedValue}`
    : `${formattedValue} ${CURRENCY_SYMBOL}`;
}

relativeTime = (date) => {
  const diffInSeconds = Math.floor((new Date() - date) / 1000);

  const SECOND = 1;
  const MINUTE = 60 * SECOND;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const WEEK = 7 * DAY;
  const MONTH = 30 * DAY;
  const YEAR = 365 * DAY;

  const units = [
    ["year", YEAR],
    ["month", MONTH],
    ["week", WEEK],
    ["day", DAY],
    ["hour", HOUR],
    ["minute", MINUTE],
    ["second", SECOND],
  ];

  for (const [unit, seconds] of units) {
    const interval = Math.floor(diffInSeconds / seconds);
    if (interval >= 1)
      return new Intl.RelativeTimeFormat(CUSTOMER_LOCALE, { numeric: "auto" }).format(
        -interval,
        unit,
      );
  }

  const JUST_NOW = new Intl.RelativeTimeFormat(CUSTOMER_LOCALE, { numeric: "auto" }).format(
    0,
    "second",
  );

  return JUST_NOW;
};
