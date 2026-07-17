/**
 * @module formatters
 * Formatting utilities for the solar monitoring app.
 * Provides locale-aware currency, unit, and percentage formatters,
 * plus a general-purpose debounce helper.
 */

/**
 * Format a number as Colombian Pesos (COP) with no decimals.
 * @param {number} v - Value to format
 * @returns {string} Formatted currency string (e.g. "$ 1.250.000")
 */
export const fCOP = (v) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(v || 0);

/**
 * Format a number to a fixed number of decimal places.
 * @param {number} v - Value to format
 * @param {number} [d=2] - Number of decimal places
 * @returns {string} Fixed-point string
 */
export const fDec = (v, d = 2) => parseFloat(v || 0).toFixed(d);

/**
 * Format a value as kilowatt-hours.
 * @param {number} v - Value in kWh
 * @returns {string} Formatted string (e.g. "12.5 kWh")
 */
export const fKwh = (v) => `${fDec(v, 1)} kWh`;

/**
 * Format a value as a percentage.
 * @param {number} v - Percentage value
 * @returns {string} Formatted string (e.g. "87.3%")
 */
export const fPct = (v) => `${fDec(v, 1)}%`;

/**
 * Create a debounced version of a function.
 * The returned function delays invoking `fn` until `ms` milliseconds
 * have elapsed since the last invocation.
 * @param {Function} fn - Function to debounce
 * @param {number} ms - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (fn, ms) => {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
};
