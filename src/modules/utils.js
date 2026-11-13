/**
 * @module utils
 * @description Shared lightweight DOM, formatting, date, and performance utilities.
 */

/**
 * Escape unsafe HTML characters in display strings.
 * @param {string} str
 * @returns {string}
 */
export function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Alias for HTML attribute escaping.
 * @param {string} str
 * @returns {string}
 */
export function escapeAttr(str) {
  return escapeHTML(str).replace(/'/g, '&#39;');
}

/**
 * Create a debounced wrapper around a callback function.
 * @template {Function} T
 * @param {T} fn
 * @param {number} [waitMs=140]
 * @returns {T}
 */
export function debounce(fn, waitMs = 140) {
  let timer = null;
  return function debounced(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn.apply(this, args);
    }, waitMs);
  };
}

/**
 * Get today's local date in YYYY-MM-DD format.
 * @param {Date} [d]
 * @returns {string}
 */
export function getLocalDateISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Shift a YYYY-MM-DD date string by N days safely in local time.
 * @param {string} isoStr
 * @param {number} deltaDays
 * @returns {string}
 */
export function shiftISODate(isoStr, deltaDays) {
  const base = isoStr ? new Date(`${isoStr}T12:00:00`) : new Date();
  if (Number.isNaN(base.getTime())) return getLocalDateISO();
  base.setDate(base.getDate() + deltaDays);
  return getLocalDateISO(base);
}

/**
 * Trigger a browser download for text content.
 * @param {string} filename
 * @param {string} content
 * @param {string} [mimeType='text/plain;charset=utf-8;']
 */
export function downloadTextFile(filename, content, mimeType = 'text/plain;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
