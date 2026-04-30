/**
 * Validadores - Funciones de validación de datos
 */

/**
 * Valida un email
 * @param {string} email - Email a validar
 * @returns {boolean} True si es válido
 */
export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * Valida una contraseña
 * @param {string} password - Contraseña a validar
 * @returns {object} Objeto con validación y errores
 */
export const validatePassword = (password) => {
  const errors = [];

  if (password.length < 6) {
    errors.push('La contraseña debe tener al menos 6 caracteres');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Debe contener al menos una mayúscula');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Debe contener al menos un número');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Valida un número
 * @param {*} value - Valor a validar
 * @param {number} min - Valor mínimo
 * @param {number} max - Valor máximo
 * @returns {boolean} True si es válido
 */
export const validateNumber = (value, min = -Infinity, max = Infinity) => {
  const num = parseFloat(value);
  return !isNaN(num) && num >= min && num <= max;
};

/**
 * Valida una fecha
 * @param {string} dateStr - Fecha en formato YYYY-MM-DD
 * @returns {boolean} True si es válida
 */
export const validateDate = (dateStr) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;

  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date);
};

/**
 * Valida un objeto de lectura solar
 * @param {object} record - Registro a validar
 * @returns {object} Objeto con validación y errores
 */
export const validateSolarRecord = (record) => {
  const errors = [];

  if (!record.fecha || !validateDate(record.fecha)) {
    errors.push('Fecha inválida');
  }
  if (!validateNumber(record.lecturaRed, 0)) {
    errors.push('Lectura de red debe ser un número positivo');
  }
  if (!validateNumber(record.lecturaSolar, 0)) {
    errors.push('Lectura solar debe ser un número positivo');
  }
  if (!validateNumber(record.precioKw, 0)) {
    errors.push('Precio kW debe ser un número positivo');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Valida campos requeridos
 * @param {object} data - Datos a validar
 * @param {array} requiredFields - Campos requeridos
 * @returns {object} Objeto con validación y errores
 */
export const validateRequired = (data, requiredFields = []) => {
  const errors = [];

  requiredFields.forEach((field) => {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      errors.push(`${field} es requerido`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};
