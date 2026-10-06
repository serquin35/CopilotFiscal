# REGISTRO DE DECISIONES DE ARQUITECTURA (ADR) — COPILOTO FISCAL

> **Fuente de verdad:** [COPILOTO_FISCAL_MASTER_PLAN.md](../COPILOTO_FISCAL_MASTER_PLAN.md)  
> **Fecha:** 06 de Octubre de 2026 (última actualización)  
> **Estado:** Documento vivo de decisiones técnicas y arquitectónicas.

---

## ADR-01: Consumo de Tokens de Visión en Extracción de Facturas (WF-01)

### 1. Contexto y Problema
En las pruebas de ingesta de imágenes de facturas y tickets en hostelería, se detectó que cada imagen procesada con `gpt-4o-mini` consumía entre **25.000 y 37.000 prompt_tokens**.
Con ese consumo, al subir un lote típico de un restaurante (10–30 tickets), se satura la cuota de **Tokens Por Minuto (TPM)** de OpenAI, arrojando errores `HTTP 429 (Too Many Requests / Rate limit reached)`.

### 2. Investigación Técnica: Cálculo Oficial de Tokens de Visión en OpenAI
Según la documentación oficial de OpenAI y los análisis de facturación de la API:
1. **Mecánica de tiles:** Las imágenes se escalan para encajar en un bounding box y se dividen en teselas (*tiles*) de 512×512 píxeles.
   - En `detail: "low"`: La imagen se reduce a un thumbnail de 512×512 y cuesta una tarifa fija de **85 tokens base**.
   - En `detail: "high"`: Cuesta **85 tokens base** + **170 tokens por cada tile de 512×512**.
2. **El "Multiplier" de GPT-4o-mini (Causa raíz de los ~37.000 tokens):**
   - El precio de texto en `gpt-4o-mini` es de $0.15 / 1M tokens (frente a $2.50 / 1M en `gpt-4o`).
   - Para que OpenAI cubra sus costes computacionales de GPU en los encoders de visión sin crear un SKU de facturación separado, **aplica un multiplicador interno de ~33.33x a los tokens de entrada de imágenes reportados en `gpt-4o-mini`**.
   - Cálculo exacto comprobado en nuestros tests:
     - 6 tiles de visión: $(85 + 170 \times 6) = 1.105 \text{ tokens base} \times 33.18 \approx 36.670 \text{ tokens}$ + $\sim 334 \text{ tokens de prompt/schema} = \mathbf{37.004 \text{ tokens}}$.
     - 4 tiles de visión: $(85 + 170 \times 4) = 765 \text{ tokens base} \times 33.18 \approx 25.385 \text{ tokens}$ + $\sim 285 \text{ prompt} = \mathbf{25.670 \text{ tokens}}$.
     - `detail: "low"`: $85 \text{ tokens base} \times 33.18 \approx 2.820 \text{ tokens} + \sim 180 \text{ prompt} = \mathbf{3.002 \text{ tokens}}$.

### 3. Matriz de Pruebas y Benchmark Empírico (Mediciones Reales)

Se evaluó una batería de 5 documentos reales representativos del sector de hostelería sobre la API de OpenAI del proyecto:

| ID Documento | Tipo | Características |
|---|---|---|
| **Doc 1** | Factura Suministros (`doc1_recibo_iberdrola.jpg`) | A4 digitalizado, tabla de consumos, NIF, 21% IVA, 1225×853 px |
| **Doc 3** | Factura PDF (`doc3_factura_pdf.pdf`) | PDF nativo de 1 página, Iberdrola |
| **Doc 4** | Ticket Restaurante (`doc4_ticket_bar.png`) | Ticket simplificado, consumiciones barra, 10% IVA, 600×1000 px |
| **Doc 5** | Foto Borrosa (`doc5_ticket_borroso.jpg`) | Distribuidora bebidas, desenfoque óptico / baja luz, 600×1000 px |
| **Doc 6** | Ticket Letra Pequeña (`doc6_ticket_letra_pequena.png`) | Compra Makro, tipografía 11px, desgloses 4%, 10%, 21%, 800×1400 px |

#### Resultados por Configuración:

| Documento | Configuración | Prompt Tokens | Comp. Tokens | Tiempo | Coste ($) | Exactitud de Campos Clave (NIF, Factura, Fechas, Importes) |
|---|---|---|---|---|---|---|
| **Doc 1 (Suministros)** | gpt-4o-mini [high] | **37.004** | 121 | 2.380 ms | $0.00562 | ✅ **100% exacto**: NIF `A-95758389`, Fra `21180613010076890`, Total `80.95`, Base `66.02`, IVA `14.05` |
| Doc 1 (Suministros) | gpt-4o-mini [auto] | **37.004** | 121 | 2.349 ms | $0.00562 | ✅ **100% exacto** (auto seleccionó `high` por dimensiones) |
| Doc 1 (Suministros) | gpt-4o-mini [low] | **3.002** | 120 | 2.110 ms | $0.00052 | ❌ **Degradación crítica**: NIF sin guión, Fra `1218016310078960` (números bailados), Base `66.62` (error), Fecha `03` en vez de `13` |
| **Doc 4 (Ticket Bar)** | gpt-4o-mini [high] | **25.670** | 127 | 2.686 ms | $0.00393 | ✅ **100% exacto**: NIF `B-84920194`, Fra `T-2026/0491`, Total `39.60`, Base `36.00`, IVA `3.60` |
| Doc 4 (Ticket Bar) | gpt-4o-mini [auto] | **25.670** | 128 | 2.251 ms | $0.00393 | ✅ **100% exacto** |
| Doc 4 (Ticket Bar) | gpt-4o-mini [low] | **3.002** | 124 | 1.799 ms | $0.00052 | ❌ **Error en NIF**: extrajo `B-849201994` (un 9 de más, invalida NIF) y año `2022` en vez de `2026` |
| **Doc 5 (Borroso)** | gpt-4o-mini [high] | **25.670** | 141 | 2.131 ms | $0.00394 | ✅ **100% exacto**: NIF `B-91283746`, Fra `F-8831`, Total `285.56`, Base `236.00`, IVA `49.56` |
| Doc 5 (Borroso) | gpt-4o-mini [auto] | **25.670** | 141 | 2.464 ms | $0.00394 | ✅ **100% exacto** |
| Doc 5 (Borroso) | gpt-4o-mini [low] | **3.002** | 135 | 2.247 ms | $0.00053 | ⚠️ Aceptable en este doc simple, pero riesgo alto en tickets densos |
| **Doc 6 (Makro Letra Pequeña)** | gpt-4o-mini [high] | **37.004** | 131 | 3.002 ms | $0.00563 | ✅ **100% exacto**: NIF `A-28045612`, Fra `03-2026-99482`, Total `412.09`, Base `378.00`, IVA `34.09` |
| Doc 6 (Makro Letra Pequeña) | gpt-4o-mini [auto] | **37.004** | 131 | 1.910 ms | $0.00563 | ✅ **100% exacto** |
| Doc 6 (Makro Letra Pequeña) | gpt-4o-mini [low] | **3.002** | 92 | 1.570 ms | $0.00051 | ❌ **Fallo grave de lectura**: NIF `A-20658112` (falso), Fra `2020-69442` (falso), Fecha `2023-08-28` (falso), Base `378.4` (falso) |
| **Doc 3 (Factura PDF 1 pág)** | gpt-4o-mini [file] | **3.191** | 89 | 3.179 ms | $0.00053 | ✅ **100% exacto**: 3.191 tokens totales gracias al procesamiento nativo de PDF de OpenAI |

*Nota de modelos evaluados:* Al intentar ejecutar contra `gpt-4o` estándar, la API devolvió: `Project proj_SEq1uqislbIupc5TmgJv6jMy does not have access to model gpt-4o`. Tras inspeccionar `v1/models`, la cuenta actual tiene restringido el acceso exclusivamente a la familia `gpt-4o-mini` y `gpt-3.5-turbo`.

#### Prueba de Escalado de Resolución (Downscaling):
Evaluamos `Doc 6 (Makro)` reduciendo la resolución máxima antes de enviar:
- **1600 px (800×1400):** 37.004 tokens · **100% exactitud** en NIF y factura.
- **1200 px (686×1200):** 37.004 tokens · **100% exactitud** en NIF y factura.
- **1000 px (571×1000):** 25.670 tokens (-31% tokens) · **Alerta OCR:** confunde factura `03-2026` con `03-2262`.
- **800 px (457×800):** 14.336 tokens · **Fallo OCR:** NIF `A-28945162` (erróneo).

### 4. Conclusiones y Hallazgos Críticos
1. **`detail: "low"` NO es viable para facturas ni tickets:** Aunque reduce los tokens a 3.002 (-92%), hace fallar caracteres críticos (NIFs, números de factura, comas de decimales). En contabilidad fiscal, un NIF con un dígito cambiado o una base errónea es inaceptable.
2. **`detail: "high"` o `auto` es imprescindible para fiabilidad:** Mantiene la exactitud en el 100% de los casos.
3. **El PDF es sumamente eficiente:** Solo consume ~3.190 tokens por página (10 veces menos que una imagen) porque no sufre el multiplicador de imagen URL de mini.
4. **La raíz del 429 no es el coste en dólares:** Cada ticket cuesta solo $0.0039 - $0.0056 (medio céntimo). El problema es puramente el límite de **TPM (Tokens Por Minuto)** de la cuenta (que se agota con 5-6 tickets simultáneos si no hay cola controlada).

### 5. Recomendación de Arquitectura para A2 y A3
1. **Reducción en cliente (A2):** Redimensionar imágenes a un lado largo de **1600 px** con compresión **JPEG calidad 0.85**. 
   - Ahorra un 85% de ancho de banda y velocidad de subida a Storage (pasa de archivos de 4-8 MB a 200-400 KB).
   - Mantiene la imagen con nitidez cristalina para los tiles de OpenAI sin degradación de OCR.
2. **Ajustes en WF-01 (A3):**
   - Configurar variables centralizadas en el nodo `Build OpenAI Request`: `MODEL = 'gpt-4o-mini'` y `DETAIL = 'high'`.
   - Activar **Retry On Fail** en el nodo HTTP de OpenAI (3 intentos, 2000 ms con backoff) para que un 429 transitorio se reintente sin fallar el workflow.
3. **Cola de concurrencia en cliente (Parte B):** Despachar los documentos al webhook con concurrencia máxima de **2 a 3 peticiones simultáneas** para mantenerse dentro de la tasa de tokens por minuto permitida por OpenAI.
4. **Recomendación para producción:** En cuanto sea posible habilitar `gpt-4o` en el proyecto de OpenAI, el consumo de TPM por imagen caerá de 37.000 a ~800-1.100 tokens (un 97% menos de impacto en la cuota TPM con coste monetario equivalente).

---

## ADR-02: Almacenamiento de Imágenes Originales vs Comprimidas (§23 Trazabilidad)

### 1. Decisión Adoptada
Se decide almacenar **únicamente la versión optimizada** (redimensionada a un máximo de 1600px en su lado más largo, formato JPEG con calidad 0.85) en Supabase Storage para tickets y facturas en formato imagen. Los archivos PDF nativos se conservan íntegros sin alteración.

### 2. Justificación Técnica y Legal
1. **Validez Fiscal (§23 Trazabilidad):** La resolución resultante de 1600px supera con creces los 300 DPI equivalentes para la lectura nítida de microtexto legal, NIFs, códigos de barras y sellos tributarios en inspecciones de la AEAT.
2. **Optimización de Costes y Ancho de Banda:** Reduce el tamaño medio por ticket de 4–8 MB a ~200–350 KB (ahorro del ~85%), acelerando drásticamente la subida en conexiones móviles/Wi-Fi de hostelería y reduciendo el consumo de cuota en Supabase Storage.
3. **Coherencia con OpenAI:** La imagen almacenada es idéntica a la procesada por el modelo de visión, garantizando que el usuario visualiza en la UI exactamente la misma resolución auditada por la IA.

---

## ADR-03: Estrategia de Subida en Bloque Asíncrona (Pool de Concurrencia vs Bloqueante)

### Alternativa Descartada (por ahora): Webhook con Respuesta Inmediata + Worker Interno en n8n
- **Descripción:** El webhook de n8n responde inmediatamente `200 OK` en 50ms y encola el trabajo internamente mediante sub-workflows o colas Redis de n8n.
- **Por qué se descarta ahora:** Requiere infraestructura de cola distribuida (Redis / RabbitMQ en el servidor de n8n o arquitectura de queue mode de n8n), lo cual añade complejidad de despliegue antes de validar la experiencia del cliente.
- **Cuándo adoptarla:** Cuando el volumen supere los 200 documentos diarios por negocio o cuando se integre una pasarela externa de correo/WhatsApp con miles de facturas simultáneas.

### Solución Adoptada (Fase B): Ingesta Desacoplada en Dos Fases
- **Fase 1 (Ingesta):** Subida rápida paralela a Supabase Storage (3-4 concurrentes) + inserción inmediata en tabla `documents` con status `EXTRACTING`. La UI se desbloquea en menos de 3 segundos.
- **Fase 2 (Extracción):** Pool de concurrencia en cliente (2-3 llamadas simultáneas a n8n), escuchando las actualizaciones en tiempo real vía Supabase Realtime / polling de resiliencia.

---

## ADR-04: Modelo IA activo `gpt-4o` (03/10/2026)

**Hechos:** el cambio a `gpt-4o` se aplicó en n8n cloud la mañana del 02/10 (confirmado por el dueño); el commit `ad0ca8d` fijó `gpt-4o` como defecto en el export WF-01
(`Build OpenAI Request`), `/api/copilot/chat` y etiqueta UI usan `gpt-4o`,
`.env.example` (`OPENAI_MODEL_EXTRACTION=gpt-4o`). Existe un revert
local a `gpt-4o-mini` (3 líneas del export WF-01) que se descartó con
`git checkout` por no estar autorizado ni commiteado.
**Medición:** ADR-01 solo midió `gpt-4o-mini` (37.004 / 25.670 / 3.002
tokens por imagen; PDF ~3.191/pág). Con `gpt-4o` NO hay medición:
"reduce 97% TPM" es **estimado, pendiente de medir** (leer `usage` en
`document_extractions` con 3-5 documentos). Ver DT-11.

## ADR-05: Workflows absorbidos y renombrado WF-08 → WF-10 (03/10/2026)

WF-03 (validación) y WF-04 (clasificación) no se crean como workflows:
los absorben review Human-in-the-Loop + validadores deterministas y la
extracción OpenAI + categoría editable. WF-09 no existe: lo sustituye la
semilla SQL `seed_demo_la_corrala_escondida.sql`. El antiguo
"WF-08: notifications" pasa a **WF-10** (email/WhatsApp, pendiente);
**WF-08 = Deadline Reminders** (creado 03/10/2026, pendiente de publicar).

## ADR-06: Estados reales de `documents` vs Master Plan §16 (03/10/2026)

El enum real (migración `20260930000000`) es
`UPLOADED, EXTRACTING, EXTRACTED, NEEDS_REVIEW, CONFIRMED, REJECTED, ERROR`.
Desviación frente a §16 (`APPROVED`, `USED_IN_CALCULATION`): se mantiene
el enum de la migración como fuente de verdad (propuesta de cambio al
Master Plan pendiente de aprobación).

## ADR-07: Duplicados por hash vs por contenido (03/10/2026)

El SHA-256 pre-subida (`web/src/lib/file-hash.ts`) solo detecta **el mismo
archivo** y avisa en UI antes de subir (no genera alerta `DUPLICATE_DOCUMENT`
del Master Plan §13). **Abierto:** misma factura con otra foto
(proveedor+fecha+total / NIF+número). Ver DT-15.

## ADR-08: Claves `sb_*` y política anti-fugas (03/10/2026)

Tras GitGuardian #37833997: migración a `sb_publishable_`/`sb_secret_`,
legacy JWT desactivadas, purga del historial (force-push), `AGENTS.md`,
hook pre-commit y `scripts/check-keys.mjs`. Detalle en `SECURITY.md`.

## ADR-09: Criterio de porcentajes de fase (03/10/2026)

% = ítems ✅ / ítems totales de la tabla de la fase en PROJECT_STATUS.
100% exige cero ítems pendientes; lo descartado a propósito va a
`DECISIONS.md` + backlog (p. ej. exportar conversación del chat).

---

## ADR-10: Entorno piloto con datos reales (desviacion del Master Plan 0)

**Fecha:** 03/10/2026. **Aprueba:** el dueno (Serquin).

**Desviacion:** el Master Plan 0 excluia datos fiscales reales de la hija en
la fase inicial. Pasa a permitirse porque los datos son del propio dueno (su
factura de Iberdrola) y del negocio familiar (bar-restaurante de su hija)
**con consentimiento de sus titulares**, mas documentos de testers. El entorno
sigue etiquetado DEMO pero opera como PILOTO.

**Medidas minimas aplicadas:**
- Bucket `documents` a privado + URLs firmadas de vida corta (tarea A, DT-17 en ALTA).
- RLS en Storage por negocio; resto de RLS ya activo (DT-06 en curso).
- Aviso visible en `/documents` (piloto, IA de tercero, cifras estimativas).
- Prohibido presentar cifras como declaracion oficial (AI_POLICY + banner DEMO).

**Los prerrequisitos de Fase 8 siguen sin cumplirse** (juridico, backup,
fuentes AEAT, separacion total de entornos). Sin ellos no hay produccion.

---

## ADR-11: Diseno bucket privado documents (tarea A1, APROBADO con condiciones 03/10/2026)

**Estado:** DISENO sin implementar. No mover ni renombrar objetos hasta validacion.

### 1. Inventario real de URLs publicas (verificado en codigo 03/10/2026)

| Lugar | Uso |
|---|---|
| `documents/page.tsx:129,357` | `getPublicUrl` al mapear y al subir (guarda `filePublicUrl` en memoria) |
| `documents/page.tsx:362` | `notes = "URL: <publica>"` → **URLs completas guardadas en BD** |
| `documents/page.tsx:448` | `fileUrl` (publica) en payload al webhook n8n |
| `expenses/page.tsx:117` | `getPublicUrl` para miniaturas |
| `review/page.tsx:105` | `getPublicUrl` para el visor |
| WF-01 `Download PDF` | descarga desde `fileUrl` (requiere URL publica hoy) |
| WF-01 `Build OpenAI Request` | imagen como `image_url` con URL publica; PDF como `file_data` base64 |
| `web/.../convert-pdf` | ELIMINADO 03/10/2026 (DT-21); ya no cuenta |

Filas con URL completa en BD: `documents.notes` con prefijo `URL: ` (todas las
subidas desde el panel web). Derivar `storage_path` desde `storage_path`
(columna propia, siempre presente) — no hace falta parsear la URL.

### 2. Convencion de `storage_path`

Hoy: `${uuid}-${nombre}` en la RAIZ del bucket (sin carpeta por negocio).
Aprobado: migrar TODO a `{business_id}/{document_id}.{ext}`, sin convivencia.
Procedimiento reversible (con confirmación previa en producción):
backup de objetos → COPIAR a nueva ruta → verificar cada copia con URL
firmada → actualizar `storage_path` → borrar originales solo tras A4.
`documents.notes`: solo se usa como fallback de nombre de proveedor en 4
mapeos (UI) y es otra columna distinta en `alerts`/`expenses` (no se tocan).
A NULL solo notas con patrón URL pública, con copia previa de (id, notes);
no se borra la columna.

Cachés con URLs públicas (inventario 03/10, sin `sessionStorage` en uso):
`copiloto_fiscal_documents_*` (objetos con `url`), `copiloto_fiscal_documents_v1`,
`copiloto_fiscal_active_alerts_count`, `copiloto_fiscal_resolved_alerts*`,
`copiloto_prefs` (sin URLs). A3 versiona las claves (`_v2_signed`) o purga al cargar.

### 3. RLS en `storage.objects` (fichero de migracion, sin aplicar a mano)

Solo rol `authenticated`; WITH CHECK en insert/update; sin policy `anon`;
propiedad vía `businesses.owner_id = auth.uid()` con el primer segmento de
la ruta (`split_part(name, '/', 1)`):

```sql
-- supabase/migrations/AAAAMMDDHHMMSS_storage_documents_rls.sql
update storage.buckets set public = false where id = 'documents';

create policy "documents owner read" on storage.objects for select
using (bucket_id = 'documents'
  and exists (select 1 from businesses b
    where b.id::text = split_part(name, '/', 1) and b.owner_id = auth.uid()));
-- insert/update/delete analogos (update/delete con USING + WITH CHECK);
-- los objetos raiz antiguos quedan visibles solo via service_role
-- hasta migrarlos (ver A3).
```

Avatares: la UI sube a `${user.id}/avatar.*` (id de sesión, no elegible por
el usuario), así que nadie puede sobrescribir el de otro desde la app; las
policies deben exigir `auth.uid()::text = (storage.foldername(name))[1]`.
Sin policy `anon` tampoco aquí.

### 4. Descarga n8n autenticada (PENDIENTE de prueba en n8n por el dueño)

`GET https://<ref>.supabase.co/storage/v1/object/authenticated/<storage_path>`
con `apikey` + `Authorization: Bearer <sb_secret>` (credencial n8n;
`sb_*` verificado en REST el 03/10/2026, **pendiente prueba en el propio
n8n antes de tocar WF-01**). Respuesta binaria a propiedad `data`.
Nunca URL publica. Pasos: en n8n, workflow temporal → HTTP Request GET a la
URL authenticated de un doc real con credencial "Supabase Copilot" → Execute
→ esperado: binario 200 (PDF/imagen). Sin esto verificado no hay A2.

### 5. Imagenes como data URL base64

En `Build OpenAI Request`: `image_url: { url: "data:<mime>;base64,..." }`
con MIME real validado contra `png/jpeg/gif/webp`; si no es valido,
documento a NEEDS_REVIEW con mensaje claro. PDFs igual que hoy
(`file_data` base64). Mantener limite 20 MB y errores hacia NEEDS_REVIEW.

### 6. Rollback por paso

- A2: si el workflow nuevo falla, reactivar el anterior (no desactivarlo
  hasta validar; anotar IDs vigente/antiguo).
- A3: feature-flag por `storage_path` con `/` (nuevo) vs sin `/` (viejo).
- A4: `update storage.buckets set public = true` revierte visibilidad
  (ventana de exposicion asumida; avisar).
- Migracion SQL: transaccion + `down` que revierte policies y flag.

### 7. Bucket `avatars`

Puede seguir PUBLICO: solo fotos de perfil, sin datos fiscales. Decidir por
separado si algun dia guarda otra cosa. Documentado; sin accion.

---

## ADR-12: Webhook n8n tras servidor propio con Header Auth (A5 — implementado 05/10/2026)

**Estado:** ✅ Proxy SSR implementado (lado cliente). ⏳ Pendiente: activar Header Auth en n8n receptor + `N8N_WEBHOOK_SECRET` en Vercel.

**Problema (DT-18):** con n8n descargando por ruta con service-role, el
webhook abierto permite pedir que procese rutas ajenas.

**Propuesta recomendada:** el navegador deja de llamar a n8n y llama a
`POST /api/documents/process` (Next.js, misma app):
1. Valida sesión (Supabase SSR) y comprueba por RLS que el documento
   pertenece a un negocio del usuario (`select documents ... eq id, business`).
2. Llama al webhook n8n con cabecera secreta (`N8N_WEBHOOK_SECRET`, ya existe
   en `web/.env.local` y Vercel; en n8n va a Header Auth del trigger).
3. n8n verifica la cabecera y además valida que el primer segmento de
   `storagePath` == `businessId` del payload (defensa en profundidad).
4. Responde al navegador al terminar (flujo actual) con timeout 55 s.

**Impacto concurrencia (ADR-03):** el pool (2 simultáneas) sigue en el
cliente, ahora contra la ruta propia; el servidor reenvía sin cola propia.
Mismo perfil TPM.

**Duración en Vercel (verificado en docs oficiales 08/2026):** plan Hobby,
300 s por defecto y 300 s de máximo. `maxDuration = 60` cabe de sobra para
4-10 s de extracción (timeout propio 55 s). Sin plan B necesario, pero se
mantiene 202 + Realtime como alternativa si el plan cambia.

**Alternativa simple (no recomendada):** mantener llamada directa + path
impredecible del webhook + validación segmento==businessId en WF-01.
Barata pero el secreto vive en el bundle del cliente y no hay check RLS de
propiedad: insuficiente con datos reales.

**Recomendación:** ruta de servidor con `maxDuration = 60` y timeout 55 s.
Secreto nuevo de 32 bytes generado el 03/10/2026 (en `web/.env.local`,
pendiente de copiar a Vercel + Header Auth n8n al activar A5; el anterior se
considera comprometido y no se reutiliza). Orden: A5 DESPUÉS de A4; hasta
entonces el webhook acepta llamadas actuales.
