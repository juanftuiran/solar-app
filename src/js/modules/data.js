/**
 * Módulo de Procesamiento de Datos
 * Procesa datos brutos en información análitica
 */



export class DataProcessor {
  /**
   * Procesa datos brutos en registros análiticos
   * @param {array} rawData - Datos brutos de Supabase
   * @param {object} langModule - Módulo de idioma
   * @returns {array} Datos procesados
   */
  processRawData(rawData, langModule) {
    if (!rawData || rawData.length < 2) return [];

    const processed = [];

    // Ordenar primero
    rawData.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return (a.monthIdx || 0) - (b.monthIdx || 0);
    });

    // Procesar cada registro (excepto el primero)
    for (let i = 1; i < rawData.length; i++) {
      const prev = rawData[i - 1];
      const curr = rawData[i];

      // Calcular incrementos (Camel case from existing solar_readings table)
      const consumoRed = (curr.lecturaRed || 0) - (prev.lecturaRed || 0);
      const prodSolarBruta = (curr.lecturaSolar || 0) - (prev.lecturaSolar || 0);
      const consumoTotal = consumoRed + prodSolarBruta;

      // Calcular variación de precio
      const precioKw = curr.precioKw || 0;
      const prevPrecioKw = prev.precioKw || 0;
      const incPrecio = prevPrecioKw > 0 ? ((precioKw - prevPrecioKw) / prevPrecioKw) * 100 : 0;

      // Calcular autonomía
      const autonomia = consumoTotal > 0 ? (prodSolarBruta / consumoTotal) * 100 : 0;

      // Calcular ahorro real
      const ahorroReal = prodSolarBruta * precioKw;

      // Crear label
      const monthIdx = curr.monthIdx || 0;
      const monthName = langModule.getMonthName(monthIdx);
      const label = `${monthName.substring(0, 3)} ${curr.year}`;

      processed.push({
        ...curr,
        label,
        consumoRed,
        prodBruta: prodSolarBruta,
        consumoTotal,
        autonomia,
        incPrecio,
        ahorroReal,
        prevPrecio: prevPrecioKw,
      });
    }

    return processed;
  }

  /**
   * Filtra datos por año
   * @param {array} data - Datos procesados
   * @param {string|number} year - Año a filtrar ('all' para todos)
   * @returns {array} Datos filtrados
   */
  filterByYear(data, year) {
    if (year === 'all') return data;
    return data.filter((d) => d.year === parseInt(year));
  }

  /**
   * Obtiene datos para un rango de fechas
   * @param {array} data - Datos procesados
   * @param {string} startDate - Fecha inicio (YYYY-MM-DD)
   * @param {string} endDate - Fecha fin (YYYY-MM-DD)
   * @returns {array} Datos en el rango
   */
  filterByDateRange(data, startDate, endDate) {
    return data.filter((d) => {
      return d.fecha >= startDate && d.fecha <= endDate;
    });
  }

  /**
   * Agrupa datos por mes
   * @param {array} data - Datos procesados
   * @returns {object} Datos agrupados por mes
   */
  groupByMonth(data) {
    const grouped = {};

    data.forEach((d) => {
      const key = `${d.year}-${String(d.monthIdx || 0).padStart(2, '0')}`;
      if (!grouped[key]) {
        grouped[key] = {
          periodo: d.label,
          records: [],
          totalConsumption: 0,
          totalGeneration: 0,
          totalSavings: 0,
        };
      }
      grouped[key].records.push(d);
      grouped[key].totalConsumption += parseFloat(d.consumoRed);
      grouped[key].totalGeneration += parseFloat(d.prodBruta);
      grouped[key].totalSavings += parseFloat(d.ahorroReal);
    });

    return grouped;
  }

  /**
   * Obtiene estadísticas agregadas
   * @param {array} data - Datos procesados
   * @returns {object} Estadísticas agregadas
   */
  getAggregatedStats(data) {
    if (!data || data.length === 0) {
      return {
        totalRecords: 0,
        totalConsumption: 0,
        totalGeneration: 0,
        totalSavings: 0,
        averageAutonomy: 0,
        highestGeneration: null,
        lowestGeneration: null,
      };
    }

    const stats = {
      totalRecords: data.length,
      totalConsumption: data.reduce((acc, d) => acc + parseFloat(d.consumoRed), 0),
      totalGeneration: data.reduce((acc, d) => acc + parseFloat(d.prodBruta), 0),
      totalSavings: data.reduce((acc, d) => acc + parseFloat(d.ahorroReal), 0),
      averageAutonomy: data.reduce((acc, d) => acc + parseFloat(d.autonomia), 0) / data.length,
      highestGeneration: data.reduce((max, d) =>
        parseFloat(d.prodBruta) > max.value ? { label: d.label, value: parseFloat(d.prodBruta) } : max
      ),
      lowestGeneration: data.reduce((min, d) =>
        parseFloat(d.prodBruta) < min.value ? { label: d.label, value: parseFloat(d.prodBruta) } : min
      ),
    };

    return stats;
  }
}

export default new DataProcessor();
