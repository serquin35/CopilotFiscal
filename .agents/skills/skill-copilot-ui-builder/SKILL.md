---
name: skill-copilot-ui-builder
description: >
  Skill maestra para construir y mantener la UI del Copiloto Fiscal.
  Define los tokens de diseño oficiales, el stack tecnológico, las reglas de
  composición de componentes y los patrones de layout que deben respetarse en
  TODAS las pantallas del proyecto.
version: "1.0.0"
stack:
  - Next.js 14 (App Router)
  - Tailwind CSS v3
  - Lucide Icons
reference_url: https://corrala.vercel.app/
---

# Skill: Copiloto Fiscal UI Builder

## 1. Referencia Visual Oficial

La ÚNICA fuente de verdad visual es `https://corrala.vercel.app/`.
Cualquier nueva pantalla o componente DEBE seguir esta referencia.
Modo: DARK exclusivo. No hay modo claro.

---

## 2. Design Tokens (Extraídos del CSS compilado de la referencia)

### 2.1 Tipografías
| Rol  | Familia                    | Uso                                  |
|------|----------------------------|--------------------------------------|
| Sans | Geist, ui-sans-serif       | Texto UI, labels, títulos            |
| Mono | Geist Mono, ui-monospace   | Cifras fiscales, importes, IDs       |

Instalar: `npm install geist`

### 2.2 Paleta de Colores (CSS Variables en globals.css)
```
--background:        #13181d   Fondo principal
--card:              #1a2026   Cards / secciones
--popover:           #1f252b   Tooltips / dropdowns
--sidebar:           #161b21   Sidebar
--foreground:        #eeebe5   Texto principal (warm white)
--muted-foreground:  #9ba2ab   Labels / texto secundario
--primary:           #77c4a3   Verde menta - acción principal
--primary-foreground:#0a191a   Texto sobre primary
--secondary:         #262c32   Superficies secundarias
--muted:             #262c32   Fondo muted
--warning:           #e9b364   Alertas / plazos / borrador
--warning-foreground:#24180a
--destructive:       #ec7b74   Errores / alta prioridad
--border:            #ffffff14 Bordes (8% white)
--input:             #ffffff1f Input border (12% white)
--ring:              #77c4a399 Focus ring
--chart-1:           #77c4a3   Verde primario
--chart-2:           #738292   Azul-gris (IVA repercutido)
--chart-3:           #e9b364   Ámbar
--chart-4:           #ec7b74   Rojo suave
--chart-5:           #4d5660   Gris oscuro
--radius:            0.75rem
```

---

## 3. Reglas de Layout

### 3.1 Wrapper de página
```
mx-auto flex min-h-dvh w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10
```

### 3.2 Cards
```
rounded-2xl border border-border bg-card p-6 (md:p-8 en secciones anchas)
```

### 3.3 Grid responsive
- Mobile: 1 columna
- Desktop (lg): 3 columnas, sección principal = lg:col-span-2

### 3.4 Cifras fiscales
```
font-mono tabular-nums tracking-tight
Grandes: text-5xl font-semibold md:text-6xl
Medianas: text-lg
Pequeñas: text-sm
```

### 3.5 Badges de estado
| Estado         | Clases bg/text                               |
|----------------|----------------------------------------------|
| Sin revisar    | bg-muted text-muted-foreground               |
| Borrador       | bg-warning/15 text-warning                   |
| Duplicada      | bg-destructive/15 text-destructive           |
| IVA incorrecto | bg-destructive/15 text-destructive           |
| Sin NIF        | bg-warning/15 text-warning                   |
| Aprobada       | bg-primary/15 text-primary                   |

---

## 4. Rutas del Proyecto

| Ruta                      | Descripción                          |
|---------------------------|--------------------------------------|
| /                         | Dashboard (KPIs, IVA, alertas)       |
| /documents                | Ingest + tabla de facturas           |
| /documents/[id]/review    | Revisor human-in-the-loop            |
| /expenses                 | Gastos pendientes de validar         |
| /alerts                   | Monitor de anomalías                 |
| /copilot                  | Explicador IA de decisiones fiscales |

---

## 5. Reglas Críticas

1. UI = DUMMY. Cero lógica fiscal en componentes.
2. Server Components por defecto. "use client" solo si hay estado/eventos.
3. Estados de documentos vienen de Supabase, nunca se mutan localmente.
4. Formato numérico siempre es-ES: 1.284,50 €
5. Accesibilidad obligatoria: aria-label, role, aria-live.
6. Importar Lucide para iconografía, NO usar otras librerías de iconos.

---

## 6. Componentes UI Base (src/components/ui/)

- StatusBadge — pill de estado de factura/gasto
- MonoAmount — cifra fiscal con formato es-ES + Geist Mono
- QuarterSelector — selector T1/T2/T3/T4 con año
- ProgressBar — barra semántica (primary / warning / destructive)
- AlertCard — tarjeta de anomalía con prioridad y botón descartar
- ExpenseRow — fila de tabla con botones aprobar/rechazar
- SectionCard — wrapper rounded-2xl border bg-card reutilizable
- PageHeader — cabecera de página con título, subtítulo y selector de trimestre
