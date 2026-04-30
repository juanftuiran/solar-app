/**
 * Helpers - Funciones auxiliares
 */

/**
 * Debounce - Evita múltiples ejecuciones rápidas
 * @param {Function} func - Función a ejecutar
 * @param {number} delay - Retraso en ms
 * @returns {Function} Función debounced
 */
export const debounce = (func, delay = 300) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Throttle - Limita la frecuencia de ejecución
 * @param {Function} func - Función a ejecutar
 * @param {number} limit - Límite en ms
 * @returns {Function} Función throttled
 */
export const throttle = (func, limit = 300) => {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Copia texto al portapapeles
 * @param {string} text - Texto a copiar
 * @returns {Promise<boolean>} True si tuvo éxito
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Error copying to clipboard:', err);
    return false;
  }
};

/**
 * Obtiene un parámetro de URL
 * @param {string} paramName - Nombre del parámetro
 * @returns {string|null} Valor del parámetro
 */
export const getUrlParam = (paramName) => {
  const params = new URLSearchParams(window.location.search);
  return params.get(paramName);
};

/**
 * Genera un UUID simple
 * @returns {string} UUID
 */
export const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Valida si un objeto está vacío
 * @param {object} obj - Objeto a validar
 * @returns {boolean} True si está vacío
 */
export const isEmpty = (obj) => {
  return Object.keys(obj).length === 0;
};

/**
 * Profunda clonación de un objeto
 * @param {object} obj - Objeto a clonar
 * @returns {object} Objeto clonado
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Mezcla dos objetos
 * @param {object} target - Objeto destino
 * @param {object} source - Objeto origen
 * @returns {object} Objeto mezclado
 */
export const mergeObjects = (target, source) => {
  return { ...target, ...source };
};

/**
 * Espera X milisegundos (para async)
 * @param {number} ms - Milisegundos
 * @returns {Promise} Promise resuelta después del tiempo
 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Log con timestamp
 * @param {string} message - Mensaje a loguear
 * @param {string} type - Tipo (log, warn, error)
 */
export const log = (message, type = 'log') => {
  const timestamp = new Date().toLocaleTimeString();
  console[type](`[${timestamp}] ${message}`);
};
