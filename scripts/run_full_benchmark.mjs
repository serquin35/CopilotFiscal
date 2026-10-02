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

// Official OpenAI pricing (as of 2024/2026):
// gpt-4o-mini: $0.15 / 1M prompt, $0.60 / 1M completion
// gpt-4o: $2.50 / 1M prompt, $10.00 / 1M completion
function calculateCost(model, promptTokens, completionTokens) {
  if (model.includes('mini')) {
    return (promptTokens * 0.15 + completionTokens * 0.60) / 1_000_000;
  } else {
    return (promptTokens * 2.50 + completionTokens * 10.00) / 1_000_000;
  }
}

async function testSingle(model, detail, filePath) {
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
    const imgObj = { url: `data:${mime};base64,${base64}` };
    if (detail) imgObj.detail = detail;
    userContent.push({
      type: 'image_url',
      image_url: imgObj
    });
  }

  const t0 = Date.now();
  try {
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
      return { model, detail, file: path.basename(filePath), error: json.error?.message || json, durationMs };
    }

    let parsed = null;
    try {
      parsed = JSON.parse(json.choices[0].message.content);
    } catch (e) {
      parsed = { parse_error: true, raw: json.choices[0].message.content };
    }

    const cost = calculateCost(model, json.usage.prompt_tokens, json.usage.completion_tokens);

    return {
      model,
      detail: detail || 'none',
      file: path.basename(filePath),
      durationMs,
      promptTokens: json.usage.prompt_tokens,
      completionTokens: json.usage.completion_tokens,
      totalTokens: json.usage.total_tokens,
      costUsd: cost,
      extracted: parsed
    };
  } catch (err) {
    return { model, detail, file: path.basename(filePath), error: err.message, durationMs: Date.now() - t0 };
  }
}

async function runBenchmark() {
  const samplesDir = path.resolve(__dirname, '../web/test_samples');
  const files = [
    'doc1_recibo_iberdrola.jpg',
    'doc4_ticket_bar.png',
    'doc5_ticket_borroso.jpg',
    'doc6_ticket_letra_pequena.png',
    'doc3_factura_pdf.pdf'
  ];

  const configs = [
    { model: 'gpt-4o-mini', detail: 'high' },
    { model: 'gpt-4o-mini', detail: 'auto' },
    { model: 'gpt-4o-mini', detail: 'low' },
    { model: 'gpt-4o', detail: 'high' },
    { model: 'gpt-4o', detail: 'auto' },
    { model: 'gpt-4o', detail: 'low' }
  ];

  console.log(`Starting benchmark: ${files.length} documents x ${configs.length} configs = ${files.length * configs.length} tests...`);
  const results = [];

  for (const f of files) {
    const fullPath = path.join(samplesDir, f);
    if (!fs.existsSync(fullPath)) {
      console.warn(`File not found: ${f}`);
      continue;
    }
    console.log(`\n========================================`);
    console.log(`Testing document: ${f}`);
    console.log(`========================================`);

    for (const cfg of configs) {
      // PDF does not support image detail parameter in the same way, but let's test how model handles it
      if (f.endsWith('.pdf') && cfg.detail !== 'high' && cfg.detail !== 'auto') {
        // Skip duplicate detail variations for PDF since it uses 'file' input
        continue;
      }
      process.stdout.write(`Testing ${cfg.model} [detail: ${cfg.detail}]... `);
      const res = await testSingle(cfg.model, cfg.detail, fullPath);
      if (res.error) {
        console.log(`ERROR: ${JSON.stringify(res.error)} (${res.durationMs}ms)`);
      } else {
        console.log(`OK: prompt=${res.promptTokens}, comp=${res.completionTokens}, time=${res.durationMs}ms, cost=$${res.costUsd.toFixed(5)}`);
      }
      results.push(res);
      // Small pause to respect rate limits
      await new Promise(r => setTimeout(r, 600));
    }
  }

  const outPath = path.resolve(__dirname, '../benchmark_results.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nAll results saved to ${outPath}`);
}

runBenchmark().catch(console.error);
