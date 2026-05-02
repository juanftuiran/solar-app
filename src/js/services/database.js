/**
 * Módulo de Base de Datos
 */

import {
  getSolarReadings,
  getSolarReadingById,
  upsertSolarReading,
  deleteSolarReading,
  getSolarReadingsByYear,
} from './apiClient.js';
import { log } from '../utils/helpers.js';

export class DatabaseModule {
  constructor() {
    this.data = [];
    this.onDataChange = null;
  }

  /**
   * Carga todos los datos desde Supabase
   * @returns {Promise<array>} Array de datos
   */
  async fetchAllData() {
    try {
      const data = await getSolarReadings();
      if (data) {
        this.data = data.sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year;
          return (a.monthIdx || 0) - (b.monthIdx || 0);
        });
        log(`Loaded ${this.data.length} solar readings`);
        if (this.onDataChange) this.onDataChange(this.data);
      }
      return this.data;
    } catch (error) {
      console.error('Error fetching data:', error);
      return [];
    }
  }

  /**
   * Obtiene datos filtrados por año
   * @param {number} year - Año a filtrar
   * @returns {array} Datos filtrados
   */
  getDataByYear(year) {
    if (year === 'all') return this.data;
    return this.data.filter((d) => d.year === parseInt(year));
  }

  /**
   * Obtiene todos los datos
   * @returns {array} Array de datos
   */
  getAllData() {
    return this.data;
  }

  /**
   * Guarda un registro solar
   * @param {object} record - Registro a guardar
   * @returns {Promise<boolean>} True si fue exitoso
   */
  async saveRecord(record) {
    try {
      const result = await upsertSolarReading(record);
      if (result) {
        await this.fetchAllData();
        log(`Record saved: ${record.id}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error saving record:', error);
      return false;
    }
  }

  /**
   * Elimina un registro
   * @param {string} id - ID del registro
   * @returns {Promise<boolean>} True si fue exitoso
   */
  async deleteRecord(id) {
    try {
      const result = await deleteSolarReading(id);
      if (result) {
        await this.fetchAllData();
        log(`Record deleted: ${id}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting record:', error);
      return false;
    }
  }

  /**
   * Busca un registro por ID
   * @param {string} id - ID del registro
   * @returns {object|null} Registro encontrado o null
   */
  findRecord(id) {
    return this.data.find((d) => d.id === id) || null;
  }

  /**
   * Obtiene el registro más reciente
   * @returns {object|null} Registro más reciente
   */
  getLatestRecord() {
    return this.data.length > 0 ? this.data[this.data.length - 1] : null;
  }

  /**
   * Obtiene el número total de registros
   * @returns {number} Total de registros
   */
  getTotalRecords() {
    return this.data.length;
  }
}

export default new DatabaseModule();
