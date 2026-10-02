import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../web/.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = envContent.split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k && v) acc[k.trim()] = v.join('=').trim();
  return acc;
}, {});

const systemPrompt = `Eres un analizador fiscal especializado en facturas y tickets en España. Extrae los datos del documento en formato JSON estricto: {"supplier_name": string|null, "supplier_nif": string|null, "invoice_number": string|null, "date": "YYYY-MM-DD"|null, "base_amount": number|null, "vat_rate": number|null, "vat_amount": number|null, "total_amount": number|null, "category": string, "description": string, "confidence": number}. Categorías válidas: alimentacion, bebidas, limpieza, suministros, alquiler, mantenimiento, personal, servicios_profesionales, software, material_oficina, marketing, transporte, seguros, otros.`;

export async function runTest(model, detail, filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const isPdf = filePath.toLowerCase().endsWith('.pdf');
  const base64 = fileBuffer.toString('base64');
  
  let userContent = [
    { type: 'text', text: 'Extrae todos los datos fiscales de esta factura o recibo con alta precisión.' }
  ];

  if (isPdf) {
    userContent.push({
      type: 'file',
      file: {
        filename: path.basename(filePath),
        file_data: `data:application/pdf;base64,${base64}`
      }
    });
  } else {
    const ext = path.extname(filePath).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
    userContent.push({
      type: 'image_url',
      image_url: {
        url: `data:${mime};base64,${base64}`,
        ...(detail ? { detail } : {})
      }
    });
  }

  const t0 = Date.now();
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1
    })
  });

  const durationMs = Date.now() - t0;
  const json = await res.json();
  if (!res.ok) {
    return { error: json, status: res.status, durationMs };
  }

  let parsed = null;
  try {
    parsed = JSON.parse(json.choices[0].message.content);
  } catch (e) {
    parsed = { error: 'Invalid JSON' };
  }

  return {
    model,
    detail: detail || 'default',
    file: path.basename(filePath),
    durationMs,
    usage: json.usage,
    extracted: parsed
  };
}

async function main() {
  console.log('Testing recibo_original with gpt-4o-mini high...');
  const res = await runTest('gpt-4o-mini', 'high', path.resolve(__dirname, '../web/test_samples/recibo_original.jpg'));
  console.log('Result:', JSON.stringify(res, null, 2));
}

main().catch(console.error);
