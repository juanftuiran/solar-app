/**
 * Cliente de Supabase
 * Gestiona la conexión y operaciones con la base de datos
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qoauvsouetyuqqplbfak.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_gPLFAn4uk3YzcbPiMbBPYA_bGRvncMz';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials are missing. Please check your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Obtiene la sesión actual
 * @returns {Promise<object|null>} Objeto de sesión o null
 */
export const getCurrentSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) console.error('Error getting session:', error);
  return session;
};

/**
 * Obtiene el usuario actual
 * @returns {Promise<object|null>} Objeto de usuario o null
 */
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) console.error('Error getting user:', error);
  return user;
};

/**
 * Inicia sesión con email y contraseña
 * @param {string} email - Email
 * @param {string} password - Contraseña
 * @returns {Promise<object>} Resultado de la autenticación
 */
export const signIn = async (email, password) => {
  return await supabase.auth.signInWithPassword({ email, password });
};

/**
 * Cierra la sesión
 * @returns {Promise<object>} Resultado del logout
 */
export const signOut = async () => {
  return await supabase.auth.signOut();
};

/**
 * Crea un usuario nuevo
 * @param {string} email - Email
 * @param {string} password - Contraseña
 * @returns {Promise<object>} Resultado de la creación
 */
export const signUp = async (email, password) => {
  return await supabase.auth.signUp({ email, password });
};
