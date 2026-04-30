/**
 * Módulo de Gráficos
 * Gestiona los gráficos de Chart.js
 */

import Chart from 'chart.js/auto';
import { COLORS } from '../utils/constants.js';
import { formatCOP, formatKwh } from '../utils/formatters.js';

export class ChartsModule {
  constructor() {
    this.charts = {};
    this.chartModes = {
      energia: 'bar',
      precio: 'line',
    };
    this.configureChartDefaults();
  }

  /**
   * Configura valores por defecto de Chart.js
   * @private
   */
  configureChartDefaults() {
    Chart.defaults.color = '#64748b';
    Chart.defaults.font.family = 'sans-serif';
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
  }

  /**
   * Renderiza gráfico de balance energético
   * @param {array} data - Datos procesados
   * @param {string} lang - Idioma
   */
  renderEnergyChart(data, lang = 'es') {
    const chartId = 'chart-energia';
    if (this.charts[chartId]) this.charts[chartId].destroy();

    const ctx = document.getElementById(chartId);
    if (!ctx) return;

    const isLine = this.chartModes.energia === 'line';
    const labels = data.map((d) => d.label);

    this.charts[chartId] = new Chart(ctx, {
      type: this.chartModes.energia,
      data: {
        labels,
        datasets: [
          {
            label: lang === 'es' ? 'Consumo Red' : 'Grid',
            data: data.map((d) => parseFloat(d.consumoRed)),
            backgroundColor: isLine ? 'rgba(244, 63, 94, 0.2)' : '#F43F5E',
            borderColor: '#F43F5E',
            borderWidth: isLine ? 2 : 0,
            fill: isLine,
            tension: 0.4,
          },
          {
            label: lang === 'es' ? 'Solar' : 'Solar',
            data: data.map((d) => parseFloat(d.prodBruta)),
            backgroundColor: isLine ? 'rgba(16, 185, 129, 0.2)' : '#10B981',
            borderColor: '#10B981',
            borderWidth: isLine ? 2 : 0,
            fill: isLine,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: !isLine,
          },
          y: {
            stacked: !isLine,
            ticks: {
              callback: (value) => `${value} kWh`,
            },
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) => `${context.dataset.label}: ${context.raw.toFixed(1)} kWh`,
            },
          },
          legend: {
            position: 'top',
          },
        },
      },
    });
  }

  /**
   * Renderiza gráfico de fluctuación de precios
   * @param {array} data - Datos procesados
   * @param {string} lang - Idioma
   */
  renderPriceChart(data, lang = 'es') {
    const chartId = 'chart-precio';
    if (this.charts[chartId]) this.charts[chartId].destroy();

    const ctx = document.getElementById(chartId);
    if (!ctx) return;

    const isLine = this.chartModes.precio === 'line';
    const labels = data.map((d) => d.label);

    this.charts[chartId] = new Chart(ctx, {
      type: this.chartModes.precio,
      data: {
        labels,
        datasets: [
          {
            label: lang === 'es' ? 'Precio kW' : 'kW Price',
            data: data.map((d) => d.precioKw),
            borderColor: '#F59E0B',
            backgroundColor: isLine ? 'rgba(245, 158, 11, 0.15)' : '#F59E0B',
            borderWidth: isLine ? 2 : 0,
            fill: isLine,
            tension: 0.4,
            borderRadius: isLine ? 0 : 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => formatCOP(value),
            },
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) => `${context.dataset.label}: ${formatCOP(context.raw)}`,
            },
          },
          legend: {
            position: 'top',
          },
        },
      },
    });
  }

  /**
   * Alterna el tipo de gráfico
   * @param {string} chartType - Tipo de gráfico ('energia' o 'precio')
   * @param {array} data - Datos procesados
   * @param {string} lang - Idioma
   */
  toggleChartType(chartType, data, lang = 'es') {
    if (chartType === 'energia') {
      this.chartModes.energia = this.chartModes.energia === 'bar' ? 'line' : 'bar';
      this.renderEnergyChart(data, lang);
    } else if (chartType === 'precio') {
      this.chartModes.precio = this.chartModes.precio === 'line' ? 'bar' : 'line';
      this.renderPriceChart(data, lang);
    }
  }

  /**
   * Obtiene el icono del gráfico actual
   * @param {string} chartType - Tipo de gráfico
   * @returns {string} Clase de Font Awesome
   */
  getChartIcon(chartType) {
    if (chartType === 'energia') {
      return this.chartModes.energia === 'bar' ? 'fa-chart-area' : 'fa-chart-bar';
    } else if (chartType === 'precio') {
      return this.chartModes.precio === 'line' ? 'fa-chart-bar' : 'fa-chart-line';
    }
  }

  /**
   * Destruye todos los gráficos
   */
  destroyAllCharts() {
    Object.keys(this.charts).forEach((key) => {
      if (this.charts[key]) {
        this.charts[key].destroy();
      }
    });
    this.charts = {};
  }
}

export default new ChartsModule();
