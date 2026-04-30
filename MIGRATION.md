# 🔄 Guía de Migración v1.0 → v2.0

Este documento explica cómo el código de la v1.0 fue refactorizado en la v2.0 con una estructura profesional.

## Cambios Principales

### 1. **Separación de Responsabilidades**

#### Antes (v1.0)
```javascript
// TODO mezclado en un solo archivo HTML
// - HTML + CSS + JavaScript (2000+ líneas)
// - Variables globales
// - Funciones interconectadas sin patrón claro
```

#### Ahora (v2.0)
```
/src/js/modules/auth.js       → Lógica de autenticación
/src/js/modules/database.js   → Operaciones CRUD
/src/js/modules/charts.js     → Gráficos
/src/js/modules/tables.js     → Tablas
/src/js/modules/kpi.js        → Cálculos de KPI
/src/js/modules/analytics.js  → Análisis predictivos
/src/js/modules/lang.js       → Multiidioma
```

### 2. **Servicios Externos**

#### Antes
```javascript
const supabaseUrl = 'https://...'; // Hardcodeado
const supabaseKey = 'sb_...';      // En texto plano
```

#### Ahora
```javascript
// /src/js/services/supabaseClient.js
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
// Variables de entorno en .env.local
```

### 3. **Utilidades Reutilizables**

#### Antes
```javascript
// Formateo inline
function formatCOP(value) {
  return new Intl.NumberFormat(...).format(value);
}
// Repetido varias veces en el código
```

#### Ahora
```javascript
// /src/js/utils/formatters.js
export const formatCOP = (value) => {
  return new Intl.NumberFormat(...).format(value);
};

// En cualquier módulo:
import { formatCOP } from './utils/formatters.js';
```

### 4. **Manejo de Estado**

#### Antes
```javascript
let isAdmin = false;
let chartsObj = {};
let currentViewData = [];
let dbData = [];
// Estado disperso sin patrón claro
```

#### Ahora
```javascript
// Cada módulo maneja su propio estado
class DatabaseModule {
  constructor() {
    this.data = [];
    this.onDataChange = null;
  }
}

// En main.js coordinamos los módulos
let currentProcessedData = [];
```

### 5. **Eventos y Handlers**

#### Antes
```javascript
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  // 50 líneas de código inline
  const { data, error } = await sb.auth.signInWithPassword(...);
  // ... más código
});
```

#### Ahora
```javascript
// En main.js - configuración centralizada de listeners
function setupEventListeners() {
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
}

// En módulos - lógica específica
async function handleLogin(e) {
  e.preventDefault();
  const success = await authModule.login(email, password);
  if (success) await initializeDashboard();
}
```

### 6. **Inicialización**

#### Antes
```javascript
window.onload = async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (session) { handleLoginSuccess(session.user); }
  // ...
}
```

#### Ahora
```javascript
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  initializeApp();
});

async function initializeApp() {
  const session = await authModule.getCurrentSession?.();
  if (session) {
    await initializeDashboard();
  }
}
```

## Mapeo de Funcionalidades

### Autenticación

| v1.0 | v2.0 |
|------|------|
| `signIn()` en script | `authModule.login()` |
| `signOut()` en script | `authModule.logout()` |
| Variable global `isAdmin` | `authModule.isUserAdmin()` |
| `handleLoginSuccess()` | `authModule` + `initializeDashboard()` |

### Base de Datos

| v1.0 | v2.0 |
|------|------|
| `fetchSupabaseData()` | `databaseModule.fetchAllData()` |
| `openModal()` global | `openModal()` en main.js |
| `addRecordForm` submit | `handleSaveRecord()` |
| `deleteRecord()` | `databaseModule.deleteRecord()` |

### Procesamiento de Datos

| v1.0 | v2.0 |
|------|------|
| `processAndRender()` largo | `dataProcessor.processRawData()` |
| Cálculos inline | `kpiModule.calculateKPIs()` |
| `renderAIProjections()` | `analyticsModule.calculateProjections()` |
| `renderTable()` | `tablesModule.renderTableBody()` |

### Gráficos

| v1.0 | v2.0 |
|------|------|
| `renderEnergiaChart()` | `chartsModule.renderEnergyChart()` |
| `renderPrecioChart()` | `chartsModule.renderPriceChart()` |
| `toggleChartType()` | `chartsModule.toggleChartType()` |

### Idioma

| v1.0 | v2.0 |
|------|------|
| `setLang()` global | `langModule.setLanguage()` |
| `getMonthName()` global | `langModule.getMonthName()` |
| Constante `langData` | Constante `MONTH_NAMES` |

## Ejemplos de Migración

### Cambiar de idioma

**Antes:**
```javascript
function setLang(lang, flagCode, text) {
  document.body.setAttribute('data-lang', lang);
  document.getElementById('current-flag').innerHTML = `...`;
  if(dbData.length > 0) processAndRender();
}
```

**Ahora:**
```javascript
function handleLanguageChange(e) {
  const lang = e.target.dataset.lang;
  langModule.setLanguage(lang);
  updateUILanguage();
  if (currentProcessedData.length > 0) {
    processAndRender();
  }
}

// En langModule
setLanguage(lang) {
  if (['es', 'en'].includes(lang)) {
    this.currentLang = lang;
    document.body.setAttribute('data-lang', lang);
  }
}
```

### Obtener rol del usuario

**Antes:**
```javascript
const { data: roleData, error } = await sb.from('user_roles')
  .select('role')
  .eq('email', user.email)
  .single();
isAdmin = (roleData && roleData.role === 'admin');
```

**Ahora:**
```javascript
// En authModule
async loadUserRole() {
  if (!this.user?.email) return;
  const role = await getUserRole(this.user.email);
  this.isAdmin = role === 'admin';
}

// En cualquier lugar
const isAdmin = authModule.isUserAdmin();
```

### Calcular KPI

**Antes:**
```javascript
// 200+ líneas de código inline en renderKPIs()
const totalSavings = viewData.reduce((acc, d) => acc + d.ahorroReal, 0);
const averageAutonomy = viewData.reduce((acc, d) => acc + d.autonomia, 0) / viewData.length;
// ... más cálculos
```

**Ahora:**
```javascript
const kpis = kpiModule.calculateKPIs(currentViewData, currentProcessedData, investment);
// Retorna objeto limpamente:
// {
//   totalSavings: "$1.234.567",
//   averageAutonomy: "45.6%",
//   roi: "3.2 años"
// }
```

## Ventajas de la Nueva Arquitectura

✅ **Modularidad**: Fácil de mantener y expandir
✅ **Reutilización**: Código sin duplicación
✅ **Testabilidad**: Cada módulo puede probarse aislado
✅ **Performance**: Mejor tree-shaking y bundling
✅ **Escalabilidad**: Fácil agregar nuevas características
✅ **Mantenibilidad**: Código más limpio y documentado
✅ **Colaboración**: Múltiples desarrolladores trabajan sin conflictos
✅ **Debugging**: Errores más claros con stack traces

## Cómo Usar el Nuevo Código

### Acceso Global a Módulos

```javascript
// Todos los módulos se exponen en window.app
window.app.authModule.getUser()
window.app.databaseModule.getAllData()
window.app.chartsModule.renderEnergyChart(data)
window.app.kpiModule.calculateKPIs(data)
```

### Importar en Nuevos Módulos

```javascript
// Crear nuevo módulo personalizado
import authModule from './modules/auth.js';
import databaseModule from './modules/database.js';

export class MyCustomModule {
  async doSomething() {
    const user = authModule.getUser();
    const data = databaseModule.getAllData();
    // ...
  }
}
```

## Próximas Mejoras Sugeridas

1. **Testing**: Agregar tests unitarios con Vitest
2. **TypeScript**: Convertir a TypeScript para type safety
3. **Framework**: Considerar Vue.js o React para componentes
4. **PWA**: Agregar soporte offline con Service Workers
5. **Analytics**: Integrar Google Analytics o similar
6. **i18n**: Usar librería profesional de i18n
7. **CSS-in-JS**: Considerar Styled Components o similar

---

**Migración completada ✅**
La aplicación v2.0 está lista para producción con una base sólida para crecer.
