/**
 * Currency formatting utilities
 */

/**
 * Format a number as a currency string
 * @param amount The amount to format
 * @param currency The currency code (default: USD)
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number, currency: string = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Format a percentage value
 * @param value The percentage value (0-100)
 * @returns Formatted percentage string
 */
export const formatPercentage = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value / 100);
};

/**
 * Convert a string or number to a floating point number
 * @param value The value to convert
 * @returns The floating point number or 0 if invalid
 */
export const parseAmount = (value: string | number): number => {
  if (typeof value === "number") return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};