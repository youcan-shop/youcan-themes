function formatCurrency(amount, currencySymbol, locale = 'en-US', usePrecision = false) {
  const shouldUsePrecision = !(amount % 1 === 0) || usePrecision;

  const formatter = new Intl.NumberFormat(locale, {
    style: 'decimal',
    minimumFractionDigits: shouldUsePrecision ? 2 : 0,
  });

  const formattedValue = formatter.format(amount);

  const determineSymbolPositionFormatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'symbol',
  });

  const parts = determineSymbolPositionFormatter.formatToParts(1); // format with 1 USD just to determine the position of the currency symbol
  const symbolIndex = parts.findIndex(part => part.type === 'currency');
  const isSymbolOnLeft = symbolIndex === 0;

  return isSymbolOnLeft
    ? `${currencySymbol} ${formattedValue}`
    : `${formattedValue} ${currencySymbol}`;
}
