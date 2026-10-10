# ÍNDICE MAESTRO DE DOCUMENTACIÓN — COPILOTO FISCAL

> **Propósito:** Mapa de navegación y gobernanza de la documentación del proyecto.  
> **Regla de oro:** Antes de crear un documento nuevo, consulta este índice. Cada aspecto del proyecto tiene un archivo asignado con una responsabilidad única.

---

## 🗺️ Mapa Documental

```
Copilot Fiscal/
├── AGENTS.md                         ← Guardarraíles obligatorios y reglas para modelos IA (SEG, RLS, commits)
├── COPILOTO_FISCAL_MASTER_PLAN.md    ← FUENTE ÚNICA DE VERDAD del producto (visión, alcance, reglas)
└── docs/
    ├── README.md                     ← Este índice maestro
    ├── PROJECT_STATUS.md             ← Estado vivo del proyecto, hitos, avance por fases y deudas técnicas
    ├── DECISIONS.md                  ← Registro de Decisiones de Arquitectura (ADRs)
    ├── ARCHITECTURE.md               ← Arquitectura general del sistema y capas
    ├── DATA_MODEL.md                 ← Esquema de base de datos Supabase, relaciones y tipos
    ├── FISCAL_ENGINE.md              ← Especificación del motor fiscal determinista
    ├── N8N_ARCHITECTURE.md           ← Arquitectura de automatización y workflows n8n
    ├── UI_UX_SPEC.md                 ← Especificación visual, design tokens y componentes
    ├── SECURITY.md                   ← Política de seguridad, gestión de credenciales y respuesta a fugas
    ├── AI_POLICY.md                  ← Principios de uso de IA, trazabilidad y desacoplamiento
    ├── TESTING.md                    ← Estrategia de tests (unitarios, estáticos, RLS, E2E)
    ├── PROJECT_DISCOVERY.md          ← [HISTÓRICO] Prospección preliminar de Fase 0 (30/09/2026)
    └── MVP_SPEC.md                   ← [HISTÓRICO] Especificación preliminar de Fase 0 (30/09/2026)
```

---

## 📚 Responsabilidades por Documento

### 1. Gobernanza y Reglas de Desarrollo
| Documento | Ubicación | Responsabilidad |
|---|---|---|
| **Master Plan** | [COPILOTO_FISCAL_MASTER_PLAN.md](../COPILOTO_FISCAL_MASTER_PLAN.md) | **Fuente de verdad suprema.** Define el problema, usuario, modelo de negocio, reglas fiscales y límites del producto. Si algún documento entra en contradicción con este, manda el Master Plan. |
| **Agent Guardrails** | [AGENTS.md](../AGENTS.md) | Instrucciones obligatorias leídas por cada IA al comenzar sesión: tolerancia cero de secretos, commits atómicos, determinismo y cualificación estricta en RLS. |

### 2. Estado Vivo y Decisiones Técnicas
| Documento | Ubicación | Responsabilidad |
|---|---|---|
| **Project Status** | [PROJECT_STATUS.md](PROJECT_STATUS.md) | Bitácora viva de avance. Contiene el progreso de Fases 0 a 8, matriz de Deudas Técnicas (DT-01 a DT-22), historial cronológico de cambios y la lista canónica de próximos pasos. |
| **ADR Registry** | [DECISIONS.md](DECISIONS.md) | Justificación técnica y empírica de decisiones complejas (ej. ADR-01 consumo de tokens visión, ADR-02 compresión 1600px, ADR-03 ingesta en bloque, ADR-06 estados de documento, etc.). |

### 3. Especificaciones de Subsistemas
| Documento | Ubicación | Responsabilidad |
|---|---|---|
| **Arquitectura** | [ARCHITECTURE.md](ARCHITECTURE.md) | Clean Architecture, separación de capas (Presentation, Domain, Fiscal Engine, Data, Automation). |
| **Modelo de Datos** | [DATA_MODEL.md](DATA_MODEL.md) | Tablas de Supabase (11 tablas core), columnas, tipos, constraints y RLS. |
| **Motor Fiscal** | [FISCAL_ENGINE.md](FISCAL_ENGINE.md) | Lógica determinista de cálculo de IVA, Modelo 303, deducciones y detección de anomalías. |
| **Workflows n8n** | [N8N_ARCHITECTURE.md](N8N_ARCHITECTURE.md) | Flujos automatizados: WF-01 (ingesta/OCR), WF-07 (anomalías), WF-08 (plazos). |
| **UI / UX** | [UI_UX_SPEC.md](UI_UX_SPEC.md) | Tokens de diseño, paleta Geist/Dark, estados de UI y componentes. *(Ver también `.agents/skills/skill-copilot-ui-builder`)*. |

### 4. Políticas Operativas
| Documento | Ubicación | Responsabilidad |
|---|---|---|
| **Seguridad** | [SECURITY.md](SECURITY.md) | Rotación de claves `sb_*`, mitigación post-incidente GitGuardian, políticas RLS por negocio. |
| **Política IA** | [AI_POLICY.md](AI_POLICY.md) | La IA solo *propone y explica*; trazabilidad obligatoria de tokens y modelos en `document_extractions`. |
| **Testing** | [TESTING.md](TESTING.md) | Comandos de ejecución: Vitest (`FiscalEngine.test.ts`), `check-keys.mjs`, tests RLS SQL. |

### 5. Archivo Histórico (Fase 0 Cerrada)
| Documento | Ubicación | Nota de Vigencia |
|---|---|---|
| **Discovery** | [PROJECT_DISCOVERY.md](PROJECT_DISCOVERY.md) | Documento previo a la inicialización del repositorio. Superado por la implementación real. |
| **MVP Spec** | [MVP_SPEC.md](MVP_SPEC.md) | Especificación funcional previa. Las fases 0 a 7 descritas en él ya están 100% completadas. |

---

## 🚫 Reglas para Modelos y Desarrolladores

1. **NO crees archivos `.md` sueltos para anotar tareas o notas de sesión.** Actualiza directamente [docs/PROJECT_STATUS.md](PROJECT_STATUS.md) en su historial y tabla de próximos pasos.
2. **NO dupliques reglas de desarrollo.** Cualquier directriz operativa debe consolidarse en [AGENTS.md](../AGENTS.md).
3. **NO almacenes credenciales en archivos de texto dentro de `docs/`.** Usa variables de entorno o el gestor de credenciales correspondiente.
4. **Al tomar una decisión técnica que cambie el diseño,** documéntala como un nuevo ADR en [docs/DECISIONS.md](DECISIONS.md).
