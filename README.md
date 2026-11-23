# JF Solar Cloud — Enterprise Photovoltaic Telemetry & Financial Valuation Platform (v4.0)

**JF Solar Cloud** es una plataforma multi-proyecto de telemetría fotovoltaica, auditoría energética (IEC 61724) y valoración financiera (DCF a 25 años), migrada a **React 18 + Vite** sobre **Supabase (Auth + PostgreSQL + RLS)** y proxy autenticado para **Solarman Open API v1.0**.

---

## Arquitectura del Sistema

```text
solar-app/
├── api/
│   └── solarman.js                   # Proxy Serverless /api/solarman (JWT Supabase + allowlist + límite 64 KB)
├── sql/
│   ├── 05_canonical_rls.sql          # Script maestro canónico e idempotente (RLS + RPC + project_portfolio_stats)
│   ├── migration.sql                 # Histórico (ver 05_canonical_rls.sql)
│   └── 00_full_schema_v4.sql         # No aplicable al esquema actual (histórico)
└── src/
    ├── main.jsx                      # Punto de entrada React
    ├── App.jsx                       # Enrutador y shell principal
    ├── context/                      # AppContext, AuthContext, ProjectContext, ToastContext
    ├── components/                   # ChartCanvas, Sidebar, StatePanel, ProjectCard, Modals
    ├── views/                        # Login, ProjectSelector, Dashboard (tabs), Settings, Members, Solarman
    └── modules/
        ├── analytics.js              # Motor IEC 61724, regresión WLS, anomalías y simulador DCF
        ├── supabase.js               # Cliente Supabase sin fallbacks hardcodeados
        ├── i18n.js                   # Diccionario bilingüe unificado ES / EN
        └── solarman/                 # Integración Solarman (sessionStorage sin secretos en cliente)
```

---

## Configuración de Base de Datos (Supabase SQL)

Ejecuta [`sql/05_canonical_rls.sql`](sql/05_canonical_rls.sql) en el **SQL Editor** de Supabase. Configura de forma idempotente:

- Tablas reales utilizadas por la aplicación: `projects`, `project_members` (`admin` / `observer`), `project_investments` (`investment_cop`, `capacity_added_kw`, `start_date`) y `solar_readings` (`project_id` obligatorio).
- Trigger `trg_enforce_max_projects` (límite de 20 proyectos por propietario en servidor).
- RPC `add_project_member_by_email` (`SECURITY DEFINER`, `SET search_path = public`, sin enumeración de usuarios).
- Vista `project_portfolio_stats` (`security_invoker = true`) para listar proyectos sin descargar toda la telemetría.

---

## Variables de Entorno y Comandos

Copia `.env.example` a `.env` y define tus variables reales (nunca expongas secretos con prefijo `VITE_`):

```bash
# Cliente (públicas en el bundle)
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-supabase-anon-key

# Servidor /api/solarman (solo backend / Vercel / dev middleware)
SOLARMAN_APP_ID=tu_solarman_app_id
SOLARMAN_APP_SECRET=tu_solarman_app_secret
ALLOWED_ORIGIN=https://tu-dominio.vercel.app
```

```bash
npm install      # Instalar dependencias
npm run dev      # Servidor de desarrollo Vite (puerto 6600)
npm test         # Suite de pruebas unitarias (Vitest)
npm run build    # Compilar bundle de producción
```

---

## Matriz de Permisos RBAC

| Acción | Propietario (`owner_id`) | Admin (`admin`) | Observador (`observer`) |
| :--- | :---: | :---: | :---: |
| Ver Dashboard, KPIs, Gráficos y Simulador 25Y | ✅ | ✅ | ✅ |
| Exportar CSV y Generar Reporte Ejecutivo | ✅ | ✅ | ✅ |
| Registrar / Editar / Eliminar Lecturas y Fases | ✅ | ✅ | ❌ |
| Invitar / Revocar Miembros del Proyecto | ✅ | ✅ | ❌ |
| Actualizar Configuración General / Eliminar Proyecto | ✅ | ❌ | ❌ |
