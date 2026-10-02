import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage } from '../web/node_modules/canvas/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const samplesDir = path.resolve(__dirname, '../web/test_samples');

async function createSamples() {
  if (!fs.existsSync(samplesDir)) fs.mkdirSync(samplesDir, { recursive: true });

  // 1. Doc 4: Ticket Bar / Restaurante
  const c1 = createCanvas(600, 1000);
  const ctx1 = c1.getContext('2d');
  ctx1.fillStyle = '#fdfdfb';
  ctx1.fillRect(0, 0, 600, 1000);
  ctx1.fillStyle = '#111';
  ctx1.font = 'bold 24px monospace';
  ctx1.textAlign = 'center';
  ctx1.fillText('TABERNA EL BARRIL S.L.', 300, 60);
  ctx1.font = '16px monospace';
  ctx1.fillText('NIF: B-84920194', 300, 90);
  ctx1.fillText('C/ Cava Baja, 14 - 28005 Madrid', 300, 115);
  ctx1.fillText('Tel: 915 22 33 44', 300, 140);
  ctx1.fillText('------------------------------------------', 300, 170);
  
  ctx1.textAlign = 'left';
  ctx1.font = '16px monospace';
  ctx1.fillText('FACTURA SIMPLIFICADA: T-2026/0491', 40, 205);
  ctx1.fillText('FECHA: 24/09/2026   HORA: 14:35', 40, 230);
  ctx1.fillText('MESA: 04    CAMARERO: Roberto', 40, 255);
  ctx1.fillText('------------------------------------------', 40, 280);

  ctx1.fillText('CANT  DESCRIPCION          P.UNIT   TOTAL', 40, 310);
  ctx1.fillText('------------------------------------------', 40, 330);
  ctx1.fillText(' 2    Cerveza Doble          3.00    6.00', 40, 360);
  ctx1.fillText(' 1    Racion Jamon Iberico  18.50   18.50', 40, 390);
  ctx1.fillText(' 1    Croquetas Caseras      9.00    9.00', 40, 420);
  ctx1.fillText(' 1    Agua Mineral 50cl      2.50    2.50', 40, 450);
  ctx1.fillText(' 2    Cafe Solo              1.80    3.60', 40, 480);
  ctx1.fillText('------------------------------------------', 40, 520);
  
  ctx1.font = 'bold 18px monospace';
  ctx1.fillText('BASE IMPONIBLE (10%):', 40, 560);
  ctx1.textAlign = 'right';
  ctx1.fillText('36.00 EUR', 560, 560);

  ctx1.textAlign = 'left';
  ctx1.fillText('IVA (10%):', 40, 595);
  ctx1.textAlign = 'right';
  ctx1.fillText('3.60 EUR', 560, 595);

  ctx1.textAlign = 'left';
  ctx1.font = 'bold 24px monospace';
  ctx1.fillText('TOTAL A PAGAR:', 40, 650);
  ctx1.textAlign = 'right';
  ctx1.fillText('39.60 EUR', 560, 650);

  ctx1.textAlign = 'center';
  ctx1.font = '14px monospace';
  ctx1.fillText('IVA INCLUIDO - PAGO CON TARJETA', 300, 720);
  ctx1.fillText('GRACIAS POR SU VISITA', 300, 750);

  fs.writeFileSync(path.join(samplesDir, 'doc4_ticket_bar.png'), c1.toBuffer('image/png'));
  console.log('Created doc4_ticket_bar.png');

  // 2. Doc 5: Ticket Borroso (Blurred)
  const c2 = createCanvas(600, 1000);
  const ctx2 = c2.getContext('2d');
  // Draw ticket slightly rotated and soft/blurred
  ctx2.fillStyle = '#eaeae5';
  ctx2.fillRect(0, 0, 600, 1000);
  
  // Render blurred content by drawing multiple times with offsets
  ctx2.fillStyle = 'rgba(30, 30, 30, 0.4)';
  ctx2.font = '15px sans-serif';
  const offsets = [[-1,-1], [1,-1], [-1,1], [1,1], [0,0]];
  for (const [ox, oy] of offsets) {
    ctx2.fillText('DISTRIBUIDORA BEBIDAS DEL SUR S.L.', 80 + ox, 100 + oy);
    ctx2.fillText('NIF: B-91283746  Factura: F-8831', 80 + ox, 130 + oy);
    ctx2.fillText('Fecha: 15/09/2026', 80 + ox, 160 + oy);
    ctx2.fillText('Barril Cerveza 50L x 2: 180.00 EUR', 80 + ox, 220 + oy);
    ctx2.fillText('Cajas Refrescos x 4: 56.00 EUR', 80 + ox, 250 + oy);
    ctx2.fillText('Base: 236.00 EUR', 80 + ox, 310 + oy);
    ctx2.fillText('IVA (21%): 49.56 EUR', 80 + ox, 340 + oy);
    ctx2.fillText('TOTAL: 285.56 EUR', 80 + ox, 390 + oy);
  }
  fs.writeFileSync(path.join(samplesDir, 'doc5_ticket_borroso.jpg'), c2.toBuffer('image/jpeg', { quality: 0.6 }));
  console.log('Created doc5_ticket_borroso.jpg');

  // 3. Doc 6: Ticket con Letra Pequeña (Supermercado / Makro)
  const c3 = createCanvas(800, 1400);
  const ctx3 = c3.getContext('2d');
  ctx3.fillStyle = '#ffffff';
  ctx3.fillRect(0, 0, 800, 1400);
  ctx3.fillStyle = '#000000';
  ctx3.font = 'bold 18px monospace';
  ctx3.textAlign = 'center';
  ctx3.fillText('MAKRO DISTRIBUCION MAYORISTA S.A.', 400, 50);
  ctx3.font = '12px monospace';
  ctx3.fillText('NIF: A-28045612  CENTRO: BARAJAS 03', 400, 75);
  ctx3.fillText('FACTURA SIMPLIFICADA: 03-2026-99482', 400, 95);
  ctx3.fillText('FECHA: 28/09/2026 09:12:44', 400, 115);
  ctx3.fillText('================================================================', 400, 135);

  ctx3.textAlign = 'left';
  ctx3.font = '11px monospace';
  ctx3.fillText('ARTICULO                          CANT   PRECIO   IVA     TOTAL', 30, 160);
  ctx3.fillText('----------------------------------------------------------------', 30, 175);
  ctx3.fillText('ACEITE OLIVA VIRGEN EXTRA 5L       4      38.50    4%    154.00', 30, 200);
  ctx3.fillText('HARINA ESPECIAL FRITURA 25KG       2      19.20    4%     38.40', 30, 225);
  ctx3.fillText('SERVILLETA BAR 17X17 CAJA          3      14.10   21%     42.30', 30, 250);
  ctx3.fillText('DETERGENTE LAVAVAJILLAS 10L        1      28.90   21%     28.90', 30, 275);
  ctx3.fillText('SOLOMILLO TERNERA KG               5.2    22.00   10%    114.40', 30, 300);
  ctx3.fillText('----------------------------------------------------------------', 30, 330);
  
  ctx3.font = '12px monospace';
  ctx3.fillText('DESGLOSE IMPUESTOS:', 30, 360);
  ctx3.fillText('TIPO IVA    BASE      CUOTA', 30, 380);
  ctx3.fillText('  4.00%    192.40      7.70', 30, 400);
  ctx3.fillText(' 10.00%    114.40     11.44', 30, 420);
  ctx3.fillText(' 21.00%     71.20     14.95', 30, 440);
  ctx3.fillText('----------------------------------------------------------------', 30, 460);
  ctx3.font = 'bold 15px monospace';
  ctx3.fillText('BASE TOTAL:  378.00 EUR', 30, 490);
  ctx3.fillText('IVA TOTAL:    34.09 EUR', 30, 515);
  ctx3.fillText('TOTAL FACTURA: 412.09 EUR', 30, 545);

  fs.writeFileSync(path.join(samplesDir, 'doc6_ticket_letra_pequena.png'), c3.toBuffer('image/png'));
  console.log('Created doc6_ticket_letra_pequena.png');

  // Copy or rename existing docs to standard names
  if (fs.existsSync(path.join(samplesDir, 'recibo_original.jpg'))) {
    fs.copyFileSync(path.join(samplesDir, 'recibo_original.jpg'), path.join(samplesDir, 'doc1_recibo_iberdrola.jpg'));
  }
  if (fs.existsSync(path.join(samplesDir, 'propuesta.jpg'))) {
    fs.copyFileSync(path.join(samplesDir, 'propuesta.jpg'), path.join(samplesDir, 'doc2_propuesta_gasto.jpg'));
  }
  if (fs.existsSync(path.join(samplesDir, 'factura.pdf'))) {
    fs.copyFileSync(path.join(samplesDir, 'factura.pdf'), path.join(samplesDir, 'doc3_factura_pdf.pdf'));
  }
  console.log('Sample set complete!');
}

createSamples().catch(console.error);
