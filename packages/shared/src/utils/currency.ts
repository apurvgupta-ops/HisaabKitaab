const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  JPY: '¥',
  CNY: '¥',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'CHF',
  SGD: 'S$',
  AED: 'د.إ',
};

/**
 * Formats an amount with the appropriate currency symbol and locale.
 */
export const formatCurrency = (amount: number, currency = 'USD', locale = 'en-US'): string => {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
    return `${symbol}${amount.toFixed(2)}`;
  }
};

export const getCurrencySymbol = (currency: string): string => {
  return CURRENCY_SYMBOLS[currency] ?? currency;
};

/**
 * Rounds a monetary amount to 2 decimal places using banker's rounding.
 */
export const roundMoney = (amount: number): number => {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
};

/**
 * Splits an amount equally among N people, handling remainder cents.
 * Returns an array of amounts that sum exactly to the total.
 */
export const splitEqually = (totalAmount: number, numberOfPeople: number): number[] => {
  const baseAmount = Math.floor((totalAmount * 100) / numberOfPeople) / 100;
  const remainder = Math.round((totalAmount - baseAmount * numberOfPeople) * 100);

  return Array.from({ length: numberOfPeople }, (_, i) =>
    roundMoney(baseAmount + (i < remainder ? 0.01 : 0))
  );
};

/**
 * Splits an amount by percentages, handling rounding remainder.
 */
export const splitByPercentage = (totalAmount: number, percentages: number[]): number[] => {
  const amounts = percentages.map((pct) => roundMoney((totalAmount * pct) / 100));
  const diff = roundMoney(totalAmount - amounts.reduce((a, b) => a + b, 0));

  if (diff !== 0 && amounts.length > 0) {
    amounts[0] = roundMoney(amounts[0]! + diff);
  }

  return amounts;
};

/**
 * Splits an amount by share ratios.
 */
export const splitByShares = (totalAmount: number, shares: number[]): number[] => {
  const totalShares = shares.reduce((a, b) => a + b, 0);
  if (totalShares === 0) return shares.map(() => 0);

  const amounts = shares.map((s) => roundMoney((totalAmount * s) / totalShares));
  const diff = roundMoney(totalAmount - amounts.reduce((a, b) => a + b, 0));

  if (diff !== 0 && amounts.length > 0) {
    amounts[0] = roundMoney(amounts[0]! + diff);
  }

  return amounts;
};

export const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'INR', 'JPY', 'CNY', 'AUD',
  'CAD', 'CHF', 'SGD', 'AED', 'BRL', 'KRW', 'MXN',
  'SEK', 'NOK', 'DKK', 'NZD', 'ZAR', 'THB',
] as const;
