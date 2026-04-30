/**
 * Formatters - Funciones de formateo de datos
 */

/**
 * Formatea un número como moneda COP
 * @param {number} value - Valor a formatear
 * @returns {string} Valor formateado en COP
 */
export const formatCOP = (value) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
};

/**
 * Formatea un número con decimales
 * @param {number} value - Valor a formatear
 * @param {number} decimals - Número de decimales
 * @returns {string} Valor formateado
 */
export const formatDecimal = (value, decimals = 2) => {
  return parseFloat(value).toFixed(decimals);
};

/**
 * Formatea kWh
 * @param {number} value - Valor en kWh
 * @returns {string} Valor formateado
 */
export const formatKwh = (value) => {
  return `${formatDecimal(value, 1)} kWh`;
};

/**
 * Formatea porcentaje
 * @param {number} value - Valor en decimal
 * @param {number} decimals - Decimales a mostrar
 * @returns {string} Valor formateado con %
 */
export const formatPercent = (value, decimals = 1) => {
  return `${formatDecimal(value, decimals)}%`;
};

/**
 * Formatea fecha en formato YYYY-MM-DD
 * @param {Date} date - Fecha a formatear
 * @returns {string} Fecha formateada
 */
export const formatDate = (date) => {
  if (typeof date === 'string') return date;
  return new Date(date).toISOString().split('T')[0];
};

/**
 * Obtiene nombre del mes
 * @param {number} monthIndex - Índice del mes (1-12)
 * @param {string} lang - Idioma (es/en)
 * @returns {string} Nombre del mes
 */
export const getMonthName = (monthIndex, lang = 'es') => {
  const months = {
    es: [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ],
    en: [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
  };
  return months[lang]?.[monthIndex - 1] || '';
};

/**
 * Formatea texto para ser legible
 * @param {string} text - Texto a formatear
 * @returns {string} Texto formateado
 */
export const formatLabel = (text) => {
  return text
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .toLowerCase()
    .replace(/^./, (str) => str.toUpperCase());
};
