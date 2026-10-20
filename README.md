# ☀️ JF Solar — Enterprise Photovoltaic Telemetry & Financial Valuation Platform (v4.0)

[![Version](https://img.shields.io/badge/version-4.0.0--Enterprise-00e5ff.svg)](#)
[![Architecture](https://img.shields.io/badge/architecture-ES6%20Modular%20SPA-8b5cf6.svg)](#)
[![Backend](https://img.shields.io/badge/backend-Supabase%20PostgreSQL%20%2B%20RLS-10b981.svg)](#)
[![Standard](https://img.shields.io/badge/standard-IEC%2061724%20PV%20Analytics-f59e0b.svg)](#)

**JF Solar Cloud v4.0** es una plataforma empresarial de telemetría fotovoltaica, auditoría energética y valoración financiera multi-proyecto. Diseñada bajo una estética **Precision Industrial Glass & Obsidian / Daylight High-Contrast**, transforma lecturas acumulativas de medidores bidireccionales e inversores solares en inteligencia operativa (IEC 61724) y modelos financieros de flujo de caja descontado (DCF a 25 años).

---

## 🚀 Novedades Principales en v4.0 Enterprise

1. **Simulador Financiero Interactivo a 25 Años (DCF):**
   - Controles deslizantes en tiempo real para **Inflación Tarifaria Anual (% IPC)**, **Degradación Anual de Paneles (%)** y **Tasa de Descuento / WACC (%)**.
   - Cálculo instantáneo de **VPN / NPV (Valor Presente Neto)**, **TIR / IRR (Tasa Interna de Retorno)** mediante bisección numérica, **LCOE (Costo Nivelado de Energía en COP/kWh)**, **Año de Punto de Equilibrio (Payback)** y tabla detallada de flujos de caja.
2. **Ingeniería Fotovoltaica Estándar IEC 61724:**
   - Normalización de producción por potencia instalada activa ($kWp$) en cada corte histórico.
   - Cálculo de **Productividad Específica ($Y_f$)** en $\text{kWh/kWp/mes}$, **Horas Solares Pico Equivalentes ($HSP$)** en $\text{h/día}$ y **Performance Ratio ($PR\%$)** frente a irradiancia de referencia.
   - Comparativas **Month-over-Month ($\Delta\%$)** en las tarjetas ejecutivas de KPIs y **Detector Automático de Anomalías Operativas** (alertas tempranas por caídas de generación $>22\%$ o alzas tarifarias atípicas $>8\%$).
3. **Visibilidad Total de Línea Base ($t_0$) e Importador Masivo CSV:**
   - El registro fundacional de partida ($t_0$) ahora es visible y editable desde la bitácora Cloud con insignia `BASE t₀`.
   - Nuevo **Asistente de Importación CSV (`Upsert`)** con previsualización y validación de columnas, además de exportación CSV enriquecida con métricas de ingeniería.
4. **Reporte Ejecutivo PDF / Print & Modo Presentación (Kiosk HUD):**
   - Generador de **Informe Ejecutivo de Auditoría** listo para impresión o guardado en PDF con hoja de estilo `@media print` dedicada.
   - **Modo Presentación / Kiosk** de pantalla completa para salas de juntas o monitores de planta con barra flotante HUD.
   - **Selector de Tema Dual:** *Dark Obsidian* (telemetría nocturna de alto contraste) y *Daylight High-Contrast* (lectura ejecutiva diurna).

---

## 🏛️ Arquitectura del Sistema

El proyecto utiliza **Vanilla JavaScript ES6+** empaquetado con **Vite**, sin dependencias pesadas de frameworks, garantizando tiempos de carga instantáneos y control absoluto del DOM y de las instancias de **Chart.js 4**.

```text
solar-app/
├── index.html                        # Shell SPA: Login, Project Selector, Dashboard & Modals
├── package.json                      # Configuración Vite v5, Chart.js v4, Supabase JS v2
├── sql/
│   ├── 00_full_schema_v4.sql         # Script maestro consolidado e idempotente (Tablas + RBAC + RLS)
│   ├── multi_project_migration.sql   # Migración histórica multi-proyecto
│   └── rls_security_fix.sql          # Parche de seguridad RLS sin recursión
└── src/
    ├── app.js                        # Orquestador principal SPA, eventos, modales, CSV & Kiosk
    ├── app.css                       # Sistema de diseño Obsidian + Daylight + @media print
    ├── components/
    │   └── projectCard.js            # Tarjetas de portafolio con CAPEX, kWp, fases y estado
    ├── modules/
    │   ├── state.js                  # Estado reactivo centralizado + persistencia localStorage
    │   ├── i18n.js                   # Diccionario bilingüe completo (ES / EN)
    │   ├── supabase.js               # Capa de datos Supabase Auth, PostgreSQL, RBAC & Batch Upsert
    │   ├── analytics.js              # Motor matemático IEC 61724, WLS Regression, Anomalías & DCF
    │   ├── charts.js                 # Suite de 6 gráficos interactivos Chart.js + Sincronización de Tema
    │   └── ui.js                     # Utilidades DOM, formatters, count-up animations & toasts
    └── views/
        ├── projectSelectorView.js    # Vista de portafolio multi-proyecto y resumen de capital
        ├── dashboardView.js          # Vista de telemetría, simulador 25Y, bitácora y modales
        └── projectSettingsView.js    # Gestión de fases CAPEX, miembros RBAC y configuración
```

---

## 📐 Modelos Matemáticos y Financieros (`src/modules/analytics.js`)

### 1. Diferenciales de Telemetría y Reinicio de Hardware (`inverter_reset` / `meter_reset`)
Dado un conjunto ordenado cronológicamente de lecturas acumuladas $L_0, L_1, \dots, L_n$:
- Si el registro $i$ no presenta bandera de reinicio, el diferencial del periodo de facturación $\Delta t_i$ (en días exactos entre fechas) es:
  $$\Delta E_{\text{solar}, i} = \max(0, L_{\text{solar}, i} - L_{\text{solar}, i-1}), \quad \Delta E_{\text{red}, i} = \max(0, L_{\text{red}, i} - L_{\text{red}, i-1})$$
- Si se marca cambio o reinicio de inversor/medidor (`inverter_reset = true` o `meter_reset = true`), el sistema toma el valor acumulado actual como producción neta del nuevo equipo sin generar deltas negativos.

### 2. Normalización Fotovoltaica IEC 61724
Para cada fecha de lectura $t_i$, el motor suma la potencia instalada activa $P_{\text{inst}}(t_i)$ (en $\text{kWp}$) de todas las fases de inversión cuya `execution_date` $\le t_i$:
- **Productividad Específica ($Y_f$):**
  $$Y_{f, i} = \frac{\Delta E_{\text{solar}, i}}{P_{\text{inst}}(t_i)} \quad [\text{kWh / kWp}]$$
- **Horas Solares Pico Equivalentes ($HSP$):**
  $$HSP_i = \frac{Y_{f, i}}{\Delta d_i} \quad [\text{h / día}]$$
- **Performance Ratio ($PR\%$):**
  $$PR_i = \min\left(100\%, \frac{HSP_i}{HSP_{\text{ref}}} \times 100\right)$$

### 3. Regresión Econométrica WLS (Weighted Least Squares)
Para proyectar tarifas y producción estacional, se aplica una regresión lineal ponderada con decaimiento exponencial ($\lambda = 0.90$), otorgando mayor peso estadístico a la estructura tarifaria y climática reciente:
$$w_k = \lambda^{n - 1 - k}$$

### 4. Valoración Financiera DCF a 25 Años (`calcFinancialSimulation`)
Considerando una inversión de capital total $\text{CAPEX}_0$, inflación tarifaria anual $g$, degradación anual de módulos $d$ y costo de capital (WACC) $r$:
- **Flujo de Caja Anual ($CF_t$):**
  $$CF_t = E_{\text{anual}, 0} \cdot (1 - d)^{t-1} \cdot P_{\text{kWh}, 0} \cdot (1 + g)^{t-1}$$
- **Valor Presente Neto ($\text{VPN / NPV}$):**
  $$\text{VPN} = -\text{CAPEX}_0 + \sum_{t=1}^{25} \frac{CF_t}{(1 + r)^t}$$
- **Tasa Interna de Retorno ($\text{TIR / IRR}$):** Tasa $r^*$ tal que $\text{VPN}(r^*) = 0$, resuelta mediante bisección numérica convergente.
- **Costo Nivelado de Energía ($\text{LCOE}$):**
  $$\text{LCOE} = \frac{\text{CAPEX}_0}{\sum_{t=1}^{25} \frac{E_{\text{anual}, 0} \cdot (1 - d)^{t-1}}{(1 + r)^t}} \quad [\text{COP / kWh}]$$

---

## 🛠️ Instalación, Configuración y Despliegue

### 1. Requisitos Previos
- **Node.js** `>= 18.x`
- Proyecto activo en **Supabase** (PostgreSQL + Auth)

### 2. Configuración de Base de Datos (Supabase SQL)
Ejecute el script maestro consolidado [`sql/00_full_schema_v4.sql`](sql/00_full_schema_v4.sql) en el **SQL Editor** de su panel de Supabase. Este script es 100% idempotente y configura:
- Tablas `solar_projects`, `project_members`, `project_investments`, y `solar_readings`.
- Índices de rendimiento y banderas `inverter_reset` / `meter_reset`.
- Funciones de seguridad `is_project_member` y `has_project_role` (`SECURITY DEFINER`).
- Función RPC `add_project_member_by_email` para invitar colaboradores por correo.
- Políticas **Row-Level Security (RLS)** estrictas por rol (`owner`, `editor`, `viewer`).

### 3. Variables de Entorno y Ejecución Local
```bash
# 1. Instalar dependencias
npm install

# 2. (Opcional) Configurar credenciales propias en archivo .env
# VITE_SUPABASE_URL=https://su-proyecto.supabase.co
# VITE_SUPABASE_ANON_KEY=su-anon-key

# 3. Iniciar servidor de desarrollo Vite
npm run dev

# 4. Compilar bundle optimizado de producción
npm run build
```

---

## 🔒 Matriz de Permisos RBAC

| Acción | Propietario (`owner`) | Editor (`editor`) | Lector (`viewer`) |
| :--- | :---: | :---: | :---: |
| Ver Dashboard, KPIs, Gráficos y Simulador 25Y | ✅ | ✅ | ✅ |
| Exportar CSV y Generar Reporte Ejecutivo PDF | ✅ | ✅ | ✅ |
| Registrar / Editar / Eliminar Lecturas Cloud | ✅ | ✅ | ❌ |
| Importar Lotes CSV (`Batch Upsert`) | ✅ | ✅ | ❌ |
| Administrar Fases de Inversión (CAPEX / kWp) | ✅ | ✅ | ❌ |
| Invitar / Revocar Miembros del Proyecto | ✅ | ❌ | ❌ |
| Eliminar Proyecto Completo | ✅ | ❌ | ❌ |

---

*Desarrollado para **JF Solar** — Ingeniería y Analítica Fotovoltaica de Precisión.*
