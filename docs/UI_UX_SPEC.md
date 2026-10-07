# UI/UX Specification — Copiloto Fiscal
**Fuente de verdad visual:** https://corrala.vercel.app/
**Generado:** 2026-09-30 | **Versión:** 1.0.0

---

## 1. Stack Tecnológico

| Capa         | Tecnología              |
|--------------|-------------------------|
| Framework    | Next.js 14 (App Router) |
| Estilos      | Tailwind CSS v3         |
| Iconos       | Lucide React            |
| Tipografía   | Geist + Geist Mono (Vercel) |
| Modo         | Dark exclusivo          |

---

## 2. Tokens de Diseño

### 2.1 Colores

| Variable CSS           | Valor Hex   | Uso                              |
|------------------------|-------------|----------------------------------|
| `--background`         | `#13181d`   | Fondo principal de la app        |
| `--card`               | `#1a2026`   | Cards / secciones                |
| `--popover`            | `#1f252b`   | Tooltips, dropdowns              |
| `--sidebar`            | `#161b21`   | Sidebar (si aplica)              |
| `--foreground`         | `#eeebe5`   | Texto principal (warm white)     |
| `--muted-foreground`   | `#9ba2ab`   | Labels, texto secundario         |
| `--primary`            | `#77c4a3`   | Verde menta - acción principal   |
| `--primary-foreground` | `#0a191a`   | Texto sobre fondos primary       |
| `--secondary`          | `#262c32`   | Superficies secundarias          |
| `--muted`              | `#262c32`   | Fondo muted (tabs, toggles)      |
| `--warning`            | `#e9b364`   | Alertas, plazos, borrador        |
| `--warning-foreground` | `#24180a`   | Texto sobre warning              |
| `--destructive`        | `#ec7b74`   | Error, alta prioridad            |
| `--border`             | `#ffffff14` | Borde (8% white)                 |
| `--input`              | `#ffffff1f` | Input border (12% white)         |
| `--ring`               | `#77c4a399` | Focus ring (primary 60% opac.)   |
| `--chart-1`            | `#77c4a3`   | Gráficas: verde primario         |
| `--chart-2`            | `#738292`   | Gráficas: azul-gris              |
| `--chart-3`            | `#e9b364`   | Gráficas: ámbar                  |
| `--chart-4`            | `#ec7b74`   | Gráficas: rojo suave             |
| `--chart-5`            | `#4d5660`   | Gráficas: gris oscuro            |
| `--radius`             | `0.75rem`   | Radio base de bordes             |

### 2.2 Tipografía

| Familia     | Variable CSS                    | Uso                               |
|-------------|----------------------------------|-----------------------------------|
| Geist       | `font-family: Geist, ui-sans`   | Interfaz, labels, títulos         |
| Geist Mono  | `font-family: Geist Mono`       | Cifras, importes, IDs, facturas   |

**Escalas de texto:**
- `text-6xl font-semibold tracking-tight` — Cifras fiscales principales (móvil: 5xl)
- `text-4xl font-semibold tabular-nums` — Cifras secundarias (días, cuentas)
- `text-3xl font-semibold tracking-tight` — Títulos de sección H1
- `text-lg tabular-nums` — Subtotales, valores en tablas
- `text-sm` — Contenido general
- `text-xs uppercase tracking-widest` — Etiquetas de categoría (eyebrow)
- `text-xs` — Metadata, ayuda contextual

---

## 3. Anatomía del Layout

### 3.1 Página Base
```
<html class="dark bg-background">
  <body class="font-sans antialiased">
    <!-- Wrapper global -->
    <div class="mx-auto flex min-h-dvh w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <header class="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <!-- Brand + título + selector de trimestre -->
      </header>
      <main class="flex flex-col gap-6">
        <!-- Grid de secciones -->
      </main>
    </div>
  </body>
</html>
```

### 3.2 Cabecera de Página
- Eyebrow: `text-xs font-medium uppercase tracking-widest text-primary`
- H1: `text-balance text-3xl font-semibold tracking-tight md:text-4xl`
- Subtítulo: `text-pretty text-sm leading-relaxed text-muted-foreground`
- Selector de trimestre: radio group `rounded-xl border border-border bg-card p-1`

### 3.3 Cards / Secciones
```
rounded-2xl border border-border bg-card p-6 (md:p-8 en secciones principales)
```

### 3.4 Grid principal
```css
.grid.gap-6.lg:grid-cols-3 {
  /* Sección principal: lg:col-span-2 */
  /* Sección lateral: 1 columna */
}
```

---

## 4. Componentes Base Reutilizables

### 4.1 StatusBadge
Pills de estado para facturas y gastos:
```
Sin revisar:     bg-muted          text-muted-foreground  rounded-full
Pendiente:       bg-warning/15     text-warning           rounded-full
Duplicada:       bg-destructive/15 text-destructive       rounded-full
IVA incorrecto:  bg-destructive/15 text-destructive       rounded-full
Sin NIF:         bg-warning/15     text-warning           rounded-full
Aprobada:        bg-primary/15     text-primary           rounded-full
Borrador:        bg-warning/15     text-warning           rounded-full
```

### 4.2 ProgressBar
```
<div class="h-2 w-full overflow-hidden rounded-full bg-muted">
  <div class="h-full rounded-full bg-primary transition-all" style="width: X%">
```

### 4.3 Barra de Progreso IVA (dos segmentos)
```
<div class="flex h-3 w-full overflow-hidden rounded-full bg-muted">
  <div class="h-full bg-primary" style="width: X%">  <!-- Soportado -->
  <div class="h-full flex-1 bg-warning">              <!-- A ingresar -->
```

### 4.4 ActionButtons (Aprobar / Rechazar)
```
size-7 rounded-md border border-border bg-background 
hover:bg-muted hover:text-primary (Aprobar)
hover:bg-muted hover:text-destructive (Rechazar)
```

### 4.5 TabGroup (Filtros)
```
inline-flex rounded-lg bg-muted p-1
  button[aria-selected=true]:  bg-card text-foreground
  button[aria-selected=false]: text-muted-foreground hover:text-foreground
```

---

## 5. Rutas y Pantallas

### 5.1 Aplicación Principal (Autenticada con AppShell)

| Ruta                         | Página                  | Componentes Clave                              |
|------------------------------|-------------------------|------------------------------------------------|
| `/`                          | Dashboard               | IVASettlementCard, DeadlineCard, MonthlyChart, AlertList, ExpensesTable |
| `/documents`                 | Gestión Documentos      | UploadZone, DocumentsTable, StatusBadge        |
| `/documents/[id]/review`     | Revisión Humana         | DocumentViewer, ExtractedDataPanel, ReviewBar  |
| `/expenses`                  | Gastos                  | ExpensesTable completa, Filtros avanzados      |
| `/expenses/print`            | Impresión / Borrador    | PrintableExpensesList, SummaryHeader           |
| `/alerts`                    | Alertas                 | AlertList expandida, Filtros por severidad     |
| `/copilot`                   | IA Explicador           | ChatInterface, FiscalContextPanel              |
| `/settings`                  | Configuración           | BusinessProfileCard, AccountSecurityCard, ChangePasswordModal |

### 5.2 Módulo de Autenticación (Pantalla Completa sin Sidebar)

| Ruta                         | Página                  | Componentes Clave                              |
|------------------------------|-------------------------|------------------------------------------------|
| `/login`                     | Iniciar Sesión          | LoginForm (Password / Magic Link / OAuth / Demo), BrandHeader |
| `/register`                  | Registro                | RegisterForm, PasswordStrengthMeter            |
| `/forgot-password`           | Recuperar Contraseña    | ForgotPasswordForm, RateLimitAlert, SuccessState |
| `/update-password`           | Restablecer Contraseña  | UpdatePasswordForm, SessionValidator, LivePasswordChecks |
| `/auth/callback`             | Callback OAuth / PKCE   | SSR exchangeCodeForSession, Session Cookie Setter |

---

## 6. Reglas de Implementación Estrictas

1. **Zero lógica fiscal en componentes UI** — los componentes solo reciben props y renderizan.
2. **Server Components por defecto** — usar `"use client"` solo cuando sea imprescindible.
3. **Cifras siempre en es-ES** — `new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" })`
4. **Estados inmutables** — los estados vienen de Supabase, nunca se mutan en el cliente.
5. **Dark mode forzado** — `<html class="dark">` siempre, sin toggle de tema.
6. **Accesibilidad obligatoria** — aria-label en todos los botones de icono, role en listas, aria-live en contadores.
7. **Fuentes Geist** — instaladas vía paquete `geist` npm, NO via Google Fonts CDN.
