#!/usr/bin/env node
/**
 * scripts/maintenance/clean_orphan_expenses.mjs
 * Script de mantenimiento preventivo para auditar y limpiar gastos huérfanos.
 * 
 * Uso:
 *   node supabase/maintenance/clean_orphan_expenses.mjs --dry-run
 *   node supabase/maintenance/clean_orphan_expenses.mjs --execute
 */

import { createClient } from '@supabase/supabase-js';

const isDryRun = !process.argv.includes('--execute');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Error: Variables NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY requeridas.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log(`[clean_orphan_expenses] Modo: ${isDryRun ? 'DRY-RUN (solo lectura/auditoría)' : 'EXECUTE (limpieza real)'}`);

  // 1. Buscar gastos cuyo document_id no existe en documents
  const { data: orphanExpenses, error } = await supabase
    .from('expenses')
    .select('id, business_id, document_id, description, total_amount, created_at')
    .not('document_id', 'is', null);

  if (error) {
    console.error('Error consultando expenses:', error.message);
    process.exit(1);
  }

  // Comprobar existencia del documento
  const { data: validDocs, error: docsError } = await supabase
    .from('documents')
    .select('id');

  if (docsError) {
    console.error('Error consultando documents:', docsError.message);
    process.exit(1);
  }

  const validDocIds = new Set((validDocs || []).map((d) => d.id));
  const trulyOrphan = (orphanExpenses || []).filter((e) => !validDocIds.has(e.document_id));

  console.log(`[clean_orphan_expenses] Gastos vinculados a documentos analizados: ${orphanExpenses.length}`);
  console.log(`[clean_orphan_expenses] Gastos huérfanos detectados: ${trulyOrphan.length}`);

  if (trulyOrphan.length === 0) {
    console.log('✅ Base de datos íntegra: No hay gastos huérfanos.');
    return;
  }

  console.table(trulyOrphan);

  if (isDryRun) {
    console.log('ℹ️ Para desvincular o limpiar estos gastos en producción, ejecuta con el flag --execute');
  } else {
    const orphanIds = trulyOrphan.map((e) => e.id);
    const { error: updateError } = await supabase
      .from('expenses')
      .update({ document_id: null })
      .in('id', orphanIds);

    if (updateError) {
      console.error('Error actualizando gastos huérfanos:', updateError.message);
      process.exit(1);
    }
    console.log(`✅ ${orphanIds.length} gastos desvinculados exitosamente (document_id establecido a NULL).`);
  }
}

run().catch((err) => {
  console.error('Fallo no controlado:', err);
  process.exit(1);
});
