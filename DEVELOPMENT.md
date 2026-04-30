# Guía de Desarrollo

## Configuración del Ambiente

### Requisitos

- Node.js 18+
- npm 9+

### Setup Inicial

```bash
# 1. Instalar dependencias
npm install

# 2. Crear archivo .env.local
cp .env.example .env.local

# 3. Agregar credenciales de Supabase
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...

# 4. Iniciar servidor de desarrollo
npm run dev
```

## Scripts Disponibles

```bash
npm run dev         # Inicia servidor de desarrollo (puerto 3000)
npm run build       # Compila para producción
npm run preview     # Vista previa de la compilación
npm run lint        # Ejecuta ESLint
npm run format      # Formatea código con Prettier
npm run type-check  # Verifica tipos con TypeScript
npm run test        # Ejecuta pruebas
```

## Estructura de Carpetas

### `/src/js`

- **main.js**: Archivo de entrada, aquí se inicializa la app
- **modules/**: Módulos de lógica de negocio, cada uno con responsabilidad única
- **services/**: Servicios que comunican con APIs externas (Supabase)
- **utils/**: Funciones reutilizables (formateo, validación, helpers)
- **config/**: Archivos de configuración
- **views/**: Componentes de vista (en caso de usar un framework)

### `/src/css`

- **main.css**: Estilos globales
- **components.css**: Estilos de componentes reutilizables
- **themes.css**: Temas y variantes de color

### `/public`

- **index.html**: HTML principal limpio y semántico

## Flujo de Datos

```
User Input
    ↓
Event Listener (en main.js)
    ↓
Handler Function
    ↓
Module/Service
    ↓
Supabase API / Local State
    ↓
Re-render UI (Charts, Tables, KPIs)
```

## Agregar una Nueva Característica

### Ejemplo: Agregar exportación a PDF

1. **Crear módulo** en `src/js/modules/pdf.js`:

```javascript
export class PDFModule {
  generateReport(data) {
    // Lógica para generar PDF
  }
}
```

2. **Importar en main.js**:

```javascript
import pdfModule from './modules/pdf.js';
window.app.pdfModule = pdfModule;
```

3. **Usar en la UI**:

```html
<button onclick="app.pdfModule.generateReport(currentData)">
  Exportar PDF
</button>
```

## Convenciones de Código

### Nombres

- Variables: `camelCase`
- Constantes: `UPPER_SNAKE_CASE`
- Clases: `PascalCase`
- Funciones: `camelCase`
- Archivos: `kebab-case.js`

### Comentarios

```javascript
/**
 * Descripción breve de la función
 * @param {type} name - Descripción del parámetro
 * @returns {type} Descripción del retorno
 */
function myFunction(param1, param2) {
  // Comentarios de implementación si es necesario
}
```

### Indentación

- 2 espacios (configurado en .prettierrc)
- Usar `const` por defecto, `let` si es necesario
- Evitar `var`

## Testing

```bash
# Ejecutar pruebas
npm run test

# Con cobertura
npm run test:coverage
```

Ejemplo de prueba:

```javascript
// src/js/utils/__tests__/formatters.test.js
import { formatCOP } from '../formatters.js';

describe('formatCOP', () => {
  it('should format COP currency correctly', () => {
    const result = formatCOP(1000000);
    expect(result).toBe('$ 1.000.000');
  });
});
```

## Debugging

### En VS Code

1. Instalar extensión "Debugger for Chrome"
2. Crear `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}"
    }
  ]
}
```

### En el navegador

- F12 para abrir DevTools
- Usar `console.log()`, `debugger`, breakpoints
- Network tab para ver requests a Supabase

## Mejores Prácticas

1. ✅ **Separación de responsabilidades**: Cada módulo hace UNA cosa bien
2. ✅ **DRY (Don't Repeat Yourself)**: Reutilizar código en utils
3. ✅ **Nombres descriptivos**: Variable name > x, y, z
4. ✅ **Funciones pequeñas**: Max 30 líneas idealmente
5. ✅ **Error handling**: Try-catch en operaciones async
6. ✅ **Documentación**: JSDoc para funciones públicas
7. ✅ **Performance**: Usar debounce/throttle para event listeners
8. ✅ **Seguridad**: Validar datos, usar variables de entorno

## Troubleshooting

### "Cannot find module"

- Verificar ruta del import
- Verificar alias en vite.config.js

### "Supabase connection failed"

- Verificar variables de entorno
- Verificar credenciales en .env.local
- Verificar conexión a internet

### "Module not found at runtime"

- `npm install` nuevamente
- Limpiar `node_modules` y reinstalar

### "Gráficos no se muestran"

- Verificar que ChartJS esté cargado
- Verificar que el canvas tenga id correcto

## Recursos Útiles

- [Vite Documentation](https://vitejs.dev)
- [Supabase Docs](https://supabase.com/docs)
- [Chart.js Guide](https://www.chartjs.org/docs/latest/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [JavaScript MDN](https://developer.mozilla.org/es/docs/Web/JavaScript)

## Preguntas Frecuentes

**P: ¿Cómo agregar un nuevo idioma?**
A: Editar `lang.js` y agregar traducción en el objeto `translations`

**P: ¿Cómo cambiar colores del tema?**
A: Editar variables CSS en `src/css/main.css` sección `:root`

**P: ¿Cómo proteger rutas admin?**
A: El sistema ya valida roles. Agregar más validación en `authModule.isUserAdmin()`

---

¡Feliz desarrollo! 🚀
