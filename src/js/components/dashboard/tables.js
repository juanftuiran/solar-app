/**
 * Módulo de Tablas
 * Renderiza tablas dinámicas
 */

import { formatCOP, formatDecimal } from '../../utils/formatters.js';

export class TablesModule {
  /**
   * Renderiza la tabla de bitácora
   * @param {array} data - Datos procesados
   * @param {object} options - Opciones de renderizado
   */
  renderTableBody(data, options = {}) {
    const {
      lang = 'es',
      isAdmin = false,
      onEdit = null,
      onDelete = null,
      onToggleRow = null,
    } = options;

    const tbody = document.getElementById('table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!data || data.length === 0) {
      const emptyMessage = lang === 'es' ? 'Sin datos.' : 'No data.';
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-500">${emptyMessage}</td></tr>`;
      return;
    }

    data.forEach((row) => {
      // Determinar clase de color según variación de precio
      let iconClass = '';
      let colorClass = '';

      const incPrecio = parseFloat(row.incPrecio);
      if (incPrecio > 0) {
        iconClass = 'text-red-400 fa-arrow-trend-up';
        colorClass = 'text-red-400';
      } else if (incPrecio < 0) {
        iconClass = 'text-green-400 fa-arrow-trend-down';
        colorClass = 'text-green-400';
      } else {
        iconClass = 'text-slate-400 fa-minus';
        colorClass = 'text-slate-400';
      }

      // Fila principal
      const tr = document.createElement('tr');
      tr.className = 'cursor-pointer hover:bg-slate-700/30 transition-colors border-b border-slate-700/30';
      tr.onclick = () => {
        if (onToggleRow) onToggleRow(`det-${row.id}`);
      };

      const consumoRed = formatDecimal(row.consumoRed || 0, 1);
      const prodBruta = formatDecimal(row.prodBruta || 0, 1);
      const ahorroReal = row.ahorroReal || 0;

      tr.innerHTML = `
        <td class="py-3 px-4">
          <p class="font-bold text-jf-accent">${row.label}</p>
          <p class="text-[10px] text-slate-500">${row.fecha}</p>
        </td>
        <td class="py-3 px-4 text-center text-xs text-slate-400">
          ${(row.lecturaRed || 0).toFixed(0)} <span class="opacity-30">|</span> ${(row.lecturaSolar || 0).toFixed(0)}
        </td>
        <td class="py-3 px-4 text-center font-medium">
          ${consumoRed} <span class="text-[10px] text-slate-500">kWh</span>
        </td>
        <td class="py-3 px-4 text-center text-jf-solar font-medium">
          ${prodBruta} <span class="text-[10px] text-slate-500">kWh</span>
        </td>
        <td class="py-3 px-4 text-right">
          <div>${formatCOP(row.precioKw || 0)}</div>
          <div class="${colorClass} text-[10px]">
            <i class="fa-solid ${iconClass} mr-1"></i>${Math.abs(incPrecio).toFixed(1)}%
          </div>
        </td>
        <td class="py-3 px-4 text-right text-jf-solar font-bold">
          ${formatCOP(ahorroReal)}
        </td>
        <td class="py-3 px-4 text-center admin-only ${isAdmin ? '' : 'hidden-auth'}">
          <button class="text-slate-400 hover:text-blue-400 mr-3 transition-colors" title="Editar">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="text-slate-500 hover:text-red-400 transition-colors" title="Eliminar">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      `;

      tbody.appendChild(tr);

      // Si es admin, agregar listeners a botones
      if (isAdmin) {
        const editBtn = tr.querySelector('button:first-child');
        const deleteBtn = tr.querySelector('button:last-child');

        if (editBtn && onEdit) {
          editBtn.onclick = (e) => {
            e.stopPropagation();
            onEdit(row.id);
          };
        }

        if (deleteBtn && onDelete) {
          deleteBtn.onclick = (e) => {
            e.stopPropagation();
            onDelete(row.id);
          };
        }
      }

      // Fila de detalles (expandible)
      const trDet = document.createElement('tr');
      trDet.id = `det-${row.id}`;
      trDet.className = 'hidden bg-slate-900/60 expand-row text-xs border-b border-slate-700/50';

      const autonomia = formatDecimal(row.autonomia || 0, 1);
      const consumoTotal = formatDecimal(row.consumoTotal || 0, 1);
      const dailyConsumption = formatDecimal((row.consumoRed || 0) / 30, 1);
      const dailyGeneration = formatDecimal((row.prodBruta || 0) / 30, 1);

      trDet.innerHTML = `
        <td colspan="7" class="py-4 px-6">
          <div class="flex justify-between items-center text-slate-400 flex-wrap gap-4">
            <div>
              <p class="text-jf-accent mb-1 font-semibold uppercase tracking-wider">Eficiencia</p>
              <p>• Total: <span class="text-white">${consumoTotal} kWh</span></p>
              <p>• Autonomía: <span class="text-purple-400 font-bold">${autonomia}%</span></p>
            </div>
            <div class="border-l border-slate-700 pl-6">
              <p class="text-slate-300 mb-1 font-semibold uppercase tracking-wider">Promedio Diario</p>
              <p>• Red: <span class="text-white">${dailyConsumption} kWh/d</span></p>
              <p>• Sol: <span class="text-jf-solar">${dailyGeneration} kWh/d</span></p>
            </div>
            <div class="border-l border-slate-700 pl-6">
              <p class="text-slate-300 mb-1 font-semibold uppercase tracking-wider">Fluctuación</p>
              <p>• Ant: <span>${formatCOP(row.prevPrecio)}</span></p>
              <p>• Dif: <span class="${colorClass}">${row.precioKw >= row.prevPrecio ? '+' : ''}${formatCOP(row.precioKw - row.prevPrecio)}</span></p>
            </div>
          </div>
        </td>
      `;

      tbody.appendChild(trDet);
    });
  }

  /**
   * Alterna la visibilidad de una fila
   * @param {string} rowId - ID de la fila
   */
  toggleRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
      row.classList.toggle('hidden');
    }
  }

  /**
   * Obtiene los datos de la tabla en un array
   * @returns {array} Array de datos de tabla
   */
  getTableData() {
    const tbody = document.getElementById('table-body');
    if (!tbody) return [];

    const rows = [];
    tbody.querySelectorAll('tr').forEach((row) => {
      if (!row.id.startsWith('det-')) {
        const cells = row.querySelectorAll('td');
        rows.push({
          label: cells[0]?.innerText || '',
          readings: cells[1]?.innerText || '',
          consumption: cells[2]?.innerText || '',
          generation: cells[3]?.innerText || '',
          price: cells[4]?.innerText || '',
          savings: cells[5]?.innerText || '',
        });
      }
    });

    return rows;
  }

  /**
   * Exporta tabla a CSV
   * @param {string} filename - Nombre del archivo
   */
  exportToCSV(filename = 'reporte-solar.csv') {
    const data = this.getTableData();
    if (data.length === 0) return;

    const csv = [
      ['Periodo', 'Lecturas', 'Consumo Red', 'Generación Solar', 'Precio kW', 'Ahorro Real'],
      ...data.map((row) => [
        row.label,
        row.readings,
        row.consumption,
        row.generation,
        row.price,
        row.savings,
      ]),
    ];

    const csvContent = csv.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export default new TablesModule();
