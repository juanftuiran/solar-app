/**
 * Módulo de Análisis Predictivos (IA)
 */

import { formatCOP, formatDecimal } from '../utils/formatters.js';

export class AnalyticsModule {
  /**
   * Calcula proyecciones predictivas usando regresión lineal
   * @param {array} data - Datos históricos
   * @param {string} lang - Idioma
   * @returns {object} Proyecciones calculadas
   */
  calculateProjections(data, lang = 'es') {
    if (!data || data.length < 2) {
      return {
        projectedPrice: '--',
        trend: '--',
        trendIcon: 'fa-minus',
        trendColor: 'text-slate-400',
        bestMonth: '--',
        co2Avoided: '--',
      };
    }

    // Regresión lineal para proyectar precio
    const n = data.length;
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumX2 = 0;

    data.forEach((d, i) => {
      sumX += i;
      sumY += d.precioKw;
      sumXY += i * d.precioKw;
      sumX2 += i * i;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Proyección al próximo mes
    const projectedPrice = slope * n + intercept;

    // Tendencia
    const isRising = slope > 0;
    const trend = isRising ? (lang === 'es' ? 'En Alza' : 'Rising') : (lang === 'es' ? 'A la Baja' : 'Falling');
    const trendIcon = isRising ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down';
    const trendColor = isRising ? 'text-red-400' : 'text-green-400';

    // Mejor mes de generación
    let bestMonth = data[0];
    data.forEach((d) => {
      if (d.prodBruta > bestMonth.prodBruta) bestMonth = d;
    });

    // CO2 evitado total
    const totalGeneration = data.reduce((acc, d) => acc + d.prodBruta, 0);
    const co2Avoided = (totalGeneration * 0.38).toFixed(0);

    return {
      projectedPrice: formatCOP(projectedPrice),
      trend,
      trendIcon,
      trendColor,
      bestMonth: `${bestMonth.label} (${formatDecimal(bestMonth.prodBruta, 0)} kWh)`,
      co2Avoided: `${co2Avoided} kg`,
      slope,
      intercept,
      r2: this.calculateR2(data, slope, intercept),
    };
  }

  /**
   * Calcula el coeficiente R²
   * @param {array} data - Datos
   * @param {number} slope - Pendiente
   * @param {number} intercept - Intercepto
   * @returns {number} Valor de R²
   */
  calculateR2(data, slope, intercept) {
    const meanY = data.reduce((acc, d) => acc + d.precioKw, 0) / data.length;
    const ssRes = data.reduce((acc, d, i) => {
      const predicted = slope * i + intercept;
      return acc + Math.pow(d.precioKw - predicted, 2);
    }, 0);
    const ssTot = data.reduce((acc, d) => acc + Math.pow(d.precioKw - meanY, 2), 0);

    return 1 - ssRes / ssTot;
  }

  /**
   * Predice la próxima lectura
   * @param {object} lastRecord - Último registro
   * @param {object} previousRecord - Registro anterior
   * @returns {object} Predicción
   */
  predictNextReading(lastRecord, previousRecord) {
    if (!lastRecord || !previousRecord) {
      return {
        estimatedConsumption: '--',
        estimatedGeneration: '--',
        estimatedSavings: '--',
      };
    }

    // Promedio de cambio
    const consumptionTrend = lastRecord.consumoRed - previousRecord.consumoRed;
    const generationTrend = lastRecord.prodBruta - previousRecord.prodBruta;

    const estimatedConsumption = lastRecord.consumoRed + consumptionTrend;
    const estimatedGeneration = lastRecord.prodBruta + generationTrend;
    const estimatedSavings = estimatedGeneration * lastRecord.precioKw;

    return {
      estimatedConsumption: formatDecimal(Math.max(0, estimatedConsumption), 1),
      estimatedGeneration: formatDecimal(Math.max(0, estimatedGeneration), 1),
      estimatedSavings: formatCOP(estimatedSavings),
    };
  }

  /**
   * Calcula la estacionalidad
   * @param {array} data - Datos históricos
   * @returns {object} Índice de estacionalidad por mes
   */
  calculateSeasonality(data) {
    const monthlyAvg = {};
    const monthlyCount = {};

    data.forEach((d) => {
      if (!monthlyAvg[d.monthIdx]) {
        monthlyAvg[d.monthIdx] = 0;
        monthlyCount[d.monthIdx] = 0;
      }
      monthlyAvg[d.monthIdx] += d.prodBruta;
      monthlyCount[d.monthIdx]++;
    });

    const seasonality = {};
    const overallAvg =
      Object.keys(monthlyAvg).reduce((acc, key) => acc + monthlyAvg[key], 0) /
      Object.keys(monthlyAvg).length;

    Object.keys(monthlyAvg).forEach((month) => {
      seasonality[month] = (monthlyAvg[month] / monthlyCount[month] / overallAvg) * 100;
    });

    return seasonality;
  }

  /**
   * Detecta anomalías en los datos
   * @param {array} data - Datos
   * @returns {array} Array de anomalías detectadas
   */
  detectAnomalies(data) {
    const anomalies = [];
    const avgGeneration = data.reduce((acc, d) => acc + d.prodBruta, 0) / data.length;
    const stdDev = Math.sqrt(
      data.reduce((acc, d) => acc + Math.pow(d.prodBruta - avgGeneration, 2), 0) / data.length
    );

    data.forEach((d) => {
      const zScore = Math.abs((d.prodBruta - avgGeneration) / stdDev);
      if (zScore > 2) {
        anomalies.push({
          label: d.label,
          value: d.prodBruta,
          zScore,
          type: d.prodBruta > avgGeneration ? 'high' : 'low',
        });
      }
    });

    return anomalies;
  }
}

export default new AnalyticsModule();
