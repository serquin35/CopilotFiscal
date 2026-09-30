# MVP SPEC — COPILOTO FISCAL

> **Versión:** 1.0  
> **Fecha:** 30 Septiembre 2026  
> **Estado:** FASE 0 — Especificación MVP  
> **Fuente de verdad:** COPILOTO_FISCAL_MASTER_PLAN.md §10, §11, §25  
> **Autor:** Antigravity (generado durante FASE 0)

> [!NOTE]
> El MVP opera exclusivamente en entorno DEMO con datos ficticios. El negocio de referencia es "Bar Restaurante Demo", un autónomo ficticio de hostelería en Madrid. Ningún dato aquí representado es real.

---

## 1. Criterios para Considerar el MVP Funcional

El MVP debe poder demostrar, exclusivamente con datos ficticios:

| # | Criterio | Fase donde se implementa |
|---|---|---|
| 1 | Crear un autónomo ficticio con negocio asociado | Fase 1 |
| 2 | Cargar facturas ficticias (PDF/JPG/PNG) | Fase 3 |
| 3 | Extraer información de facturas (OCR Mock) | Fase 3 |
| 4 | Revisar y corregir información extraída | Fase 3 |
| 5 | Registrar ingresos manualmente | Fase 2 |
| 6 | Registrar gastos manualmente | Fase 2 |
| 7 | Calcular snapshot fiscal estimativo con trazabilidad | Fase 2 |
| 8 | Explicar de dónde salen las cifras | Fase 5 + Fase 7 |
| 9 | Detectar anomalías y mostrar alertas | Fase 6 |
| 10 | Mostrar alertas priorizadas | Fase 6 |
| 11 | Consultar información mediante el Copiloto IA | Fase 7 |
| 12 | Reconstruir la trazabilidad de cualquier cifra | Fase 5 |

---

## 2. Alcance DEMO: Lo Que Sí y Lo Que No

### ✅ Incluido en el MVP DEMO

- Dashboard con resumen del periodo actual
- Gestión de documentos (upload, extracción mock, revisión, confirmación)
- Gestión manual de gastos e ingresos
- Visualización de IVA soportado / repercutido (estimativo)
- Sistema de alertas basado en reglas deterministas
- Panel de trazabilidad de cifras
- Copiloto IA (chat simple sobre datos existentes)
- Dataset ficticio completo del Bar Restaurante Demo

### ❌ Excluido del MVP DEMO

| Feature | Justificación |
|---|---|
| OCR real (Google Document AI, Textract) | Fase 4. MockExtractor en MVP |
| IA real para clasificación | Fase 4. MockAiProvider en MVP |
| Integración bancaria | Fuera del MVP |
| Integración TPV | Fuera del MVP |
| Presentación a AEAT | Fuera del MVP por principio fundamental |
| Módulo de nóminas | Fuera del MVP |
| Colaboración con gestoría | Backlog post-MVP |
| Multi-usuario / multi-negocio | Backlog post-MVP |
| Reglas fiscales reales | Requiere revisión jurídica (Fase 8) |

---

## 3. Perfil del Negocio DEMO

```
Nombre:         Bar Restaurante Demo
Forma jurídica: Autónomo
Actividad:      Hostelería y restauración
CNAE:           5610 (Restaurantes y puestos de comidas) — FICTICIO
Ubicación:      Madrid (CAM) — FICTICIO
Moneda:         EUR
NIF:            00000001X — CLARAMENTE FICTICIO
Dirección:      Calle Mayor Demo, 42, 28013 Madrid — FICTICIO
Teléfono:       +34 91 000 00 00 — FICTICIO
Periodo demo:   Enero 2026 - Septiembre 2026 (3 trimestres)
Ambiente:       DEMO / is_demo: true
```

---

## 4. Dataset Ficticio — Ingresos

### 4.1 Estructura de ingresos simulados

El Bar Restaurante Demo registra ingresos diarios simulados con los siguientes patrones:

| Patrón | Descripción |
|---|---|
| **Días entre semana (L-J)** | 400-600 € / día (variable aleatoria ficticia) |
| **Viernes y sábados** | 700-1.100 € / día |
| **Domingos** | 300-500 € / día (menor actividad) |
| **Agosto** | -20% respecto a media (vacaciones zona) |
| **Fiestas locales (mayo)** | +30% respecto a media |

### 4.2 Tipos de ingreso

| Tipo | Descripción | IVA | Categoría |
|---|---|---|---|
| `ventas_salon` | Consumo en sala | 10% | Comida/bebida en local |
| `ventas_barra` | Consumo en barra | 10% | Bebidas |
| `eventos` | Celebraciones privadas | 10% | Servicios especiales |
| `delivery` | Pedidos a domicilio | 10% | Delivery |
| `catering` | Servicio externo | 10% | Catering |

### 4.3 Volumen estimado (6 meses DEMO)

```
Total ingresos simulados Q1 2026:  ~42.000 € brutos
Total ingresos simulados Q2 2026:  ~48.000 € brutos
Total ingresos simulados Q3 2026:  ~39.000 € brutos (agosto bajo)
```

---

## 5. Dataset Ficticio — Gastos

### 5.1 Proveedores ficticios

| ID | Nombre | NIF (ficticio) | Categoría |
|---|---|---|---|
| SUP-01 | Distribuidora Alimentaria Demo SL | B00000001 | alimentacion |
| SUP-02 | Bebidas y Licores Demo SA | A00000002 | bebidas |
| SUP-03 | Suministros Demo Hostelería SL | B00000003 | limpieza |
| SUP-04 | Energía Demo SLU | B00000004 | suministros |
| SUP-05 | Arrendadora Demo SL | B00000005 | alquiler |
| SUP-06 | Reparaciones Demo SL | B00000006 | mantenimiento |
| SUP-07 | Gestoría Demo Asesores SL | B00000007 | servicios_profesionales |
| SUP-08 | Software TPV Demo | B00000008 | software |
| SUP-09 | Papelería Demo | B00000009 | material_oficina |
| SUP-10 | Seguros Demo Mutua | B00000010 | seguros |
| SUP-11 | Distribuidora Alimentos Demo SL | B00000011 | alimentacion |  ← ⚠️ Nombre similar a SUP-01 (caso borde)
| SUP-12 | Marketing Digital Demo | B00000012 | marketing |
| SUP-13 | Transportes Demo | B00000013 | transporte |

### 5.2 Gastos recurrentes (mensuales)

| Concepto | Proveedor | Importe base | IVA | Total | Categoría |
|---|---|---|---|---|---|
| Alquiler local enero | SUP-05 | 1.800,00 € | 0% (exento) | 1.800,00 € | alquiler |
| Alquiler local febrero | SUP-05 | 1.800,00 € | 0% (exento) | 1.800,00 € | alquiler |
| ... (6 meses) | ... | ... | ... | ... | ... |
| Gestoría Q1 | SUP-07 | 200,00 € | 21% | 242,00 € | servicios_profesionales |
| Gestoría Q2 | SUP-07 | 200,00 € | 21% | 242,00 € | servicios_profesionales |
| Software TPV mensual | SUP-08 | 49,00 € | 21% | 59,29 € | software |

### 5.3 Gastos variables (compras)

Aproximadamente 40 facturas de compra de materias primas y bebidas distribuidas en 6 meses, con importes entre 80€ y 1.200€.

### 5.4 Gastos especiales

| Concepto | Importe | IVA | Situación |
|---|---|---|---|
| Reparación frigorífico | 850,00 € | 21% | Normal |
| Compra licuadora industrial | 1.200,00 € | 21% | Gasto extraordinario |
| Uniformes personal | 320,00 € | 21% | Normal |

---

## 6. Dataset Ficticio — Casos Borde

Estos casos borde están deliberadamente incluidos para validar el sistema de detección.

| # | Caso | Tipo de anomalía esperada | Cómo está introducido |
|---|---|---|---|
| CB-01 | Factura duplicada | `DUPLICATE_DOCUMENT` | Misma factura subida dos veces (mismo `hash_sha256`) |
| CB-02 | Factura sin IVA | `MISSING_VAT_DATA` | Factura de SUP-01 sin campo IVA completado |
| CB-03 | Factura con IVA ambiguo | `UNUSUAL_VAT_RATIO` | Factura con IVA 21% donde debería ser 10% |
| CB-04 | Factura con datos incompletos | `MISSING_VAT_DATA` | Falta `base_amount` en extracción |
| CB-05 | Factura pendiente de revisión | `UNREVIEWED_EXPENSE` | Documento en estado `NEEDS_REVIEW` durante semanas |
| CB-06 | Proveedor con nombre similar | `POSSIBLE_DUPLICATE_SUPPLIER` | SUP-01 "Distribuidora Alimentaria Demo SL" vs SUP-11 "Distribuidora Alimentos Demo SL" |
| CB-07 | Gasto potencialmente no deducible | Requiere revisión | Categoría `otros` con importe > 500€ |
| CB-08 | Documento duplicado por hash | `DUPLICATE_DOCUMENT` | CB-01 (mismo caso) |
| CB-09 | Factura fuera de orden temporal | `PERIOD_MISMATCH` | Factura de diciembre 2025 registrada en enero 2026 |
| CB-10 | Diferencia ingreso esperado vs registrado | `UNUSUAL_EXPENSE` | Mes con ventas 40% inferiores a la media sin justificación |
| CB-11 | Factura con total incorrecto | Validación fallida | base + IVA ≠ total (diferencia de 1,50€) |
| CB-12 | Gasto extraordinariamente alto | `UNUSUAL_EXPENSE` | Factura de mantenimiento por 6.800€ (supera umbral 5.000€) |

---

## 7. Pantallas del MVP

### 7.1 Dashboard Principal

Responde la pregunta: **¿Cómo está mi negocio?**

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ ENTORNO DE SIMULACIÓN — Datos ficticios                  │
├─────────────────────────────────────────────────────────────┤
│  Bar Restaurante Demo                                        │
│  Trimestre 3 · 2026  ●  Julio - Septiembre                  │
├────────────────┬────────────────┬───────────────────────────┤
│  VENTAS        │  GASTOS        │  RESULTADO OPERATIVO       │
│  DATO          │  DATO          │  ESTIMACIÓN                │
│  39.420 €      │  22.180 €      │  17.240 €                  │
├────────────────┴────────────────┴───────────────────────────┤
│  IVA REPERCUTIDO   │  IVA SOPORTADO     │  SALDO FISCAL EST.  │
│  ESTIMACIÓN        │  ESTIMACIÓN        │  ESTIMACIÓN         │
│  3.942 €           │  1.876 €           │  2.066 €            │
├─────────────────────────────────────────────────────────────┤
│  📄 Documentos pendientes: 7                                 │
│  🔔 Alertas activas: 4 (1 alta · 3 media)                   │
│  📊 Completitud de datos: 78%                               │
├─────────────────────────────────────────────────────────────┤
│  [Comparación Q3 2026 vs Q2 2026]                            │
│  Ventas: +3.2% | Gastos: -8.1% | Resultado: +18.4%         │
└─────────────────────────────────────────────────────────────┘
```

**Reglas de presentación:**
- `DATO` → información almacenada y confirmada
- `ESTIMACIÓN` → resultado del motor determinista
- `PENDIENTE` → información incompleta o ambigua
- Nunca mezclar estos tres estados en un mismo indicador

### 7.2 Centro de Documentos

- Listado de documentos con estado visual
- Upload drag-and-drop
- Indicador de progreso del pipeline
- Pantalla de revisión human-in-the-loop

### 7.3 Pantalla de Revisión de Documento

```
Documento: factura-bebidas-julio.jpg
Estado: NECESITA REVISIÓN

┌── Datos extraídos (MockExtractor v1, confianza: 0.87) ──────┐
│  Fecha:           15/07/2026          [✎ editar]            │
│  Proveedor:       Bebidas Demo SA     [✎ editar]            │
│  Nº Factura:      FV-2026-07-0089     [✎ editar]            │
│  Base imponible:  320,00 €            [✎ editar]            │
│  IVA (21%):       67,20 €             [✎ editar]            │
│  Total:           387,20 €            [✎ editar]            │
│  Categoría:       Bebidas             [✎ editar]            │
└─────────────────────────────────────────────────────────────┘
│  [✓ CONFIRMAR]    [✗ RECHAZAR]    [? No sé, necesito ayuda] │
└─────────────────────────────────────────────────────────────┘
```

### 7.4 Panel de Alertas

- Lista de anomalías detectadas con severidad
- Descripción en lenguaje claro (nunca "ilegal")
- Enlace a la entidad afectada
- Acción sugerida
- Estado (Abierta / En revisión / Resuelta / Descartada)

### 7.5 Panel de Trazabilidad

Para cualquier cifra del dashboard, el usuario puede ver:

```
2.066 € — Saldo Fiscal Estimado Q3 2026

├── Calculado con reglas: DEMO_v1
├── Calculado el: 30/09/2026 10:15:23
├── IVA Repercutido: 3.942 €
│     └── 394 registros de ingreso confirmados
│           └── Periodo: 01/07/2026 - 30/09/2026
├── IVA Soportado: 1.876 €
│     └── 28 gastos confirmados y deducibles
│           ├── FV-2026-07-0089 · Bebidas Demo SA · 67,20 €
│           └── ...
└── ⚠️ 7 documentos PENDIENTES no incluidos en el cálculo
```

### 7.6 Copiloto IA (Fase 7)

Interfaz de chat donde el usuario puede preguntar:
- "¿Por qué ha subido mi IVA este trimestre?"
- "¿Qué documentos tengo pendientes de revisar?"
- "Explícame el saldo fiscal de julio"

La IA **consulta datos estructurados del motor** y responde en lenguaje claro. Nunca inventa cifras.

---

## 8. Criterios de Aceptación por Feature

### Feature: Upload de Documento

- [ ] El usuario puede subir PDF, JPG, PNG (máx. 10 MB)
- [ ] Se calcula `hash_sha256` al subir
- [ ] Si el hash ya existe → alerta inmediata de duplicado
- [ ] El documento aparece en estado `UPLOADED` inmediatamente
- [ ] El pipeline de extracción se inicia automáticamente
- [ ] Si la extracción falla → estado `ERROR` + mensaje al usuario

### Feature: Revisión de Documento

- [ ] El usuario ve todos los campos extraídos
- [ ] Puede editar cualquier campo
- [ ] Puede confirmar (→ `CONFIRMED`) o rechazar (→ `REJECTED`)
- [ ] La corrección de campos queda registrada en `audit_events`
- [ ] Al confirmar, se crea el registro de `expense` o `income`

### Feature: Dashboard Fiscal

- [ ] Muestra cifras diferenciadas: DATO vs ESTIMACIÓN vs PENDIENTE
- [ ] El saldo fiscal es siempre ESTIMACIÓN (nunca DATO)
- [ ] Un clic en cualquier cifra muestra su trazabilidad
- [ ] El porcentaje de completitud es visible y explicado
- [ ] Las alertas críticas aparecen destacadas

### Feature: Alertas

- [ ] Cada alerta tiene: severidad, título, descripción, evidencia, acción sugerida
- [ ] Ninguna alerta usa el término "ilegal", "fraude" o "incumplimiento"
- [ ] El usuario puede descartar alertas con justificación registrada
- [ ] Las alertas descartadas no se borran del historial

### Feature: Motor Fiscal

- [ ] El cálculo produce el mismo resultado con los mismos datos (determinismo)
- [ ] El snapshot guarda `rules_version`
- [ ] Gastos PENDING no se incluyen en el cálculo de IVA
- [ ] El redondeo usa Half-Up, no `Math.round()` nativo
- [ ] Existen tests unitarios para todos los cálculos

---

## 9. Criterios de Calidad Transversales

| Criterio | Condición de aceptación |
|---|---|
| **Seguridad** | Sin secretos en Git, RLS activo en todas las tablas |
| **Entorno DEMO** | Banner visible en todas las pantallas |
| **Trazabilidad** | Toda cifra del dashboard tiene camino completo a su origen |
| **Lenguaje** | Ningún texto dice "ilegal", "certificado", "declaración oficial" |
| **Tests** | Motor fiscal con >90% cobertura en cálculos |
| **Accesibilidad** | Contraste mínimo WCAG AA, labels en formularios |
| **Estados UI** | Toda pantalla tiene Loading, Error, Empty, Success |
| **Mobile** | UI usable en móvil desde el primer día |

---

## 10. Escenario de Demostración (Demo Script)

Para demostrar el MVP completo en 10 minutos:

```
1. [1 min]  Mostrar dashboard con el resumen de Q3 2026 del Bar Restaurante Demo
2. [2 min]  Ir a Documentos → mostrar el listado con 7 pendientes
3. [2 min]  Abrir factura CB-03 (IVA ambiguo) → mostrar extracción → corregir IVA → confirmar
4. [1 min]  Mostrar cómo el dashboard se actualiza automáticamente
5. [1 min]  Abrir Panel de Alertas → mostrar las 4 alertas activas con explicaciones
6. [1 min]  Clic en el saldo fiscal → mostrar panel de trazabilidad completo
7. [1 min]  Abrir Copiloto → preguntar "¿Por qué hay alertas en mis documentos?"
8. [1 min]  Mostrar el caso CB-01 (documento duplicado) → explicar cómo el sistema lo detectó
```

---

## 11. Hoja de Ruta de Implementación

| Fase | Entregable | Criterio de salida |
|---|---|---|
| **FASE 0** (actual) | Documentación de arquitectura | 6 docs en `/docs/` revisados |
| **FASE 1** | Proyecto, Supabase, Auth, Storage, seed demo | Login funcional, dashboard vacío |
| **FASE 2** | Motor fiscal, gastos, ingresos, snapshot | Cálculo de IVA funcional con datos manuales |
| **FASE 3** | Upload, MockExtractor, revisión human-in-the-loop | Pipeline completo con datos mock |
| **FASE 4** | n8n + OCR real + IA real | Pipeline automático funcional |
| **FASE 5** | Dashboard completo + trazabilidad | Toda cifra explicable |
| **FASE 6** | Sistema de anomalías + alertas | 10 reglas activas y testeadas |
| **FASE 7** | Copiloto IA (chat) | Responde preguntas sobre datos existentes |
| **FASE 8** | Validación con escenario real | Solo con revisión jurídica previa |

---

*Documento generado durante FASE 0. El dataset ficticio real se implementa mediante el workflow WF-09 (demo-seed) en Fase 1.*
