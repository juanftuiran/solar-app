# JF Solar Cloud - Plataforma de Analítica Solar v2.0

> Una plataforma profesional y escalable para la gestión y análisis de sistemas de energía solar conectados a la nube.

## 🌟 Características Principales

- ☁️ **Sincronización en Tiempo Real** con Supabase
- 📊 **Gráficos Interactivos** con Chart.js
- 🤖 **Análisis Predictivos** con IA/ML
- 🔐 **Autenticación y Control de Roles** (Admin/Observer)
- 🌐 **Multiidioma** (Español e Inglés)
- 📱 **Responsive Design** con Tailwind CSS
- ⚡ **Arquitectura Modular** y Escalable
- 💾 **CRUD Completo** de registros solares
- 📈 **KPIs Avanzados** y Análisis Estadísticos

## 📦 Estructura del Proyecto

```
solar-app/
├── public/                 # Archivos estáticos
│   └── index.html         # HTML limpio y semántico
├── src/
│   ├── js/
│   │   ├── main.js        # Punto de entrada principal
│   │   ├── modules/       # Módulos de negocio
│   │   │   ├── auth.js    # Autenticación
│   │   │   ├── database.js # CRUD de datos
│   │   │   ├── charts.js  # Gráficos
│   │   │   ├── tables.js  # Renderizado de tablas
│   │   │   ├── kpi.js     # Cálculo de KPIs
│   │   │   ├── analytics.js # Análisis predictivos
│   │   │   ├── data.js    # Procesamiento de datos
│   │   │   └── lang.js    # Localización
│   │   ├── services/      # Servicios
│   │   │   ├── supabaseClient.js
│   │   │   └── apiClient.js
│   │   ├── utils/         # Utilidades
│   │   │   ├── constants.js
│   │   │   ├── formatters.js
│   │   │   ├── helpers.js
│   │   │   └── validators.js
│   │   ├── views/         # Componentes de vista
│   │   └── config/        # Configuración
│   └── css/               # Estilos
│       ├── main.css
│       ├── components.css
│       └── themes.css
├── assets/                # Recursos
│   ├── images/
│   └── icons/
├── package.json
├── vite.config.js
├── tsconfig.json
├── .env.example
├── .gitignore
├── .prettierrc
└── README.md
```

## 🚀 Instalación y Configuración

### 1. Clonar el repositorio

```bash
git clone <tu-repo>
cd solar-app
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Editar `.env.local` con tus credenciales de Supabase:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anonima
```

### 4. Ejecutar en desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

### 5. Compilar para producción

```bash
npm run build
```

El resultado estará en la carpeta `dist/`

## 🏗️ Arquitectura

### Patrón de Módulos

Cada módulo tiene una responsabilidad específica y puede reutilizarse:

```javascript
// Ejemplo: Usando el módulo de autenticación
import authModule from './modules/auth.js';

const success = await authModule.login(email, password);
const user = authModule.getUser();
const isAdmin = authModule.isUserAdmin();
```

### Servicios

Los servicios manejan la comunicación con Supabase:

```javascript
import { getSolarReadings, upsertSolarReading } from './services/apiClient.js';

const readings = await getSolarReadings();
await upsertSolarReading(record);
```

### Utilidades

Funciones reutilizables para formateo, validación y lógica común:

```javascript
import { formatCOP, validateEmail, debounce } from './utils/index.js';

const formatted = formatCOP(1000000); // "$ 1.000.000"
const isValid = validateEmail('user@example.com'); // true
const debouncedFn = debounce(myFunction, 300);
```

## 📚 API de Módulos

### AuthModule

```javascript
authModule.login(email, password)        // Inicia sesión
authModule.logout()                      // Cierra sesión
authModule.getUser()                     // Obtiene usuario actual
authModule.isUserAdmin()                 // Verifica si es admin
authModule.getUserEmail()                // Obtiene email del usuario
authModule.getUserRole()                 // Obtiene rol ('admin' | 'observer')
```

### DatabaseModule

```javascript
databaseModule.fetchAllData()            // Carga todos los datos
databaseModule.getDataByYear(year)       // Filtra por año
databaseModule.getAllData()              // Obtiene todos los datos
databaseModule.saveRecord(record)        // Guarda un registro
databaseModule.deleteRecord(id)          // Elimina un registro
databaseModule.findRecord(id)            // Busca un registro por ID
databaseModule.getLatestRecord()         // Obtiene el registro más reciente
```

### ChartsModule

```javascript
chartsModule.renderEnergyChart(data, lang)     // Renderiza gráfico de energía
chartsModule.renderPriceChart(data, lang)      // Renderiza gráfico de precios
chartsModule.toggleChartType(type, data, lang) // Cambia tipo de gráfico
chartsModule.destroyAllCharts()                // Destruye todos los gráficos
```

### KPIModule

```javascript
kpiModule.calculateKPIs(viewData, allData, investment)
kpiModule.calculateROI(investment, avgSavings)
kpiModule.calculateAutonomy(gridConsumption, solarProduction)
kpiModule.calculateSavings(solarProduction, pricePerKw)
```

### AnalyticsModule

```javascript
analyticsModule.calculateProjections(data, lang)
analyticsModule.predictNextReading(lastRecord, previousRecord)
analyticsModule.calculateSeasonality(data)
analyticsModule.detectAnomalies(data)
```

## 🔧 Configuración de Supabase

### Crear tablas necesarias

1. **Tabla: solar_readings**

```sql
CREATE TABLE solar_readings (
  id TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  monthIdx INTEGER NOT NULL,
  fecha DATE NOT NULL,
  lecturaRed DECIMAL(10, 2) NOT NULL,
  lecturaSolar DECIMAL(10, 2) NOT NULL,
  precioKw DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_solar_readings_year ON solar_readings(year);
```

2. **Tabla: user_roles**

```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'observer',
  created_at TIMESTAMP DEFAULT now()
);
```

## 📊 Estructura de Datos

### Registro Solar (solar_readings)

```javascript
{
  id: "2026-04",
  year: 2026,
  monthIdx: 4,
  fecha: "2026-04-15",
  lecturaRed: 1234.5,      // kWh consumidos de la red
  lecturaSolar: 567.8,     // kWh generados por solar
  precioKw: 450.25         // Precio por kW en COP
}
```

### Registro Procesado

```javascript
{
  ...rawData,
  label: "Abr 2026",
  consumoRed: 123.4,       // Diferencia de lecturas de red
  prodBruta: 56.8,         // Diferencia de lecturas solares
  consumoTotal: 180.2,     // Consumo total
  autonomia: 31.5,         // Porcentaje de independencia energética
  incPrecio: 2.5,          // Variación de precio %
  ahorroReal: 25560        // Ahorro en moneda
}
```

## 🎨 Personalización

### Temas de Color

Editar en `src/css/main.css`:

```css
:root {
  --color-jf-bg: #0b1120;
  --color-jf-card: #1e293b;
  --color-jf-accent: #0ea5e9;
  --color-jf-solar: #10b981;
  --color-jf-grid: #f43f5e;
  --color-jf-ai: #8b5cf6;
}
```

### Traducción

Editar en `src/js/modules/lang.js`:

```javascript
this.translations = {
  es: { /* Palabras en español */ },
  en: { /* Palabras en inglés */ }
}
```

## 🔒 Seguridad

- ✅ Autenticación con Supabase Auth
- ✅ Control de roles (Admin/Observer)
- ✅ Validación de datos en cliente y servidor
- ✅ Variables de entorno para credenciales
- ✅ HTTPS recomendado para producción
- ✅ Row Level Security en Supabase

## 📈 Métricas y Análisis

### KPIs Disponibles

- **Ahorro Generado**: Suma total de ahorros en moneda
- **Generación Neta**: Total de kWh generados
- **Independencia Energética**: Porcentaje de autonomía
- **Variación kW**: Promedio de cambio de precio
- **ROI**: Años para recuperar la inversión
- **CO2 Evitado**: Kg de carbono que no se emitieron

### Análisis Predictivos

- Proyección de precios a 12 meses (regresión lineal)
- Identificación de mes pico de generación
- Cálculo de estacionalidad
- Detección de anomalías (Z-score)
- Predicción de lecturas futuras

## 🚢 Deployment

### Vercel

```bash
npm run build
# Configurar en Vercel:
# - Build Command: npm run build
# - Output Directory: dist
```

### Netlify

```bash
npm run build
# Arrastra la carpeta dist a Netlify
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la licencia MIT. Ver `LICENSE` para más detalles.

## 📧 Contacto

JF Development Team - [contacto@jfsolar.com]

## 🙏 Agradecimientos

- [Supabase](https://supabase.com) por la base de datos
- [Chart.js](https://www.chartjs.org) por los gráficos
- [Tailwind CSS](https://tailwindcss.com) por los estilos
- [Font Awesome](https://fontawesome.com) por los iconos

---

**Hecho con ❤️ para gestionar tu energía solar de forma profesional**
