# PROJECT DISCOVERY — COPILOTO FISCAL

> **Versión:** 1.0  
> **Fecha:** 30 Septiembre 2026  
> **Estado:** FASE 0 — Descubrimiento  
> **Fuente de verdad:** COPILOTO_FISCAL_MASTER_PLAN.md  
> **Autor:** Antigravity (generado durante FASE 0)

---

## 1. Estado Actual del Repositorio

### 1.1 Inspección inicial

| Elemento | Estado |
|---|---|
| Repositorio Git | ❌ No inicializado |
| Código de aplicación | ❌ Inexistente |
| Base de datos | ❌ Sin provisionar |
| Infraestructura | ❌ Sin configurar |
| Documentación | ✅ `COPILOTO_FISCAL_MASTER_PLAN.md` + `COPILOTO_FISCAL_REGLAS_DESARROLLO.md` |

**Conclusión:** El proyecto parte desde cero. No hay deuda técnica que respetar ni código existente que analizar. El repositorio se inicializará en Fase 1.

### 1.2 Archivos fuente de verdad presentes

```
c:\Users\Serquin\Documents\Copilot Fiscal\
  ├── COPILOTO_FISCAL_MASTER_PLAN.md      ← Fuente única de verdad
  ├── COPILOTO_FISCAL_REGLAS_DESARROLLO.md ← Reglas operativas
  └── docs/                               ← Documentación de arquitectura (FASE 0)
```

---

## 2. Stack Tecnológico Seleccionado

### 2.1 Frontend

| Tecnología | Decisión | Justificación |
|---|---|---|
| **Next.js 14+** (App Router) | ✅ ELEGIDO | PWA-ready, SSR/SSG, routing de features, TypeScript nativo |
| **TypeScript** | ✅ OBLIGATORIO | Tipado estático crítico en dominio fiscal |
| **CSS Modules / Vanilla CSS** | ✅ ELEGIDO | Control total, sin dependencias de utilidades, design tokens propios |
| **PWA** | ✅ OBJETIVO | Mobile-first, uso desde cocina/barra sin necesidad de app store |
| React Native / Expo | ❌ DESCARTADO (fase inicial) | Aumenta complejidad sin aporte en MVP |

**Arquitectura de carpetas frontend:** Feature-based

```
src/
  features/
    dashboard/
    documents/
    expenses/
    income/
    suppliers/
    tax-periods/
    alerts/
    copilot/        ← Interfaz de IA
  shared/
    components/
    hooks/
    lib/
    types/
  domain/           ← Entidades, casos de uso, reglas deterministas
  engine/           ← Motor fiscal (NO en features)
```

### 2.2 Backend / Datos

| Tecnología | Decisión | Justificación |
|---|---|---|
| **Supabase** | ✅ ELEGIDO | PostgreSQL + Auth + Storage + RLS en una plataforma |
| **PostgreSQL** | ✅ (vía Supabase) | Motor relacional maduro, transacciones, constraints |
| **Supabase Auth** | ✅ ELEGIDO | Gestión de sesiones, JWT, OAuth providers opcionales |
| **Supabase Storage** | ✅ ELEGIDO | Almacenamiento de PDFs/JPG/PNG de facturas |
| **Supabase Edge Functions** (Deno) | ⚠️ OPCIONAL | Para endpoints server-side mínimos; evaluar en Fase 2 |
| **Row Level Security (RLS)** | ✅ OBLIGATORIO | Todas las tablas de negocio desde el inicio |

### 2.3 Automatización

| Tecnología | Decisión | Justificación |
|---|---|---|
| **n8n self-hosted** | ✅ ELEGIDO | Orquestación asíncrona, visual, aislada del dominio |
| Docker / Cloud | ⚠️ POR DECIDIR | Ver §4 Decisiones Abiertas (D-16) |

**Principio de uso de n8n:**
- Solo orquestación y efectos secundarios
- Nunca lógica de dominio fiscal
- Un workflow = una responsabilidad
- Webhooks con contratos definidos

### 2.4 Motor Fiscal (Capa Propia)

```
engine/
  fiscal/
    FiscalRuleSet.ts      ← Conjunto de reglas versionadas
    VatCalculator.ts      ← Cálculo IVA determinista
    PeriodCalculator.ts   ← Lógica de trimestres/periodos
    AnomalyDetector.ts    ← Reglas de detección (no ML)
    ExpenseClassifier.ts  ← Clasificación determinista de gastos
    RuleRegistry.ts       ← Registro de versiones de reglas
```

### 2.5 Wrappers de IA / OCR

```
lib/
  ai/
    AiProvider.interface.ts
    GeminiProvider.ts
    OpenAIProvider.ts
    ClaudeProvider.ts
    MockAiProvider.ts     ← Usado en DEMO
  ocr/
    DocumentExtractor.interface.ts
    ProviderA.ts
    ProviderB.ts
    MockExtractor.ts      ← Usado en DEMO, retorna datos ficticios
```

**Regla crítica:** El dominio nunca importa directamente `openai`, `@google/generative-ai` ni ningún SDK de proveedor. Solo usa `AiProvider` y `DocumentExtractor`.

### 2.6 Proveedores de IA/OCR — Candidatos

| Servicio | Uso previsto | Estado |
|---|---|---|
| Google Gemini | IA principal (clasificación, explicación) | ⚠️ POR VALIDAR |
| OpenAI GPT-4o | IA alternativa | ⚠️ POR VALIDAR |
| Anthropic Claude | IA alternativa | ⚠️ POR VALIDAR |
| Google Document AI | OCR primario | ⚠️ POR EVALUAR |
| AWS Textract | OCR alternativo | ⚠️ POR EVALUAR |
| Azure Form Recognizer | OCR alternativo | ⚠️ POR EVALUAR |
| **MockExtractor** | OCR en DEMO (Fase 1-3) | ✅ OBLIGATORIO |

**En DEMO se usará exclusivamente MockExtractor y MockAiProvider.** Sin llamadas reales a APIs externas.

---

## 3. Dependencias Clave

### 3.1 Dependencias de producción (estimadas)

```json
{
  "dependencies": {
    "next": "^14.x",
    "react": "^18.x",
    "react-dom": "^18.x",
    "@supabase/supabase-js": "^2.x",
    "@supabase/ssr": "^0.x",
    "zod": "^3.x",
    "date-fns": "^3.x"
  }
}
```

**Notas:**
- `zod` → validación de esquemas en boundaries (API, webhooks, formularios)
- `date-fns` → manejo de fechas y periodos fiscales (trimestres, ejercicios)
- **Sin ORM** → SQL directo vía Supabase client (lógica simple, trazable)

### 3.2 Dependencias de desarrollo

```json
{
  "devDependencies": {
    "typescript": "^5.x",
    "jest": "^29.x",
    "@testing-library/react": "^14.x",
    "playwright": "^1.x",
    "eslint": "^8.x",
    "prettier": "^3.x"
  }
}
```

### 3.3 Infraestructura requerida

| Servicio | Tipo | Notas |
|---|---|---|
| Supabase Project (DEMO) | Cloud / Self-hosted | Inicializado en Fase 1 |
| n8n Instance | Self-hosted (Docker) | Variables de entorno exclusivamente via n8n credentials |
| Storage Bucket | Supabase Storage | `documents` bucket, privado, con RLS |
| Repositorio Git | GitHub / GitLab | Por decidir. Con secret scanning activado |

---

## 4. Decisiones Abiertas (§31 del Master Plan)

Estas decisiones deben documentarse antes de Fase 1. Las marcadas ✅ están resueltas; las ⚠️ requieren validación del product owner.

| # | Decisión | Estado | Notas |
|---|---|---|---|
| D-01 | Nombre definitivo del producto | ⚠️ ABIERTA | "Copiloto Fiscal" es provisional |
| D-02 | Dominio/URL | ⚠️ ABIERTA | Pendiente de nombre definitivo |
| D-03 | Frontend: Next.js App Router | ✅ DECIDIDA | Ver §2.1 |
| D-04 | PWA vs app nativa desde inicio | ✅ DECIDIDA | PWA primero; app nativa en backlog |
| D-05 | Proveedor OCR en producción | ⚠️ ABIERTA | MockExtractor en Fase 1-3; decidir en Fase 4 |
| D-06 | Proveedor IA principal | ⚠️ ABIERTA | Wrapper listo; proveedor en Fase 4 |
| D-07 | Integración bancaria | ❌ FUERA DEL MVP | Backlog futuro |
| D-08 | Integración TPV | ❌ FUERA DEL MVP | Backlog futuro |
| D-09 | Importación de datos legacy | ❌ FUERA DEL MVP | Backlog futuro |
| D-10 | Modelo de monetización | ⚠️ ABIERTA | No bloquea desarrollo técnico |
| D-11 | Papel de la gestoría (colaboración) | ⚠️ ABIERTA | Feature de colaboración en backlog |
| D-12 | Límites legales del producto | ⚠️ ABIERTA | Requiere revisión jurídica antes de Fase 8 |
| D-13 | Reglas fiscales reales (AEAT) | ⚠️ ABIERTA | Solo reglas DEMO hasta Fase 8 |
| D-14 | Estrategia VERI*FACTU | ⚠️ ABIERTA | No aplicable al MVP |
| D-15 | Hosting/deployment final | ⚠️ ABIERTA | Vercel (Next.js) es opción natural |
| D-16 | n8n: cloud vs self-hosted | ⚠️ ABIERTA | Self-hosted Docker recomendado para control |

---

## 5. Riesgos Identificados en Fase 0

| ID | Riesgo | Severidad | Mitigación |
|---|---|---|---|
| R-01 | Reglas fiscales desactualizadas | ALTA | Versioning estricto, fuentes oficiales en Fase 8, DEMO etiquetado |
| R-02 | Acoplamiento accidental de IA al dominio | ALTA | Wrappers obligatorios desde Fase 1, revisión en PR |
| R-03 | n8n como segunda app de negocio | MEDIA | Un workflow = una responsabilidad; lógica en backend |
| R-04 | Datos reales introducidos en DEMO | CRÍTICA | Checklists, seed automático, separación de entornos |
| R-05 | Secretos en repositorio Git | CRÍTICA | `.gitignore` desde día 0, secret scanning |
| R-06 | RLS incompleto en tablas nuevas | ALTA | Checklist de entrega; tests de seguridad por tabla |
| R-07 | Pérdida de trazabilidad fiscal | ALTA | `audit_events` obligatorio; `rules_version` en snapshots |

---

## 6. Estructura de Repositorio Propuesta

```
copiloto-fiscal/
  ├── .gitignore
  ├── .env.example             ← Solo variables, nunca valores reales
  ├── README.md
  ├── package.json
  │
  ├── docs/                    ← FASE 0: Documentación de arquitectura
  │   ├── PROJECT_DISCOVERY.md
  │   ├── ARCHITECTURE.md
  │   ├── DATA_MODEL.md
  │   ├── FISCAL_ENGINE.md
  │   ├── N8N_ARCHITECTURE.md
  │   └── MVP_SPEC.md
  │
  ├── src/
  │   ├── app/                 ← Next.js App Router
  │   ├── features/            ← Feature modules
  │   ├── domain/              ← Entidades y casos de uso
  │   ├── engine/              ← Motor fiscal determinista
  │   ├── lib/                 ← Wrappers AI/OCR, Supabase client
  │   └── shared/              ← Componentes, hooks, types comunes
  │
  ├── supabase/
  │   ├── migrations/          ← Migraciones versionadas
  │   ├── seed/
  │   │   └── demo/            ← Datos ficticios reproducibles
  │   └── functions/           ← Edge Functions (si aplica)
  │
  ├── n8n/
  │   └── workflows/           ← Exportaciones JSON de workflows
  │
  └── tests/
      ├── unit/
      ├── integration/
      └── e2e/
```

---

## 7. Criterios de Salida de Fase 0

Para pasar a **Fase 1 — Infraestructura**, deben estar completos:

- [x] `PROJECT_DISCOVERY.md` — Este documento
- [ ] `ARCHITECTURE.md` — Diagrama por capas, wrappers, trazabilidad
- [ ] `DATA_MODEL.md` — Schema SQL completo
- [ ] `FISCAL_ENGINE.md` — Estructura del motor y reglas DEMO
- [ ] `N8N_ARCHITECTURE.md` — Contratos de workflows
- [ ] `MVP_SPEC.md` — Alcance MVP + dataset demo + casos borde
- [ ] Validación por el product owner de las decisiones abiertas críticas (D-03, D-05, D-06)

---

*Documento generado durante FASE 0. No ejecutar código hasta validar este documento.*
