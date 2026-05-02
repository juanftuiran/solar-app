/**
 * Módulo de Análisis KPI
 */

import { formatCOP, formatPercent, formatKwh, formatDecimal } from '../utils/formatters.js';

export class KPIModule {
  /**
   * Calcula KPIs desde los datos procesados
   * @param {array} viewData - Datos filtrados por año
   * @param {array} allData - Todos los datos (para calcular ROI)
   * @param {number} investment - Inversión inicial
   * @returns {object} Objeto con todos los KPIs
   */
  calculateKPIs(viewData, allData, investment = 0) {
    if (!viewData || viewData.length === 0) {
      return {
        totalSavings: '--',
        totalGeneration: '--',
        averageAutonomy: '--',
        averageVariation: '--',
        roi: '--',
        co2Avoided: '--',
        energyIndependenceMonthly: [],
      };
    }

    // Ahorro total
    const totalSavings = viewData.reduce((acc, d) => acc + (d.ahorroReal || 0), 0);

    // Generación total
    const totalGeneration = viewData.reduce((acc, d) => acc + (d.prodBruta || 0), 0);

    // Autonomía promedio
    const averageAutonomy = viewData.reduce((acc, d) => acc + (d.autonomia || 0), 0) / viewData.length;

    // Variación promedio
    const averageVariation = viewData.reduce((acc, d) => acc + (d.incPrecio || 0), 0) / viewData.length;

    // CO2 evitado (0.38 kg por kWh)
    const co2Avoided = totalGeneration * 0.38;

    // ROI (Retorno de Inversión)
    let roi = '--';
    const installDateStr = localStorage.getItem('jfInstallDate') || '';
    
    if (allData && allData.length > 0 && investment > 0 && installDateStr) {
      const [iYear, iMonth] = installDateStr.split('-').map(Number);
      const validData = allData.filter(d => d.year > iYear || (d.year === iYear && (d.month_idx || 0) >= iMonth));
      
      if (validData.length > 0) {
        const totalSavingsValido = validData.reduce((acc, d) => acc + (d.ahorroReal || 0), 0);
        const avgSavingsPerMonth = totalSavingsValido / validData.length;
        
        if (avgSavingsPerMonth > 0) {
          const years = investment / (avgSavingsPerMonth * 12);
          roi = `${formatDecimal(years, 1)} años`;
        }
      } else {
        roi = 'Recopilando...';
      }
    }

    // Independencia energética mensual
    const energyIndependenceMonthly = viewData.map((d) => ({
      label: d.label,
      value: d.autonomia || 0,
    }));

    return {
      totalSavings: formatCOP(totalSavings),
      totalGeneration: formatKwh(totalGeneration),
      averageAutonomy: formatPercent(averageAutonomy),
      averageVariation: `${averageVariation > 0 ? '+' : ''}${formatDecimal(averageVariation, 2)}%`,
      roi,
      co2Avoided: `${formatDecimal(co2Avoided, 0)} kg`,
      energyIndependenceMonthly,
    };
  }

  /**
   * Calcula el ROI en años
   * @param {number} investment - Inversión inicial
   * @param {number} avgSavingsPerMonth - Ahorro promedio mensual
   * @returns {string} ROI formateado
   */
  calculateROI(investment, avgSavingsPerMonth) {
    if (!investment || !avgSavingsPerMonth || avgSavingsPerMonth <= 0) return '--';
    return `${formatDecimal(investment / avgSavingsPerMonth / 12, 1)} años`;
  }

  /**
   * Calcula consumo total
   * @param {object} record - Registro procesado
   * @returns {number} Consumo total
   */
  calculateTotalConsumption(record) {
    return (record.consumoRed || 0) + (record.prodBruta || 0);
  }

  /**
   * Calcula autonomía energética
   * @param {number} gridConsumption - Consumo de red
   * @param {number} solarProduction - Producción solar
   * @returns {number} Autonomía en porcentaje
   */
  calculateAutonomy(gridConsumption, solarProduction) {
    const total = gridConsumption + solarProduction;
    if (total === 0) return 0;
    return (solarProduction / total) * 100;
  }

  /**
   * Calcula variación de precio
   * @param {number} currentPrice - Precio actual
   * @param {number} previousPrice - Precio anterior
   * @returns {number} Variación en porcentaje
   */
  calculatePriceVariation(currentPrice, previousPrice) {
    if (previousPrice === 0) return 0;
    return ((currentPrice - previousPrice) / previousPrice) * 100;
  }

  /**
   * Calcula ahorro real
   * @param {number} solarProduction - Producción solar
   * @param {number} pricePerKw - Precio por kW
   * @returns {number} Ahorro en moneda
   */
  calculateSavings(solarProduction, pricePerKw) {
    return solarProduction * pricePerKw;
  }

  /**
   * Calcula CO2 evitado
   * @param {number} solarProduction - Producción solar en kWh
   * @returns {number} CO2 evitado en kg
   */
  calculateCO2Avoided(solarProduction) {
    return solarProduction * 0.38; // 0.38 kg CO2 por kWh
  }

  /**
   * Calcula promedio diario
   * @param {number} monthlyValue - Valor mensual
   * @returns {number} Promedio diario
   */
  calculateDailyAverage(monthlyValue) {
    return monthlyValue / 30;
  }
}

export default new KPIModule();
