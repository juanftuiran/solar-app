/**
 * Servicio de API - Operaciones con la base de datos
 */

import { supabase } from './supabaseClient.js';

/**
 * Obtiene todas las lecturas solares
 * @returns {Promise<array|null>} Array de lecturas o null si hay error
 */
export const getSolarReadings = async () => {
  const { data, error } = await supabase.from('solar_readings').select('*');
  if (error) {
    console.error('Error fetching solar readings:', error);
    return null;
  }
  return data;
};

/**
 * Obtiene una lectura solar por ID
 * @param {string} id - ID de la lectura
 * @returns {Promise<object|null>} Lectura o null
 */
export const getSolarReadingById = async (id) => {
  const { data, error } = await supabase.from('solar_readings').select('*').eq('id', id).single();
  if (error) {
    console.error('Error fetching solar reading:', error);
    return null;
  }
  return data;
};

/**
 * Inserta o actualiza una lectura solar
 * @param {object} record - Registro a guardar
 * @returns {Promise<object|null>} Registro guardado o null
 */
export const upsertSolarReading = async (record) => {
  const { data, error } = await supabase.from('solar_readings').upsert(record);
  if (error) {
    console.error('Error upserting solar reading:', error);
    return null;
  }
  return data;
};

/**
 * Elimina una lectura solar
 * @param {string} id - ID de la lectura
 * @returns {Promise<boolean>} True si se eliminó correctamente
 */
export const deleteSolarReading = async (id) => {
  const { error } = await supabase.from('solar_readings').delete().eq('id', id);
  if (error) {
    console.error('Error deleting solar reading:', error);
    return false;
  }
  return true;
};

/**
 * Obtiene el rol del usuario
 * @param {string} email - Email del usuario
 * @returns {Promise<string|null>} Rol del usuario o null
 */
export const getUserRole = async (email) => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('email', email)
    .single();

  if (error) {
    console.error('Error fetching user role:', error);
    return null;
  }

  return data?.role || null;
};

/**
 * Obtiene todas las lecturas filtradas por año
 * @param {number} year - Año a filtrar
 * @returns {Promise<array|null>} Array de lecturas filtradas
 */
export const getSolarReadingsByYear = async (year) => {
  const { data, error } = await supabase
    .from('solar_readings')
    .select('*')
    .eq('year', year);

  if (error) {
    console.error('Error fetching readings by year:', error);
    return null;
  }

  return data;
};

/**
 * Obtiene estadísticas agregadas
 * @returns {Promise<object|null>} Estadísticas
 */
export const getAggregatedStats = async () => {
  const { data, error } = await supabase
    .from('solar_readings')
    .select('*')
    .order('year', { ascending: false });

  if (error) {
    console.error('Error fetching aggregated stats:', error);
    return null;
  }

  return data;
};
/**
 * Obtiene la configuración solar de un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<object|null>} Configuración o null
 */
export const getSolarConfig = async (userId) => {
  const { data, error } = await supabase
    .from('config_solar')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching solar config:', error);
    return null;
  }
  return data;
};

/**
 * Guarda o actualiza la configuración solar
 * @param {object} config - Configuración a guardar
 * @returns {Promise<object|null>} Configuración guardada o null
 */
export const upsertSolarConfig = async (config) => {
  const { data, error } = await supabase.from('config_solar').upsert(config).select();
  if (error) {
    console.error('Error upserting solar config:', error);
    throw error;
  }
  return data ? data[0] : null;
};
