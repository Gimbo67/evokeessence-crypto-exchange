import { z } from "zod";
import axios from "axios";

// Define supported currencies as a const type
export const supportedCurrencies = ['EUR', 'USD', 'GBP', 'CHF'] as const;
export type SupportedCurrency = typeof supportedCurrencies[number];

// Enhanced exchange rate schema to support all currency pairs
export const exchangeRateSchema = z.object({
  EUR: z.object({
    USD: z.number(),
    GBP: z.number(),
    CHF: z.number(),
    EUR: z.number().default(1),
  }),
  USD: z.object({
    EUR: z.number(),
    GBP: z.number(),
    CHF: z.number(),
    USD: z.number().default(1),
  }),
  GBP: z.object({
    EUR: z.number(),
    USD: z.number(),
    CHF: z.number(),
    GBP: z.number().default(1),
  }),
  CHF: z.object({
    EUR: z.number(),
    USD: z.number(),
    GBP: z.number(),
    CHF: z.number().default(1),
  }),
  updatedAt: z.date()
});

export type ExchangeRates = z.infer<typeof exchangeRateSchema>;

let cachedRates: ExchangeRates | null = null;
let lastUpdate: Date | null = null;

// Fallback rates if API fails
const FALLBACK_RATES = {
  EUR: { USD: 1.08, GBP: 0.86, CHF: 0.98, EUR: 1 },
  USD: { EUR: 0.93, GBP: 0.79, CHF: 0.91, USD: 1 },
  GBP: { EUR: 1.17, USD: 1.27, CHF: 1.13, GBP: 1 },
  CHF: { EUR: 1.02, USD: 1.10, GBP: 0.88, CHF: 1 }
};

// Cache TTL in minutes
const CACHE_TTL_MINUTES = 60;

/**
 * Fetches current exchange rates from API or returns cached/fallback rates
 */
export async function getExchangeRates(): Promise<ExchangeRates> {
  const now = new Date();

  // If we have cached rates that are still valid, use them
  if (cachedRates && lastUpdate) {
    const cacheAgeMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
    if (cacheAgeMinutes < CACHE_TTL_MINUTES) {
      console.log('Using cached exchange rates', {
        cacheAge: `${Math.round(cacheAgeMinutes)} minutes`,
        updatedAt: lastUpdate.toISOString()
      });
      return cachedRates;
    }
  }

  try {
    // Try to fetch from external API if API key is available
    if (process.env.EXCHANGE_RATE_API_KEY) {
      console.log('Fetching exchange rates from API...');
      const response = await axios.get(
        `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_RATE_API_KEY}/latest/EUR`,
        { timeout: 5000 } // 5 second timeout
      );

      if (!response.data?.conversion_rates) {
        throw new Error('Invalid response from exchange rate API');
      }

      const rates = response.data.conversion_rates;

      // Build complete currency conversion matrix
      cachedRates = {
        EUR: {
          USD: rates.USD,
          GBP: rates.GBP,
          CHF: rates.CHF,
          EUR: 1
        },
        USD: {
          EUR: 1 / rates.USD,
          GBP: rates.GBP / rates.USD,
          CHF: rates.CHF / rates.USD,
          USD: 1
        },
        GBP: {
          EUR: 1 / rates.GBP,
          USD: rates.USD / rates.GBP,
          CHF: rates.CHF / rates.GBP,
          GBP: 1
        },
        CHF: {
          EUR: 1 / rates.CHF,
          USD: rates.USD / rates.CHF,
          GBP: rates.GBP / rates.CHF,
          CHF: 1
        },
        updatedAt: now
      };

      lastUpdate = now;

      console.log('Exchange rates updated from API:', {
        timestamp: now.toISOString(),
        rates: {
          'EUR/USD': cachedRates.EUR.USD,
          'EUR/GBP': cachedRates.EUR.GBP,
          'EUR/CHF': cachedRates.EUR.CHF
        }
      });

      return cachedRates;
    } else {
      console.warn('Exchange rate API key not configured, using fallback rates');
      throw new Error('API key not configured');
    }
  } catch (error) {
    console.error('Error fetching exchange rates:', error);

    // If we have any cached rates, use them as fallback
    if (cachedRates) {
      console.log('Using previously cached exchange rates due to API error');
      return cachedRates;
    }

    // Last resort - use fixed fallback rates
    console.log('Using fallback exchange rates');
    return {
      ...FALLBACK_RATES,
      updatedAt: now
    };
  }
}

/**
 * Converts an amount between two currencies using current exchange rates
 * with improved error handling and logging
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (amount === 0) {
    console.log(`Amount is zero, skipping conversion from ${fromCurrency} to ${toCurrency}`);
    return 0;
  }
  
  if (fromCurrency === toCurrency) {
    console.log(`Currencies are the same (${fromCurrency}), no conversion needed for amount ${amount}`);
    return amount;
  }

  // Normalize currency codes
  const from = fromCurrency.toUpperCase() as SupportedCurrency;
  const to = toCurrency.toUpperCase() as SupportedCurrency;
  
  console.log(`Starting currency conversion: ${amount} ${from} -> ${to}`);

  // Validate supported currencies
  if (!supportedCurrencies.includes(from) || !supportedCurrencies.includes(to)) {
    console.error(`Unsupported currency pair: ${from}/${to}`);
    throw new Error(`Unsupported currency pair: ${from}/${to}`);
  }

  try {
    // Get exchange rates with proper caching
    const rates = await getExchangeRates();
    console.log(`Using exchange rates from: ${rates.updatedAt.toISOString()}`);
    
    // Verify rate exists for the currency pair
    if (!rates[from] || !rates[to]) {
      console.error(`Missing exchange rate data for ${from} or ${to}`);
      throw new Error(`Missing exchange rate data for ${from} or ${to}`);
    }

    // Get exchange rate for the currency pair
    const rate = rates[from][to];
    if (!rate || isNaN(rate) || rate <= 0) {
      console.error(`Invalid exchange rate for ${from}/${to}: ${rate}`);
      
      // Use fallback rates if available
      const fallbackRate = FALLBACK_RATES[from][to];
      console.log(`Using fallback rate ${fallbackRate} for ${from}/${to}`);
      
      if (!fallbackRate || isNaN(fallbackRate) || fallbackRate <= 0) {
        throw new Error(`No valid exchange rate available for ${from}/${to}`);
      }
      
      const convertedAmount = Number((amount * fallbackRate).toFixed(2));
      console.log(`Conversion result (using fallback rate):`, {
        from: `${amount} ${from}`,
        to: `${convertedAmount} ${to}`,
        rate: fallbackRate
      });
      return convertedAmount;
    }

    // Perform the conversion with proper rounding
    const convertedAmount = Number((amount * rate).toFixed(2));

    console.log('Conversion result:', {
      from: `${amount} ${from}`,
      to: `${convertedAmount} ${to}`,
      rate,
      timestamp: rates.updatedAt.toISOString()
    });

    return convertedAmount;
  } catch (error) {
    console.error('Currency conversion error:', error);
    
    // Emergency fallback - use hardcoded rates if everything else fails
    try {
      console.log(`Attempting emergency fallback conversion for ${from}/${to}`);
      
      // Use hardcoded fallback rates
      const fallbackRate = FALLBACK_RATES[from][to];
      if (fallbackRate && !isNaN(fallbackRate) && fallbackRate > 0) {
        const convertedAmount = Number((amount * fallbackRate).toFixed(2));
        console.log(`Emergency fallback conversion result:`, {
          from: `${amount} ${from}`,
          to: `${convertedAmount} ${to}`,
          rate: fallbackRate,
          note: 'Using emergency fallback rate'
        });
        return convertedAmount;
      }
    } catch (fallbackError) {
      console.error('Even fallback conversion failed:', fallbackError);
    }
    
    throw new Error(`Failed to convert currency: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}