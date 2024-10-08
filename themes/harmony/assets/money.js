function formatCurrency(amount, currencySymbol, locale = 'en-US', usePrecision = false) {
  const shouldUsePrecision = !(amount % 1 === 0) || usePrecision;

  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencySymbol,
      minimumFractionDigits: shouldUsePrecision ? 2 : 0,
    });

    return formatter.format(amount);
  } catch (error) {
    // Fallback formatting for when the currency symbol is invalid
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

    const parts = determineSymbolPositionFormatter.formatToParts(1);
    const symbolIndex = parts.findIndex(part => part.type === 'currency');
    const isSymbolOnLeft = symbolIndex === 0;

    return isSymbolOnLeft
      ? `${currencySymbol} ${formattedValue}`
      : `${formattedValue} ${currencySymbol}`;
  }
}
