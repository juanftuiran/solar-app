/**
 * Módulo de Autenticación
 */

import { signIn, signOut, getCurrentUser, getCurrentSession } from '../services/supabaseClient.js';
import { getUserRole } from '../services/apiClient.js';
import { log } from '../utils/helpers.js';

export class AuthModule {
  constructor() {
    this.user = null;
    this.isAdmin = false;
    this.onAuthChange = null;
  }

  /**
   * Inicia sesión
   * @param {string} email - Email del usuario
   * @param {string} password - Contraseña
   * @returns {Promise<boolean>} True si fue exitoso
   */
  async login(email, password) {
    try {
      const { data, error } = await signIn(email, password);

      if (error) {
        log(`Login error: ${error.message}`, 'error');
        throw error;
      }

      this.user = data.user;
      await this.loadUserRole();
      log(`User logged in: ${email}`);

      if (this.onAuthChange) this.onAuthChange('login', this.user);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  }

  /**
   * Obtiene la sesión actual
   * @returns {Promise<object|null>} Sesión actual
   */
  async getCurrentSession() {
    const session = await getCurrentSession();
    if (session?.user) {
      this.user = session.user;
      await this.loadUserRole();
    }
    return session;
  }

  /**
   * Cierra sesión
   * @returns {Promise<boolean>} True si fue exitoso
   */
  async logout() {
    try {
      await signOut();
      this.user = null;
      this.isAdmin = false;
      log('User logged out');

      if (this.onAuthChange) this.onAuthChange('logout', null);
      return true;
    } catch (error) {
      console.error('Logout failed:', error);
      return false;
    }
  }

  /**
   * Carga el rol del usuario desde la BD
   * @private
   */
  async loadUserRole() {
    if (!this.user?.email) return;

    const role = await getUserRole(this.user.email);
    this.isAdmin = role === 'admin';
  }

  /**
   * Obtiene el usuario actual
   * @returns {object|null} Usuario actual
   */
  getUser() {
    return this.user;
  }

  /**
   * Verifica si es administrador
   * @returns {boolean} True si es admin
   */
  isUserAdmin() {
    return this.isAdmin;
  }

  /**
   * Obtiene el correo del usuario
   * @returns {string} Email del usuario
   */
  getUserEmail() {
    return this.user?.email || '';
  }

  /**
   * Obtiene el rol del usuario
   * @returns {string} Rol ('admin' o 'observer')
   */
  getUserRole() {
    return this.isAdmin ? 'admin' : 'observer';
  }
}

export default new AuthModule();
