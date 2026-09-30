# COPILOTO FISCAL — MASTER PLAN DE DESARROLLO

> **Versión:** 1.0  
> **Fecha:** 30 Septiembre 2026  
> **Estado:** PLANIFICACIÓN INICIAL  
> **Autor:** Serquin + Antigravity  
> **Repositorio:** TBD  
> **Fuente de verdad:** Este archivo es la ÚNICA fuente de verdad del proyecto.

---

## 0. INSTRUCCIÓN MAESTRA PARA ANTIGRAVITY

Actúa como **Arquitecto de Sistemas Principal + Tech Lead + Product Engineer**.

Tu objetivo no es escribir código inmediatamente. Primero debes **comprender, investigar dentro del repositorio, diseñar y documentar**. El desarrollo se realizará por fases pequeñas, verificables y reversibles.

### Regla principal

**NO IMPLEMENTES UNA FEATURE IMPORTANTE HASTA HABER DEFINIDO:**
1. objetivo de la feature;
2. flujo de usuario;
3. modelo de datos afectado;
4. responsabilidades de frontend/backend/n8n/IA;
5. reglas deterministas implicadas;
6. seguridad;
7. criterios de aceptación;
8. estrategia de pruebas.

Si existe una ambigüedad relevante, **DETENTE Y PREGUNTA**. No inventes requisitos fiscales, legales, contables ni de negocio.

### Regla crítica del dominio

Este proyecto comienza exclusivamente con **DATOS FICTICIOS / SANDBOX**.

No utilizar datos fiscales reales de la hija ni de terceros durante la fase inicial.

No presentar ninguna cifra generada por el sistema como:
- declaración oficial;
- cálculo certificado;
- obligación tributaria definitiva;
- asesoramiento fiscal personalizado;
- comunicación oficial con AEAT.

La aplicación debe mostrar claramente que el entorno inicial es de simulación.

---

# 1. VISIÓN DEL PRODUCTO

## 1.1 Problema

Crear una herramienta para autónomos y pequeños negocios, inicialmente enfocada en **bares y restaurantes de España**, que permita:

- centralizar facturas, tickets y gastos;
- interpretar documentos automáticamente;
- clasificar información;
- controlar ingresos y gastos;
- visualizar IVA soportado/repercutido en modo estimativo;
- detectar anomalías o datos faltantes;
- proyectar escenarios;
- explicar en lenguaje sencillo qué está ocurriendo;
- preparar información ordenada para revisión por una gestoría;
- reducir la sorpresa al llegar el periodo fiscal.

## 1.2 No es el objetivo inicial

NO construir inicialmente:

- una gestoría online completa;
- un sustituto de asesor fiscal;
- un TPV;
- un sistema completo de nóminas;
- un ERP;
- un sistema propio de facturación certificado;
- presentación automática de impuestos;
- integración directa con AEAT;
- un sistema que permita a una IA decidir unilateralmente una obligación fiscal.

La primera versión debe demostrar que el producto puede **organizar, explicar, detectar y anticipar**.

---

# 2. PRINCIPIO DE PRODUCTO

La propuesta de valor inicial es:

> **“Tu negocio te dice qué está pasando, por qué está pasando y qué deberías revisar antes de que llegue el trimestre.”**

La aplicación debe priorizar:

1. claridad;
2. trazabilidad;
3. explicabilidad;
4. detección de datos faltantes;
5. simulación;
6. colaboración con la gestoría.

Nunca debe priorizar “automatizar por automatizar”.

---

# 3. USUARIO INICIAL

### Persona objetivo

Autónomo propietario de:

- bar;
- cafetería;
- pequeño restaurante;
- negocio de hostelería familiar.

### Perfil de referencia para datos ficticios

Crear un negocio ficticio realista:

**Nombre:** Bar Restaurante Demo  
**Forma jurídica:** Autónomo  
**Actividad:** Hostelería  
**Ubicación:** Comunidad de Madrid  
**Moneda:** EUR  
**Periodo:** ejercicios ficticios configurables.

IMPORTANTE:

Los datos deben parecer reales, pero ser inequívocamente ficticios.

No utilizar:
- nombres reales;
- NIF reales;
- cuentas bancarias reales;
- facturas reales;
- datos reales de clientes;
- datos reales de empleados.

---

# 4. PRINCIPIO FISCAL FUNDAMENTAL

## 4.1 La IA NO calcula impuestos

Las cantidades fiscales deben proceder de:

**datos estructurados + reglas deterministas + periodo fiscal + versión de reglas**

La IA puede:

- leer un documento;
- extraer campos;
- proponer clasificación;
- explicar resultados;
- detectar posibles anomalías;
- formular preguntas;
- resumir información.

La IA NO debe ser la autoridad matemática del sistema.

## 4.2 Pipeline correcto

```text
DOCUMENTO
   ↓
OCR / extracción
   ↓
DATOS EXTRAÍDOS
   ↓
VALIDACIÓN
   ↓
REVISIÓN / CONFIRMACIÓN
   ↓
DATO ESTRUCTURADO
   ↓
MOTOR DETERMINISTA
   ↓
RESULTADO
   ↓
IA EXPLICA EL RESULTADO
```

Nunca:

```text
PDF → LLM → “debes pagar X”
```

---

# 5. ARQUITECTURA DE ALTO NIVEL

Arquitectura objetivo:

```text
                 ┌─────────────────────┐
                 │       FRONTEND      │
                 │ Web / PWA responsive │
                 └──────────┬──────────┘
                            │
                    API / Supabase
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
       SUPABASE          n8n           STORAGE DOCUMENTOS
          │                 │                 │
          │                 ├── OCR/IA ───────┘
          │                 │
          │                 ├── validaciones
          │                 │
          │                 ├── alertas
          │                 │
          │                 └── automatizaciones
          │
          └────── Motor fiscal determinista
```

## 5.1 Stack preferido

### Frontend
Preferencia inicial:

- Next.js
- TypeScript
- responsive web/PWA
- arquitectura por features
- componentes reutilizables
- UI mobile-first

Si el repositorio existente ya impone otra tecnología, NO migrar sin justificarlo.

### Backend / datos

- Supabase
- PostgreSQL
- Auth
- Storage
- RLS
- migraciones versionadas

### Automatización

- n8n self-hosted
- workflows independientes
- webhooks claros
- credenciales exclusivamente mediante variables/credenciales de n8n

### IA

Proveedor intercambiable.

Nunca acoplar el dominio directamente a OpenAI/Gemini/Claude.

Crear wrapper/adapter:

```text
AiProvider
 ├── GeminiProvider
 ├── OpenAIProvider
 └── ClaudeProvider
```

### OCR

También debe existir una abstracción:

```text
DocumentExtractor
 ├── ProviderA
 ├── ProviderB
 └── MockExtractor
```

El MockExtractor será especialmente importante durante el desarrollo con datos ficticios.

---

# 6. SEPARACIÓN DE RESPONSABILIDADES

## Presentation

Responsable de:

- mostrar;
- recoger interacción;
- gestionar estados visuales.

No debe contener reglas fiscales.

## Domain

Responsable de:

- entidades;
- casos de uso;
- reglas de negocio;
- cálculos deterministas;
- validaciones.

## Data

Responsable de:

- Supabase;
- Storage;
- APIs externas;
- repositorios.

## Automation

Responsable de:

- n8n;
- OCR;
- IA;
- notificaciones;
- procesos asíncronos.

## Fiscal Engine

Debe ser una capa explícita.

```text
Fiscal Engine
 ├── period calculations
 ├── VAT calculations
 ├── expense classification
 ├── validation rules
 ├── anomaly detection rules
 └── rule versioning
```

---

# 7. MODELO DE DATOS INICIAL

No crear 40 tablas desde el principio.

Primera propuesta:

### `businesses`
- id
- owner_id
- name
- legal_form
- activity_type
- region
- currency
- created_at

### `profiles`
- id
- user_id
- display_name
- created_at

### `documents`
Documento original.

- id
- business_id
- type
- storage_path
- original_filename
- uploaded_at
- status
- hash

### `document_extractions`
Resultado de OCR/IA.

- id
- document_id
- provider
- extraction_version
- raw_payload
- confidence
- extracted_at

### `expenses`
Dato estructurado y validado.

- id
- business_id
- document_id
- supplier_id
- date
- description
- base_amount
- vat_rate
- vat_amount
- total_amount
- category
- deductibility_status
- validation_status

### `income`
- id
- business_id
- date
- description
- base_amount
- vat_rate
- vat_amount
- total_amount
- source

### `suppliers`
- id
- business_id
- name
- tax_id_masked
- category

### `tax_periods`
- id
- business_id
- year
- period
- status
- rules_version

### `tax_snapshots`
Resultado calculado.

- id
- business_id
- tax_period_id
- calculated_at
- rules_version
- vat_output
- vat_input
- estimated_balance
- data_completeness
- warnings

### `alerts`
- id
- business_id
- severity
- type
- title
- description
- source
- status
- created_at

### `audit_events`
Registro de cambios relevantes.

- id
- business_id
- entity_type
- entity_id
- action
- actor_type
- metadata
- created_at

NO crear estas tablas definitivamente hasta revisar el modelo completo y sus relaciones.

---

# 8. VERSIONADO DE REGLAS FISCALES

Esto es OBLIGATORIO.

Nunca codificar una regla fiscal como un número mágico repartido por la aplicación.

Mal:

```ts
const IVA = 0.21;
```

Mejor:

```text
FiscalRuleSet
  version
  jurisdiction
  effective_from
  effective_to
  rules
```

Los resultados deben almacenar:

```text
rules_version
```

Así podremos saber posteriormente:

> “Este resultado fue calculado utilizando la versión X de las reglas.”

IMPORTANTE:

Las reglas fiscales reales deberán contrastarse posteriormente con fuentes oficiales antes de activar cualquier funcionalidad real.

---

# 9. MODO SANDBOX

Primera fase:

```text
ENVIRONMENT = DEMO
```

Debe existir una separación inequívoca entre:

### DEMO
Datos ficticios.

### STAGING
Datos de prueba controlados.

### PRODUCTION
Datos reales, únicamente cuando el proyecto esté preparado.

En DEMO:

- seed automático;
- facturas ficticias;
- proveedores ficticios;
- ventas ficticias;
- gastos ficticios;
- periodos ficticios;
- escenarios de IVA;
- anomalías deliberadamente introducidas.

---

# 10. DATASET FICTICIO INICIAL

Crear un negocio de ejemplo con aproximadamente:

### Ingresos
- ventas diarias;
- diferentes días de la semana;
- meses con mayor actividad;
- varios tipos de operación.

### Gastos
- bebidas;
- alimentación;
- limpieza;
- suministros;
- mantenimiento;
- alquiler;
- servicios profesionales;
- software;
- material de oficina;
- pequeñas compras;
- compras extraordinarias.

### Documentos
- PDF;
- JPG;
- PNG;
- tickets;
- facturas;
- documentos parcialmente legibles.

### Casos problemáticos

El dataset debe incluir deliberadamente:

- factura duplicada;
- factura sin IVA;
- factura con IVA ambiguo;
- factura con datos incompletos;
- factura pendiente de revisión;
- proveedor repetido con pequeñas diferencias de nombre;
- gasto potencialmente no deducible;
- documento duplicado por hash;
- factura recibida fuera de orden temporal;
- diferencia entre ingreso esperado e ingreso registrado.

Esto permitirá probar el producto antes de introducir datos reales.

---

# 11. DASHBOARD MVP

La primera pantalla debe responder:

## ¿Cómo está mi negocio?

Mostrar:

- ventas del periodo;
- gastos;
- resultado operativo estimado;
- IVA repercutido;
- IVA soportado registrado;
- saldo fiscal estimado;
- documentos pendientes;
- alertas;
- comparación con periodo anterior.

Pero siempre diferenciando:

### DATO

dato almacenado.

### ESTIMACIÓN

resultado calculado bajo reglas de simulación.

### PENDIENTE DE REVISIÓN

información incompleta o ambigua.

Nunca mezclar estos estados.

---

# 12. CENTRO DE EXPLICACIÓN

Una funcionalidad central será:

## “Explícame mis números”

Ejemplo:

> Este periodo has registrado 42.350 € de ingresos y 18.940 € de gastos.
>
> El IVA estimado depende de los documentos actualmente registrados.
>
> Hay 7 documentos pendientes de revisión.
>
> El sistema detecta que el IVA soportado es superior al promedio de los periodos ficticios anteriores.
>
> Revisa especialmente las 3 facturas marcadas con mayor impacto.

La IA puede generar esta explicación, pero los números proceden exclusivamente del motor determinista.

---

# 13. SISTEMA DE ANOMALÍAS

Primera versión basada en reglas, no ML.

Ejemplos:

```text
DUPLICATE_DOCUMENT
MISSING_VAT_DATA
UNUSUAL_VAT_RATIO
MISSING_SUPPLIER
INVALID_DATE
POSSIBLE_DUPLICATE_SUPPLIER
MISSING_DOCUMENT
UNREVIEWED_EXPENSE
PERIOD_MISMATCH
UNUSUAL_EXPENSE
```

Cada alerta debe tener:

- severidad;
- explicación;
- evidencia;
- entidad afectada;
- acción sugerida;
- estado.

Nunca decir:

> “Esto es ilegal.”

Mejor:

> “Este documento contiene datos que requieren revisión.”

---

# 14. N8N

n8n no debe convertirse en una segunda aplicación.

Cada workflow tendrá una única responsabilidad.

Primera propuesta:

### `document-intake`
Recibe documento y crea registro.

### `document-extraction`
OCR / extracción.

### `document-validation`
Validación estructural.

### `document-classification`
Clasificación asistida por IA.

### `expense-processing`
Creación/actualización del gasto después de validación.

### `tax-snapshot`
Solicita al backend/motor el cálculo determinista.

### `anomaly-detection`
Ejecuta reglas de anomalías.

### `notifications`
Envía avisos.

### `demo-seed`
Genera datos ficticios para desarrollo.

---

# 15. IA — REGLAS ESTRICTAS

La IA debe utilizarse para tareas donde aporta valor.

### Puede

- OCR semántico;
- extracción;
- clasificación;
- normalización de nombres;
- explicación;
- resumen;
- preguntas en lenguaje natural;
- detección de posibles anomalías como señal secundaria.

### No puede

- decidir unilateralmente deducibilidad;
- modificar cifras fiscales sin trazabilidad;
- crear movimientos financieros sin confirmación;
- presentar impuestos;
- afirmar cumplimiento legal;
- inventar facturas;
- inventar fuentes;
- convertir una baja confianza en dato confirmado.

Toda extracción debe guardar:

```text
raw result
provider
model
prompt/version
confidence
timestamp
```

---

# 16. HUMAN-IN-THE-LOOP

Una factura extraída automáticamente debe poder pasar por:

```text
UPLOADED
   ↓
EXTRACTED
   ↓
NEEDS_REVIEW
   ↓
CONFIRMED
   ↓
USED_IN_CALCULATION
```

Nunca:

```text
UPLOADED → IA → cálculo fiscal definitivo
```

El usuario debe poder corregir:

- proveedor;
- fecha;
- base;
- IVA;
- total;
- categoría;
- estado.

Y la corrección debe quedar registrada.

---

# 17. SEGURIDAD

## CRITICAL

Nunca subir a Git:

- `.env`;
- `.env.*` con secretos;
- service role keys;
- API keys;
- JWT privados;
- certificados;
- `.pem`;
- `.jks`;
- credenciales n8n;
- tokens;
- dumps con datos reales.

Antes de:

```bash
git commit
git push
```

hacer siempre:

```bash
git status
git diff
```

y revisar especialmente archivos nuevos.

Añadir:

- `.gitignore`;
- secret scanning;
- RLS;
- mínimo privilegio;
- logs sin secretos.

---

# 18. SUPABASE SECURITY

Todas las tablas de negocio deben tener RLS.

Regla base:

```text
usuario → solo puede acceder a negocios autorizados
```

El `service_role` solo debe utilizarse:

- server-side;
- n8n;
- procesos administrativos controlados.

Nunca exponerlo al frontend.

---

# 19. UI/UX

Conservar los principios de Atomic Design:

- design tokens;
- spacing;
- colores semánticos;
- componentes reutilizables;
- estados Loading/Error/Empty/Success.

Pero cambiar el lenguaje visual de EchoSoul.

Este producto debe sentirse:

- profesional;
- claro;
- financiero;
- tranquilo;
- no intimidante.

Evitar:

- exceso de gráficos;
- lenguaje contable complejo;
- pantallas saturadas;
- rojo/verde como única codificación semántica.

El usuario debe entender el estado del negocio en menos de 10 segundos.

---

# 20. ACCESIBILIDAD

Desde el inicio:

- contraste;
- tamaños legibles;
- labels;
- navegación por teclado;
- estados no dependientes exclusivamente del color;
- lectores de pantalla.

---

# 21. OBSERVABILIDAD

Toda automatización importante debe poder responder:

- ¿qué ocurrió?
- ¿cuándo?
- ¿con qué documento?
- ¿qué modelo procesó el documento?
- ¿qué versión de reglas se utilizó?
- ¿qué resultado produjo?
- ¿hubo error?
- ¿quién confirmó/corrigió?

No borrar silenciosamente errores.

---

# 22. TESTING

## Unit tests

Especialmente:

- cálculos;
- redondeos;
- periodos;
- reglas;
- validaciones.

## Integration tests

- Supabase;
- Storage;
- n8n;
- extracción;
- pipeline documental.

## E2E

Caso principal:

```text
crear negocio demo
→ subir factura
→ extraer
→ revisar
→ confirmar
→ registrar gasto
→ recalcular periodo
→ generar alerta
→ mostrar dashboard
```

## Regression tests

Cada bug fiscal o de datos debe convertirse en una prueba.

---

# 23. CRITERIO DE TRAZABILIDAD

Para cualquier cifra mostrada en dashboard:

Debe ser posible llegar a:

```text
resultado
→ cálculo
→ registros utilizados
→ documentos origen
→ extracción
→ regla aplicada
→ versión de regla
```

Si una cifra no puede explicarse, no debe mostrarse como resultado fiscal confiable.

---

# 24. FASES DEL PROYECTO

## FASE 0 — Descubrimiento y planificación

NO desarrollar todavía.

Antigravity debe:

1. inspeccionar repositorio;
2. identificar stack;
3. identificar dependencias;
4. proponer estructura;
5. crear arquitectura;
6. definir modelo de datos;
7. definir dataset demo;
8. definir workflows n8n;
9. definir reglas de dominio;
10. definir criterios de aceptación.

Entregable:

```text
/docs/PROJECT_DISCOVERY.md
/docs/ARCHITECTURE.md
/docs/DATA_MODEL.md
/docs/N8N_ARCHITECTURE.md
/docs/MVP_SPEC.md
```

---

## FASE 1 — Infraestructura

- proyecto;
- Supabase;
- Auth;
- Storage;
- RLS;
- migraciones;
- seed demo;
- entorno DEMO.

No IA todavía.

---

## FASE 2 — Núcleo financiero

- negocios;
- ingresos;
- gastos;
- proveedores;
- periodos;
- motor determinista;
- snapshots.

Todo con datos manuales/ficticios.

---

## FASE 3 — Documentos

- upload;
- Storage;
- OCR mock;
- extracción;
- revisión;
- confirmación.

---

## FASE 4 — n8n + IA

- workflows;
- OCR real intercambiable;
- clasificación;
- explicaciones;
- auditoría.

---

## FASE 5 — Dashboard

- resumen;
- IVA estimativo;
- gastos;
- ingresos;
- documentos pendientes;
- alertas.

---

## FASE 6 — Anomalías

- reglas;
- alertas;
- priorización por impacto;
- trazabilidad.

---

## FASE 7 — Copiloto IA

Preguntas como:

> ¿Por qué ha cambiado mi IVA?

> ¿Qué documentos tengo pendientes?

> ¿Qué gastos están sin revisar?

> Explícame este periodo.

La IA consulta datos estructurados y responde utilizando únicamente la información disponible.

---

## FASE 8 — Validación con escenario real

Solo después de que todo el sistema funcione correctamente con datos ficticios.

No introducir datos reales hasta definir:

- privacidad;
- consentimiento;
- seguridad;
- retención;
- backup;
- control de acceso;
- responsabilidades;
- fuentes fiscales oficiales;
- revisión profesional.

---

# 25. CRITERIOS PARA CONSIDERAR EL MVP FUNCIONAL

El MVP NO necesita presentación a AEAT.

Debe poder:

1. crear un autónomo ficticio;
2. crear un bar ficticio;
3. cargar facturas ficticias;
4. extraer información;
5. revisar/corregir;
6. registrar ingresos;
7. registrar gastos;
8. calcular un snapshot fiscal estimativo;
9. explicar de dónde salen las cifras;
10. detectar anomalías;
11. mostrar alertas;
12. consultar información mediante IA;
13. reconstruir la trazabilidad de cualquier cifra.

---

# 26. REGLAS DE DESARROLLO

1. No implementar dos arquitecturas simultáneamente.
2. No duplicar lógica entre frontend y n8n.
3. No colocar cálculos fiscales dentro de prompts.
4. No esconder lógica importante dentro de componentes UI.
5. No crear tablas sin justificar su necesidad.
6. No crear workflows gigantes de n8n.
7. No acoplar el producto a un proveedor de IA.
8. No usar datos reales en DEMO.
9. No hacer migraciones destructivas sin plan.
10. No eliminar código existente sin comprender su función.
11. No refactorizar por estética si no aporta valor.
12. Cambios pequeños y comprobables.
13. Cada fase debe terminar funcionando.
14. Documentar decisiones arquitectónicas importantes.
15. Los bugs encontrados se convierten en tests cuando sea posible.

---

# 27. CHESTERTON'S FENCE

Antes de borrar/refactorizar algo:

> “¿Por qué existe esto?”

Buscar:

- dependencias;
- referencias;
- workflows;
- tablas;
- variables;
- documentación;
- decisiones históricas.

No eliminar una pieza simplemente porque “parece innecesaria”.

---

# 28. PROTOCOLO ANTIGRAVITY

En cada tarea:

### PASO 1
Leer este MASTER PLAN.

### PASO 2
Leer documentación relacionada.

### PASO 3
Inspeccionar código existente.

### PASO 4
Explicar brevemente qué se va a modificar.

### PASO 5
Implementar una unidad pequeña.

### PASO 6
Ejecutar tests/lint/build correspondientes.

### PASO 7
Verificar seguridad.

### PASO 8
Actualizar documentación/estado.

### PASO 9
Mostrar resultado.

No continuar automáticamente hacia la siguiente fase si la fase actual no está validada.

---

# 29. AUTO-CORRECCIÓN ANTES DE ENTREGAR

Antes de considerar terminada una tarea:

```text
¿Respeto la arquitectura?
¿La lógica fiscal es determinista?
¿La IA está en su lugar correcto?
¿n8n está separado?
¿Supabase tiene RLS?
¿Hay trazabilidad?
¿Hay estados Loading/Error/Empty/Success?
¿He introducido datos reales accidentalmente?
¿He expuesto secretos?
¿Hay tests?
¿La documentación refleja el estado real?
```

---

# 30. FUENTES FISCALES

Durante DEMO se utilizarán reglas ficticias claramente etiquetadas.

Cuando se pase a reglas reales:

- utilizar fuentes oficiales;
- registrar fuente;
- fecha de consulta;
- periodo de vigencia;
- versión de regla;
- cambios normativos.

No utilizar blogs como autoridad fiscal primaria.

La documentación oficial debe poder rastrearse hasta la regla implementada.

---

# 31. DECISIONES ABIERTAS

Estas decisiones deben resolverse durante FASE 0:

- nombre definitivo;
- dominio;
- frontend definitivo;
- PWA vs Android desde el principio;
- proveedor OCR;
- proveedor IA;
- integración bancaria;
- integración TPV;
- estrategia de importación de datos;
- modelo de monetización;
- papel de la gestoría;
- límites legales del producto;
- reglas fiscales reales;
- estrategia de VERI*FACTU/facturación futura.

No asumir ninguna de ellas sin documentarla.

---

# 32. DOCUMENTACIÓN VIVA

El repositorio deberá contener:

```text
/docs
  MASTER_PLAN.md
  PROJECT_DISCOVERY.md
  ARCHITECTURE.md
  DATA_MODEL.md
  FISCAL_ENGINE.md
  N8N_ARCHITECTURE.md
  AI_POLICY.md
  SECURITY.md
  MVP_SPEC.md
  TESTING.md
  DECISIONS.md
```

`MASTER_PLAN.md` permanece como fuente de verdad.

Los demás documentos amplían, no contradicen, este archivo.

---

# 33. REGLA FINAL

**No construir una gestoría automática.**

Construir primero un sistema que pueda demostrar:

> **“Entiendo los documentos de tu negocio, organizo tus datos, calculo escenarios de forma trazable y te explico qué está ocurriendo.”**

Después podremos decidir, con evidencia, hasta dónde debe llegar el producto.
