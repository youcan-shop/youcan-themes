/** Theme configuration printed by layouts/theme.liquid. */
export const theme = window.theme ?? { strings: {} };

export const mediaQueries = {
  mobile: window.matchMedia("(max-width: 749px)"),
  reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)"),
};

export const customerLocale = window.Dotshop?.customer_locale || "en-US";

export const customerCountryCode = new Intl.Locale(customerLocale).region ?? "";

/**
 * @param {string} key
 * @param {Record<string, string | number>} [replacements] e.g. `{ inventory: 3 }` replaces `[inventory]`
 */
export function translate(key, replacements = {}) {
  let text = theme.strings?.[key] ?? "";
  for (const [name, value] of Object.entries(replacements)) text = text.replace(`[${name}]`, String(value));
  return text;
}

/**
 * @template {(...args: any[]) => void} T
 * @param {T} callback
 * @param {number} wait
 */
export function debounce(callback, wait) {
  /** @type {number | undefined} */
  let timeout;
  return (/** @type {Parameters<T>} */ ...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => callback(...args), wait);
  };
}

/** @param {number} amount */
export function formatMoney(amount) {
  const { isMulticurrencyActive, usePrecision } = window.Dotshop?.store?.multicurrency_settings ?? {};
  const precision = isMulticurrencyActive ? Boolean(usePrecision) : !Number.isInteger(amount);
  const digits = precision ? 2 : 0;

  const value = new Intl.NumberFormat(customerLocale, {
    style: "decimal",
    roundingMode: "floor",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);

  const symbol = window.Dotshop?.currency ?? "";
  const symbolFirst =
    new Intl.NumberFormat(customerLocale, { style: "currency", currency: "USD" })
      .formatToParts(1)
      .findIndex((part) => part.type === "currency") === 0;

  return symbolFirst ? `${symbol} ${value}` : `${value} ${symbol}`;
}

/**
 * Renders sections with the Section Rendering API.
 * @param {string[]} ids Up to 5 section ids
 * @param {string} [path] Page whose context is used, the current page by default
 * @returns {Promise<Record<string, string | null>>}
 */
export async function fetchSections(ids, path = window.location.pathname) {
  const response = await fetch(`${path}?sections=${ids.slice(0, 5).join(",")}`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

/**
 * Parses an HTML string and returns the first element matching the selector.
 * @param {string} html
 * @param {string} selector
 */
export function parseElement(html, selector) {
  return new DOMParser().parseFromString(html, "text/html").querySelector(selector);
}

/** @type {Promise<{ countries: Array<{ code: string, name: string, phone: string }> }> | undefined} */
let storeCountries;
/** @type {Record<string, Promise<any>>} */
const regions = {};
/** @type {Record<string, Promise<any>>} */
const cities = {};

/** The store's market countries, requested once per page. */
export function getStoreCountries() {
  storeCountries ??= window.youcanjs ? youcanjs.misc.getStoreMarketCountries() : Promise.resolve({ countries: [] });
  return storeCountries;
}

/** @param {string} countryCode */
export function getCountryRegions(countryCode) {
  const locale = document.documentElement.lang || "en";
  regions[`${countryCode}_${locale}`] ??= youcanjs.misc.getCountryRegions(countryCode, locale);
  return regions[`${countryCode}_${locale}`];
}

/**
 * @param {string} countryCode
 * @param {string} regionCode
 */
export function getCountryCities(countryCode, regionCode) {
  const locale = document.documentElement.lang || "en";
  const key = `${countryCode}_${regionCode}_${locale}`;
  cities[key] ??= youcanjs.misc.getCountryCities(countryCode, regionCode, locale);
  return cities[key];
}

/**
 * Reads a JSON `<script type="application/json">` element.
 * @param {Element | null | undefined} element
 * @param {any} [fallback]
 */
export function readJson(element, fallback = null) {
  try {
    return JSON.parse(element?.textContent ?? "") ?? fallback;
  } catch {
    return fallback;
  }
}
