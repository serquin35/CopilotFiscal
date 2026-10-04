# STORAGE MIGRATION PLAN — bucket `documents` a privado (tarea A4)

> Estado: PLAN sin ejecutar. Nada de este documento se ha aplicado.
> Paradas obligatorias: antes de ejecutar scripts/migración en producción,
> antes de activar/desactivar workflows (lo hace el dueño en n8n).

## Cuánto afecta (contar antes de empezar)

```sql
-- filas con ruta antigua (raíz, sin carpeta de negocio)
select count(*) from documents where storage_path not like '%/%';
-- notas con URL pública (a NULL tras A4 verificado, con copia previa)
select id, notes from documents where notes like '%supabase.co/storage%';
-- policies amplias actuales (anotar nombres para el rollback)
select policyname, cmd from pg_policies
where schemaname='storage' and tablename='objects' and cmd='SELECT';
```

## Orden de despliegue (revisado)

**a. Copiar archivos** (`migrate-storage-paths.mjs` con `--apply`, SIN `--delete-originals`).
Fallo: error de copia/verificación → aborta solo, originales intactos.
Detección: el script lanza excepción con la ruta. Rollback: nada que revertir (copias huérfanas; borrarlas a mano si se quiere).

**b. Actualizar `storage_path`** (el propio script, con CSV de copia en tmp, fuera del repo).
Fallo: PATCH rechazado → aborta; re-ejecutable (idempotente por id).
Rollback: restaurar `storage_path` desde el CSV.

**c. Merge de A3** (`LEGACY_FILEURL_COMPAT = true`) + deploy Vercel.
Fallo: build rojo → no mergear (criterio de salida de la rama).
Rollback: revert del merge.

**d. Probar con negocio demo** (ver prueba manual abajo). Criterio: 4 tipos OK.

**e. Activar WF-01 v2.2, desactivar el viejo.** El dueño anota el ID vigente.
Rollback: reactivar el viejo (mismo path; micro-corte al conmutar).

**f. Subida desde la app** (negocio demo): debe usar la ruta nueva + firmada.

**g. A4: migración RLS + bucket privado.** Comprobar: URL pública antigua NO
abre (401/404); visor con firmada sí; WF-01 procesa JPG/PNG/PDF; usuario sin
sesión no lista ni descarga; usuario B no ve archivos de A (test 2-usuarios
en `supabase/tests/`, enlazado a DT-06).
Rollback: sección ROLLBACK de la migración (revertir a público + policies
genéricas; asumir ventana de exposición).

**h. Commit final:** quitar `LEGACY_FILEURL_COMPAT`, `notes` con URL → NULL
(con copia previa de `(id, notes)`), borrar originales objeto a objeto
contra el CSV. Rollback: revert del commit; los originales ya no existen
(por eso el borrado es lo ÚLTIMO).

## Criterios de aceptación (A6)

- URL pública de cualquier archivo existente deja de funcionar.
- Lote de 10 mixtos en privado: todos extraen o van a NEEDS_REVIEW con motivo.
- Ruta ajena o con `..` rechazada por WF-01.
- Test 2 usuarios superado y guardado en `supabase/tests/`.
- Sin secretos en el diff; sin URLs públicas en BD, código ni workflows.
- Lint, build y tests en verde.

## Prueba manual en PREVIEW de Vercel (rama, contra BD prod: solo negocio demo)

1. Despliega la rama (preview). Entra con tu usuario (negocio demo UUID cero).
2. `/documents`: comprueba el banner piloto + que NO hay URLs `supabase.co` en
   la pestaña Network al cargar (filtro `supabase`).
3. Sube 1 JPG + 1 PDF: deben pasar a EXTRACTED/NEEDS_REVIEW (nunca ERROR
   permanente); el visor muestra la imagen/PDF (Loading → contenido).
4. Recarga: el visor sigue funcionando (renovación de firmada).
5. DevTools → Application → Local Storage: ninguna clave contiene `http`
   salvo `supabase.auth.token` (sesión, esperado).
6. `/expenses/print?q=4T&y=2026`: totales cuadran con el dashboard.
7. Borra un doc de prueba desde la papelera de Gastos: desaparece de BD.
