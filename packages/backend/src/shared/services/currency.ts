import { env } from '../../config';
import { cacheGet, cacheSet } from '../cache/redis';
import { logger } from '../logger';

const EXCHANGE_RATE_CACHE_TTL = 3600; // 1 hour
const EXCHANGE_RATE_CACHE_KEY_PREFIX = 'exchange_rates:';
const EXCHANGE_RATE_API_URL = 'https://api.exchangerate-api.com/v4/latest';

export interface ExchangeRateResponse {
  base: string;
  rates: Record<string, number>;
  date: string;
}

export interface ConversionResult {
  convertedAmount: number;
  rate: number;
  fromCurrency: string;
  toCurrency: string;
}

export const CURRENCY_INFO: Record<
  string,
  { symbol: string; name: string; flag: string }
> = {
  USD: { symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
  EUR: { symbol: '€', name: 'Euro', flag: '🇪🇺' },
  GBP: { symbol: '£', name: 'British Pound', flag: '🇬🇧' },
  INR: { symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳' },
  JPY: { symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵' },
  CAD: { symbol: 'C$', name: 'Canadian Dollar', flag: '🇨🇦' },
  AUD: { symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺' },
  CHF: { symbol: 'Fr', name: 'Swiss Franc', flag: '🇨🇭' },
  CNY: { symbol: '¥', name: 'Chinese Yuan', flag: '🇨🇳' },
  MXN: { symbol: '$', name: 'Mexican Peso', flag: '🇲🇽' },
  BRL: { symbol: 'R$', name: 'Brazilian Real', flag: '🇧🇷' },
  ZAR: { symbol: 'R', name: 'South African Rand', flag: '🇿🇦' },
  KRW: { symbol: '₩', name: 'South Korean Won', flag: '🇰🇷' },
  SGD: { symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬' },
  HKD: { symbol: 'HK$', name: 'Hong Kong Dollar', flag: '🇭🇰' },
  NOK: { symbol: 'kr', name: 'Norwegian Krone', flag: '🇳🇴' },
  SEK: { symbol: 'kr', name: 'Swedish Krona', flag: '🇸🇪' },
  DKK: { symbol: 'kr', name: 'Danish Krone', flag: '🇩🇰' },
  PLN: { symbol: 'zł', name: 'Polish Złoty', flag: '🇵🇱' },
  THB: { symbol: '฿', name: 'Thai Baht', flag: '🇹🇭' },
  IDR: { symbol: 'Rp', name: 'Indonesian Rupiah', flag: '🇮🇩' },
  RUB: { symbol: '₽', name: 'Russian Ruble', flag: '🇷🇺' },
  TRY: { symbol: '₺', name: 'Turkish Lira', flag: '🇹🇷' },
  AED: { symbol: 'د.إ', name: 'UAE Dirham', flag: '🇦🇪' },
};

/**
 * Fetches live exchange rates from exchangerate-api.com.
 * Falls back to cached rates if API fails. Caches results in Redis for 1 hour.
 *
 * @param baseCurrency - The base currency code (e.g. 'USD', 'EUR')
 * @returns Exchange rates relative to base currency
 */
export async function fetchExchangeRates(
  baseCurrency: string
): Promise<ExchangeRateResponse['rates']> {
  const normalizedBase = baseCurrency.toUpperCase();
  const cacheKey = `${EXCHANGE_RATE_CACHE_KEY_PREFIX}${normalizedBase}`;

  try {
    const url = env.exchangeRateApiKey
      ? `${EXCHANGE_RATE_API_URL}/${normalizedBase}?apikey=${env.exchangeRateApiKey}`
      : `${EXCHANGE_RATE_API_URL}/${normalizedBase}`;

    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Exchange rate API returned ${res.status}: ${res.statusText}`);
    }

    const data = (await res.json()) as ExchangeRateResponse;

    if (!data?.rates || typeof data.rates !== 'object') {
      throw new Error('Invalid response structure from exchange rate API');
    }

    const payload: ExchangeRateResponse = {
      base: data.base ?? normalizedBase,
      rates: data.rates,
      date: data.date ?? new Date().toISOString().slice(0, 10),
    };

    await cacheSet(cacheKey, payload, EXCHANGE_RATE_CACHE_TTL);
    logger.debug(
      { base: normalizedBase, currenciesCount: Object.keys(payload.rates).length },
      'Fetched and cached exchange rates'
    );

    return payload.rates;
  } catch (err) {
    logger.warn({ err, baseCurrency: normalizedBase }, 'Exchange rate API failed, attempting cache fallback');

    const cached = await cacheGet<ExchangeRateResponse>(cacheKey);
    if (cached?.rates) {
      logger.info({ base: normalizedBase }, 'Using cached exchange rates');
      return cached.rates;
    }

    logger.warn(
      { baseCurrency: normalizedBase },
      'No cached rates available, returning 1:1 fallback'
    );
    return { [normalizedBase]: 1 };
  }
}

/**
 * Converts an amount between two currencies using cached rates.
 *
 * @param amount - Amount to convert
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @returns Conversion result with converted amount and rate used
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<ConversionResult> {
  const normalizedFrom = fromCurrency.toUpperCase();
  const normalizedTo = toCurrency.toUpperCase();

  if (normalizedFrom === normalizedTo) {
    return {
      convertedAmount: amount,
      rate: 1,
      fromCurrency: normalizedFrom,
      toCurrency: normalizedTo,
    };
  }

  const rates = await fetchExchangeRates(normalizedFrom);

  const toRate = rates[normalizedTo];
  if (toRate === undefined) {
    logger.warn(
      { from: normalizedFrom, to: normalizedTo, availableCurrencies: Object.keys(rates) },
      'Target currency not in rates, using 1:1 fallback'
    );
    return {
      convertedAmount: amount,
      rate: 1,
      fromCurrency: normalizedFrom,
      toCurrency: normalizedTo,
    };
  }

  const convertedAmount = Math.round(amount * toRate * 100) / 100;

  return {
    convertedAmount,
    rate: toRate,
    fromCurrency: normalizedFrom,
    toCurrency: normalizedTo,
  };
}

/**
 * Converts an amount to the base currency for storage.
 *
 * @param amount - Amount in the given currency
 * @param currency - Source currency code
 * @param baseCurrency - Target base currency (default: USD)
 * @returns Amount in base currency
 */
export async function getAmountInBaseCurrency(
  amount: number,
  currency: string,
  baseCurrency = 'USD'
): Promise<number> {
  const { convertedAmount } = await convertCurrency(
    amount,
    currency.toUpperCase(),
    baseCurrency.toUpperCase()
  );
  return Math.round(convertedAmount * 100) / 100;
}

/**
 * Returns the list of supported currencies with their display info.
 *
 * @returns Array of currencies with symbol, name, flag, and code
 */
export function getSupportedCurrencies(): Array<{
  code: string;
  symbol: string;
  name: string;
  flag: string;
}> {
  return Object.entries(CURRENCY_INFO).map(([code, info]) => ({
    code,
    symbol: info.symbol,
    name: info.name,
    flag: info.flag,
  }));
}
