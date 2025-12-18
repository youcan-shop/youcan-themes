const TYPES = ['country', 'region', 'city'];

let fields = {};
let regionCode = null;
let countryCode = null;
const locale = document.documentElement.lang || 'en';

for (const type of TYPES) {
  fields[type] = document.querySelector(`[data-linked-field='${type}']`);
  fields[type]?.addEventListener('change', () => onChange(type));
}

fetchOptions();

async function fetchOptions() {
  for (const type of TYPES) {
    fields[type] && (await fetchLocationByType(type));
  }
}

function setUpOptions(type, options) {
  fields[type].innerHTML = '';

  options.forEach((opt, index) => {
    const label = typeof opt === 'string' ? opt : opt.name;
    const value = typeof opt === 'string' ? opt : opt.code;
    const isDefault = (type === 'country' && value === countryCode) || index === 0;

    const option = new Option(label, label);
    option.dataset.value = value;
    option.defaultSelected = isDefault;

    fields[type].add(option);
  });
}

async function onChange(type) {
  const value = fields[type].selectedOptions[0]?.dataset.value;

  if (type === 'country') countryCode = value;
  if (type === 'region') regionCode = value;

  const dependentFields = getDependentFields(type);
  for (const next of dependentFields) {
    fields[next] && (await fetchLocationByType(next));
  }
}

async function fetchLocationByType(type) {
  const fetchMap = {
    country: () => window.storeMarketCountries,
    region: () => youcanjs.misc.getCountryRegions(countryCode, locale),
    city: () => youcanjs.misc.getCountryCities(countryCode, regionCode, locale),
  };

  try {
    const response = await fetchMap[type]?.call();
    if (!response) throw new Error(`Unknown fetch type: ${type}`);

    const map = {
      country: () => {
        const customerCountryExists = response.countries.some(country => country.code === CUSTOMER_COUNTRY_CODE);
        countryCode = customerCountryExists ? CUSTOMER_COUNTRY_CODE : response.countries[0].code;

        this.setUpOptions(type, response.countries);
      },
      region: () => {
        regionCode = response.states[0].code;
        setUpOptions(type, response.states);
      },
      city: () => setUpOptions(type, response.cities),
    };

    map[type]?.call();
  } catch (error) {
    console.error(error);
  }
}

function getDependentFields(type) {
  if (type === 'country') return TYPES.slice(1);
  if (type === 'region') return TYPES.slice(2);
  return [];
}
