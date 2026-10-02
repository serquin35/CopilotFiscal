import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage } from '../web/node_modules/canvas/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../web/.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = envContent.split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k && v) acc[k.trim()] = v.join('=').trim();
  return acc;
}, {});

const systemPrompt = `Eres un analizador fiscal especializado en facturas y tickets en España. Extrae los datos del documento en formato JSON estricto: {"supplier_name": string|null, "supplier_nif": string|null, "invoice_number": string|null, "date": "YYYY-MM-DD"|null, "base_amount": number|null, "vat_rate": number|null, "vat_amount": number|null, "total_amount": number|null, "category": string, "description": string, "confidence": number}. Categorías válidas: alimentacion, bebidas, limpieza, suministros, alquiler, mantenimiento, personal, servicios_profesionales, software, material_oficina, marketing, transporte, seguros, otros.`;

async function resizeImage(inputPath, maxDim, quality = 0.85) {
  const img = await loadImage(inputPath);
  let w = img.width;
  let h = img.height;
  if (w > maxDim || h > maxDim) {
    if (w > h) {
      h = Math.round((h * maxDim) / w);
      w = maxDim;
    } else {
      w = Math.round((w * maxDim) / h);
      h = maxDim;
    }
  }
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  const buffer = canvas.toBuffer('image/jpeg', { quality });
  return { buffer, width: w, height: h };
}

async function testResized(filePath, maxDim) {
  const { buffer, width, height } = await resizeImage(filePath, maxDim);
  const base64 = buffer.toString('base64');
  const dataUri = `data:image/jpeg;base64,${base64}`;

  const t0 = Date.now();
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extrae todos los datos fiscales de esta factura o recibo con alta precisión.' },
            { type: 'image_url', image_url: { url: dataUri, detail: 'high' } }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1
    })
  });

  const durationMs = Date.now() - t0;
  const json = await res.json();
  if (!res.ok) {
    return { maxDim, width, height, error: json.error?.message || json };
  }

  let parsed = null;
  try {
    parsed = JSON.parse(json.choices[0].message.content);
  } catch (e) {
    parsed = { error: 'invalid json' };
  }

  return {
    maxDim,
    width,
    height,
    durationMs,
    promptTokens: json.usage.prompt_tokens,
    completionTokens: json.usage.completion_tokens,
    costUsd: (json.usage.prompt_tokens * 0.15 + json.usage.completion_tokens * 0.60) / 1_000_000,
    extracted: parsed
  };
}

async function run() {
  const file = path.resolve(__dirname, '../web/test_samples/doc6_ticket_letra_pequena.png');
  console.log('Testing doc6_ticket_letra_pequena with various resolutions:');
  for (const dim of [1600, 1200, 1000, 800, 600]) {
    process.stdout.write(`Testing maxDim=${dim}... `);
    const res = await testResized(file, dim);
    if (res.error) {
      console.log('ERROR:', res.error);
    } else {
      console.log(`OK! Dim: ${res.width}x${res.height}, PromptTokens: ${res.promptTokens}, Time: ${res.durationMs}ms`);
      console.log(`   NIF: ${res.extracted?.supplier_nif}, Factura: ${res.extracted?.invoice_number}, Total: ${res.extracted?.total_amount}, Base: ${res.extracted?.base_amount}, IVA: ${res.extracted?.vat_amount}`);
    }
    await new Promise(r => setTimeout(r, 600));
  }
}

run().catch(console.error);
