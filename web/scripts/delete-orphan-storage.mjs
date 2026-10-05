// scripts/delete-orphan-storage.mjs — ejecutar desde /web
// Paso h: borrar los 29 archivos huérfanos de la raíz del bucket 'documents'

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rqcpwxucgkcodccrykpv.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Falta SUPABASE_SERVICE_ROLE_KEY en el entorno');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const ORPHAN_PATHS = [
  '65072a09-cbb4-470b-906a-d4f645916f3a-prueba2.jpg',
  'cf015db8-ac87-412b-a3f1-4fcd731a10f9-facturaLuz-001.pdf',
  '0211302e-a566-437c-8682-91f85594d4ee-prueba1.jpg',
  '4a7348f9-8366-4b56-8fd1-b1d364ec395c-prueba2.jpg',
  '3d4949a1-4550-4b80-a384-7481c9da2052-facturaLuz-001.pdf',
  'f3c54957-0d0b-4f22-8b12-a24fcdb0d677-prueba1.jpg',
  'a8e44630-1872-4ad5-85bf-6f8438621599-facturaLuz.pdf',
  '2b05c29a-46a8-4707-9c15-c793ddb79970-fact_dia_2oct26.pdf',
  '10b20c31-5725-40c1-a447-570b65bf2dd3-fact_visegur_oct_26.pdf',
  'd2f87194-c886-4743-b5a9-0fad8b1bd20a-fact._dia_1oct26.pdf',
  'bee2a289-48ca-415b-96b9-04357542438b-fact.dia_2oct26.pdf',
  '7b8e1dcf-dac8-49b1-b312-36d9e5c71ca4-FF202600000515-B87441242.pdf',
  '75a7a71f-e490-4b98-8a4c-61076df6317a-FF202600000516-B87441242.pdf',
  'b4f7dc55-30a2-4763-8804-22a17706857b-FF202600000506-B87441242.pdf',
  '63c9b29c-9678-404a-adf1-1513e994fbd2-26015_-_Daniela.pdf',
  '936da98d-6d41-488b-ae0f-c085ddd5e1b5-DGFC2629790330.pdf',
  '2f28f148-2b85-47aa-85ac-cf417aec6e64-DGFC2629790330.pdf',
  '3d698782-0b97-4bcd-8f5f-d14bb2d8e1f0-26015_-_Daniela.pdf',
  'd4ec39da-c4b4-4af1-8593-79cba1c65597-FF202600000506-B87441242.pdf',
  '898bd7cf-0e87-4388-8b83-0111b7341ee3-Factura_A5141.pdf',
  '88bd8d5d-f65f-484e-9ead-ed8c6168e925-facturaLuz_backup.pdf',
  'ccc9babe-e8f5-4113-90a2-2ccdd88eddc0-facturaLuz_backup.pdf',
  '65ebda1f-f605-4b4d-b4b8-2924bea6f8d9-factura.pdf',
  '4e3f69db-281b-49ae-a74a-f0a0f1860e45-factura.pdf',
  '81aa6a47-c557-449d-811c-f92df75121c8-factura.pdf',
  'b0bcba43-46d7-4491-86b3-27c2ee8b7f82-factura.pdf',
  '7d44ed5d-ceb4-4103-b7a2-bf3deeb65e55-pruebaRecibo.jpg',
  '88ee36d6-bc6f-4774-b83b-94526c681ae8-pruebaRecibo.jpg',
  'da53cc21-61bf-440d-9241-b54d16659011-propuesta.jpg',
];

async function deleteOrphans() {
  console.log(`🗑️  Borrando ${ORPHAN_PATHS.length} archivos huérfanos...`);
  const { data, error } = await supabase.storage.from('documents').remove(ORPHAN_PATHS);
  if (error) { console.error('❌ Error:', error.message); process.exit(1); }
  console.log(`✅ Borrados: ${data?.length ?? 0} archivos`);
  console.log('🏁 Paso h completo.');
}

deleteOrphans().catch(err => { console.error(err); process.exit(1); });
