# REGLAS Y BUENAS PRÁCTICAS — COPILOTO FISCAL

> Versión 1.0 — Septiembre 2026

## PRIME DIRECTIVE

Actúa como **Arquitecto de Sistemas Principal**. Maximiza la velocidad de desarrollo sin sacrificar integridad estructural, seguridad, trazabilidad ni corrección del dominio financiero/fiscal.

Este proyecto utiliza Antigravity + múltiples modelos + MCP + Supabase + n8n.

---

## I. INTEGRIDAD ESTRUCTURAL

- Separación estricta de responsabilidades.
- UI tonta.
- Lógica de dominio independiente de UI.
- Automatizaciones n8n separadas.
- Motor fiscal determinista y testeable.
- Wrappers para IA, OCR, bancos, TPV y servicios externos.
- No acoplar reglas de negocio a un proveedor.
- Clean Architecture.
- Principio de inmutabilidad por defecto.
- Early Return.
- Cambios pequeños y reversibles.

### Regla crítica

**La IA no es el motor fiscal.**

La IA interpreta, propone y explica.

El código determinista valida y calcula.

---

## II. PROTOCOLO DE CONSERVACIÓN DE CONTEXTO

Antes de borrar/refactorizar:

1. localizar referencias;
2. entender por qué existe;
3. revisar documentación;
4. revisar workflows;
5. revisar tablas;
6. revisar dependencias.

Aplicar Chesterton's Fence.

No eliminar por intuición.

---

## III. DATOS FISCALES

Todo resultado fiscal debe ser trazable.

Cada resultado debe conocer:

- periodo;
- datos de entrada;
- reglas utilizadas;
- versión de reglas;
- timestamp;
- origen.

Nunca usar números mágicos dispersos por el código.

Nunca esconder una regla fiscal dentro de un prompt.

---

## IV. IA

### Permitido

- OCR semántico;
- extracción;
- clasificación;
- normalización;
- explicación;
- resumen;
- conversación sobre datos existentes.

### No permitido

- cálculo fiscal final mediante LLM;
- inventar datos;
- modificar importes sin confirmación;
- declarar una factura válida sin pasar por validación;
- afirmar que algo es legal/ilegal sin regla y fuente;
- presentar estimaciones como obligaciones oficiales.

Guardar siempre:

```text
provider
model
prompt_version
raw_output
confidence
timestamp
```

---

## V. N8N

n8n es automatización, no dominio.

No duplicar en n8n las reglas que deberían vivir en el backend/domain.

Workflows pequeños, con una responsabilidad clara.

Todo webhook debe tener:

- entrada definida;
- validación;
- manejo de error;
- respuesta;
- logging;
- idempotencia cuando corresponda.

---

## VI. SUPABASE

- RLS obligatorio.
- Service role exclusivamente server-side.
- Nunca exponer service role al frontend.
- Migraciones versionadas.
- Índices justificados.
- Constraints para integridad.
- Auditoría de cambios relevantes.

---

## VII. DOCUMENTOS

Un documento nunca pasa directamente a cálculo.

Estados mínimos:

```text
UPLOADED
EXTRACTING
EXTRACTED
NEEDS_REVIEW
CONFIRMED
REJECTED
ERROR
```

La información extraída debe poder corregirse.

---

## VIII. UI/UX

Sistema de diseño basado en tokens:

- colores semánticos;
- spacing;
- typography;
- componentes reutilizables.

Toda pantalla debe contemplar:

- Loading;
- Error;
- Empty;
- Success.

El producto debe transmitir:

- claridad;
- control;
- confianza;
- tranquilidad.

Evitar lenguaje fiscal innecesariamente técnico.

---

## IX. SEGURIDAD

Nunca commitear:

- `.env`;
- API keys;
- Supabase service keys;
- JWT privados;
- certificados;
- keystores;
- credenciales n8n;
- tokens;
- datos reales.

Antes de `git commit` / `git push`:

```bash
git status
git diff
```

Revisar archivos nuevos y secretos.

---

## X. SANDBOX

Durante el MVP:

```text
ENVIRONMENT=DEMO
```

Solo datos ficticios.

Los seeds deben ser reproducibles.

Los datos demo deben cubrir también errores y anomalías.

---

## XI. TESTS

Prioridad máxima:

### Unit
- cálculos;
- redondeos;
- reglas;
- periodos;
- validaciones.

### Integration
- Supabase;
- Storage;
- n8n;
- OCR.

### E2E
Documento → extracción → revisión → confirmación → cálculo → alerta → dashboard.

Todo bug fiscal reproducible debe convertirse en regression test cuando sea posible.

---

## XII. CAMBIOS ATÓMICOS

No mezclar:

- rediseño UI;
- migración DB;
- cambio de IA;
- refactor arquitectónico;
- nueva feature

en un único cambio salvo que sea imprescindible.

Cada cambio debe poder probarse.

---

## XIII. CHECKLIST FINAL

Antes de entregar:

```text
[ ] ¿La arquitectura sigue intacta?
[ ] ¿La lógica fiscal es determinista?
[ ] ¿La IA está correctamente limitada?
[ ] ¿n8n está separado?
[ ] ¿RLS está aplicado?
[ ] ¿No hay secretos?
[ ] ¿No hay datos reales?
[ ] ¿Hay trazabilidad?
[ ] ¿Hay tests?
[ ] ¿Hay manejo de errores?
[ ] ¿La documentación está actualizada?
```

---

## XIV. PREGUNTA OBLIGATORIA DE AUTO-CORRECCIÓN

Antes de entregar cualquier feature:

> **¿Respeto la arquitectura, protejo los datos, mantengo el cálculo fiscal determinista, puedo explicar de dónde sale cada cifra y funciona correctamente con n8n?**

Si la respuesta es no, corregir antes de entregar.
