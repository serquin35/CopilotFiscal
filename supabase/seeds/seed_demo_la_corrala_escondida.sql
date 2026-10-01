-- =============================================================================
-- SEED: La Corrala Escondida — Q4 2026 (DEMO)
-- =============================================================================
-- Negocio ficticio de hostelería para simulación del Copiloto Fiscal.
-- Todos los datos son FICTICIOS. No usar como referencia fiscal real.
-- Ejecutar con service_role o desde Supabase SQL Editor.
-- =============================================================================

-- 1. Renombrar el negocio demo existente
UPDATE businesses
SET name = 'La Corrala Escondida', updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 2. Proveedores DEMO
INSERT INTO suppliers (id, business_id, name, normalized_name, tax_id_masked, category, country, is_verified, notes, created_at, updated_at) VALUES
  ('aaa00001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'MAKRO AUTOSERVICIO MAYORISTA, S.A.', 'makro autoservicio mayorista sa', 'A28*****23', 'alimentacion', 'ES', true, 'Proveedor DEMO ficticio', NOW(), NOW()),
  ('aaa00001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'CAFÉS BAQUÉ, S.A.', 'cafes baque sa', 'A31*****88', 'alimentacion', 'ES', true, 'Proveedor DEMO ficticio', NOW(), NOW()),
  ('aaa00001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'MAHOU-SAN MIGUEL, S.A.', 'mahou san miguel sa', 'A28*****54', 'alimentacion', 'ES', true, 'Proveedor DEMO ficticio', NOW(), NOW()),
  ('aaa00001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'EUROSUPPLY LIMPIEZA, S.L.', 'eurosupply limpieza sl', 'B79*****12', 'limpieza', 'ES', true, 'Proveedor DEMO ficticio', NOW(), NOW()),
  ('aaa00001-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'GESTORÍA FISCAL DEMO, S.L.', 'gestoria fiscal demo sl', 'B80*****99', 'servicios_profesionales', 'ES', true, 'Proveedor DEMO ficticio', NOW(), NOW()),
  ('aaa00001-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'TELEFÓNICA DE ESPAÑA, S.A.U.', 'telefonica de espana sau', 'A28*****75', 'suministros', 'ES', true, 'Proveedor DEMO ficticio', NOW(), NOW()),
  ('aaa00001-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'GAS NATURAL DISTRIBUCIÓN, S.A.', 'gas natural distribucion sa', 'A08*****37', 'suministros', 'ES', true, 'Proveedor DEMO ficticio', NOW(), NOW()),
  ('aaa00001-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'SOCIEDAD GENERAL DE AUTORES Y EDITORES (SGAE)', 'sgae sociedad general autores editores', 'Q28*****04', 'servicios_profesionales', 'ES', true, 'Proveedor DEMO ficticio', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. Ingresos (ventas) DEMO — Octubre 2026 (Q4)
-- IVA hostelería al 10% según normativa española vigente
INSERT INTO income (id, business_id, document_id, date, description, base_amount, vat_rate, vat_amount, total_amount, currency, source, category, fiscal_period_year, fiscal_period_quarter, payment_method, notes, created_at, updated_at) VALUES
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, '2026-10-01', '[DEMO] Ventas barra y terraza - Miércoles', 412.40, 10, 41.24, 453.64, 'EUR', 'manual', 'ventas_hosteleria', 2026, 4, 'efectivo', 'Dato DEMO ficticio', NOW(), NOW()),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, '2026-10-02', '[DEMO] Menú del día + barra - Jueves', 385.90, 10, 38.59, 424.49, 'EUR', 'manual', 'ventas_hosteleria', 2026, 4, 'mixto', 'Dato DEMO ficticio', NOW(), NOW()),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, '2026-10-03', '[DEMO] Ventas viernes noche - eventos', 698.20, 10, 69.82, 768.02, 'EUR', 'manual', 'ventas_hosteleria', 2026, 4, 'tarjeta', 'Dato DEMO ficticio', NOW(), NOW()),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, '2026-10-04', '[DEMO] Sábado comida + cena', 1124.50, 10, 112.45, 1236.95, 'EUR', 'manual', 'ventas_hosteleria', 2026, 4, 'mixto', 'Dato DEMO ficticio', NOW(), NOW()),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, '2026-10-05', '[DEMO] Domingo comida familiar', 876.30, 10, 87.63, 963.93, 'EUR', 'manual', 'ventas_hosteleria', 2026, 4, 'mixto', 'Dato DEMO ficticio', NOW(), NOW()),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, '2026-10-07', '[DEMO] Martes apertura - barra mañana', 198.40, 10, 19.84, 218.24, 'EUR', 'manual', 'ventas_hosteleria', 2026, 4, 'efectivo', 'Dato DEMO ficticio', NOW(), NOW()),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, '2026-10-08', '[DEMO] Menú + barra - Miércoles', 427.60, 10, 42.76, 470.36, 'EUR', 'manual', 'ventas_hosteleria', 2026, 4, 'mixto', 'Dato DEMO ficticio', NOW(), NOW()),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, '2026-10-10', '[DEMO] Viernes noche - terraza', 710.80, 10, 71.08, 781.88, 'EUR', 'manual', 'ventas_hosteleria', 2026, 4, 'tarjeta', 'Dato DEMO ficticio', NOW(), NOW()),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, '2026-10-11', '[DEMO] Sábado - boda reserva privada', 2340.00, 10, 234.00, 2574.00, 'EUR', 'manual', 'ventas_hosteleria', 2026, 4, 'transferencia', 'Dato DEMO ficticio - evento especial', NOW(), NOW()),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, '2026-10-12', '[DEMO] Domingo Fiesta del Pilar', 1050.20, 10, 105.02, 1155.22, 'EUR', 'manual', 'ventas_hosteleria', 2026, 4, 'mixto', 'Dato DEMO ficticio', NOW(), NOW()),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, '2026-10-14', '[DEMO] Martes reanudación semana', 260.10, 10, 26.01, 286.11, 'EUR', 'manual', 'ventas_hosteleria', 2026, 4, 'efectivo', 'Dato DEMO ficticio', NOW(), NOW()),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, '2026-10-15', '[DEMO] Menú diario + barra', 398.70, 10, 39.87, 438.57, 'EUR', 'manual', 'ventas_hosteleria', 2026, 4, 'mixto', 'Dato DEMO ficticio', NOW(), NOW()),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, '2026-10-17', '[DEMO] Viernes - aperitivos y cenas', 640.50, 10, 64.05, 704.55, 'EUR', 'manual', 'ventas_hosteleria', 2026, 4, 'tarjeta', 'Dato DEMO ficticio', NOW(), NOW()),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, '2026-10-18', '[DEMO] Sábado - lleno en sala', 1185.90, 10, 118.59, 1304.49, 'EUR', 'manual', 'ventas_hosteleria', 2026, 4, 'mixto', 'Dato DEMO ficticio', NOW(), NOW()),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, '2026-10-19', '[DEMO] Domingo comida', 820.40, 10, 82.04, 902.44, 'EUR', 'manual', 'ventas_hosteleria', 2026, 4, 'mixto', 'Dato DEMO ficticio', NOW(), NOW()),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, '2026-10-22', '[DEMO] Menú + barra miércoles', 341.20, 10, 34.12, 375.32, 'EUR', 'manual', 'ventas_hosteleria', 2026, 4, 'efectivo', 'Dato DEMO ficticio', NOW(), NOW()),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, '2026-10-24', '[DEMO] Viernes - terraza con música', 895.60, 10, 89.56, 985.16, 'EUR', 'manual', 'ventas_hosteleria', 2026, 4, 'mixto', 'Dato DEMO ficticio', NOW(), NOW()),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, '2026-10-25', '[DEMO] Sábado plenísimo', 1380.00, 10, 138.00, 1518.00, 'EUR', 'manual', 'ventas_hosteleria', 2026, 4, 'mixto', 'Dato DEMO ficticio', NOW(), NOW()),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, '2026-10-26', '[DEMO] Domingo almuerzo', 760.30, 10, 76.03, 836.33, 'EUR', 'manual', 'ventas_hosteleria', 2026, 4, 'mixto', 'Dato DEMO ficticio', NOW(), NOW()),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, '2026-10-29', '[DEMO] Menú miércoles + catering pequeño', 580.00, 10, 58.00, 638.00, 'EUR', 'manual', 'ventas_hosteleria', 2026, 4, 'transferencia', 'Dato DEMO ficticio', NOW(), NOW()),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, '2026-10-31', '[DEMO] Halloween - noche temática', 1620.00, 10, 162.00, 1782.00, 'EUR', 'manual', 'ventas_hosteleria', 2026, 4, 'mixto', 'Dato DEMO ficticio - evento especial', NOW(), NOW());

-- 4. Gastos DEMO — Octubre 2026 (Q4)
-- IVA general al 21% y reducido al 10% según categoría
INSERT INTO expenses (id, business_id, document_id, supplier_id, date, description, base_amount, vat_rate, vat_amount, total_amount, currency, category, subcategory, deductibility_status, validation_status, is_manually_entered, fiscal_period_year, fiscal_period_quarter, notes, created_at, updated_at) VALUES
-- Makro - Alimentación
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, 'aaa00001-0000-0000-0000-000000000001', '2026-10-02', '[DEMO] Makro - Pedido semanal bebidas y alimentos', 1240.50, 21, 260.51, 1501.01, 'EUR', 'alimentacion', 'bebidas', 'DEDUCTIBLE', 'VALIDATED', true, 2026, 4, 'Dato DEMO ficticio', NOW(), NOW()),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, 'aaa00001-0000-0000-0000-000000000001', '2026-10-09', '[DEMO] Makro - Reposición semanal frescos', 890.20, 10, 89.02, 979.22, 'EUR', 'alimentacion', 'frescos', 'DEDUCTIBLE', 'VALIDATED', true, 2026, 4, 'Dato DEMO ficticio', NOW(), NOW()),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, 'aaa00001-0000-0000-0000-000000000001', '2026-10-16', '[DEMO] Makro - Pedido quincenal', 1080.00, 21, 226.80, 1306.80, 'EUR', 'alimentacion', 'bebidas', 'DEDUCTIBLE', 'VALIDATED', true, 2026, 4, 'Dato DEMO ficticio', NOW(), NOW()),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, 'aaa00001-0000-0000-0000-000000000001', '2026-10-23', '[DEMO] Makro - Reposición cerveza y refrescos', 760.40, 21, 159.68, 920.08, 'EUR', 'alimentacion', 'bebidas', 'DEDUCTIBLE', 'VALIDATED', true, 2026, 4, 'Dato DEMO ficticio', NOW(), NOW()),
-- Cafés Baqué
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, 'aaa00001-0000-0000-0000-000000000002', '2026-10-03', '[DEMO] Cafés Baqué - Café molido mensual', 180.00, 21, 37.80, 217.80, 'EUR', 'alimentacion', 'cafe', 'DEDUCTIBLE', 'VALIDATED', true, 2026, 4, 'Dato DEMO ficticio', NOW(), NOW()),
-- Mahou-San Miguel
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, 'aaa00001-0000-0000-0000-000000000003', '2026-10-06', '[DEMO] Mahou San Miguel - Barril cerveza x 6', 312.00, 21, 65.52, 377.52, 'EUR', 'alimentacion', 'bebidas', 'DEDUCTIBLE', 'VALIDATED', true, 2026, 4, 'Dato DEMO ficticio', NOW(), NOW()),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, 'aaa00001-0000-0000-0000-000000000003', '2026-10-20', '[DEMO] Mahou San Miguel - Reposición barril', 286.00, 21, 60.06, 346.06, 'EUR', 'alimentacion', 'bebidas', 'DEDUCTIBLE', 'VALIDATED', true, 2026, 4, 'Dato DEMO ficticio', NOW(), NOW()),
-- Eurosupply Limpieza
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, 'aaa00001-0000-0000-0000-000000000004', '2026-10-01', '[DEMO] Eurosupply - Productos limpieza octubre', 145.60, 21, 30.58, 176.18, 'EUR', 'limpieza', 'productos', 'DEDUCTIBLE', 'VALIDATED', true, 2026, 4, 'Dato DEMO ficticio', NOW(), NOW()),
-- Gestoría Fiscal DEMO
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, 'aaa00001-0000-0000-0000-000000000005', '2026-10-05', '[DEMO] Gestoría Fiscal DEMO - Honorarios octubre', 350.00, 21, 73.50, 423.50, 'EUR', 'servicios_profesionales', 'asesoria', 'DEDUCTIBLE', 'VALIDATED', true, 2026, 4, 'Dato DEMO ficticio', NOW(), NOW()),
-- Telefónica
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, 'aaa00001-0000-0000-0000-000000000006', '2026-10-08', '[DEMO] Telefónica - Fibra + línea octubre', 62.40, 21, 13.10, 75.50, 'EUR', 'suministros', 'telecomunicaciones', 'DEDUCTIBLE', 'VALIDATED', true, 2026, 4, 'Dato DEMO ficticio', NOW(), NOW()),
-- Gas Natural
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, 'aaa00001-0000-0000-0000-000000000007', '2026-10-10', '[DEMO] Gas Natural - Gas cocina octubre', 198.30, 21, 41.64, 239.94, 'EUR', 'suministros', 'gas', 'DEDUCTIBLE', 'VALIDATED', true, 2026, 4, 'Dato DEMO ficticio', NOW(), NOW()),
-- SGAE
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, 'aaa00001-0000-0000-0000-000000000008', '2026-10-15', '[DEMO] SGAE - Canon música ambiente Q4', 48.00, 21, 10.08, 58.08, 'EUR', 'servicios_profesionales', 'canon_sgae', 'DEDUCTIBLE', 'VALIDATED', true, 2026, 4, 'Dato DEMO ficticio', NOW(), NOW()),
-- Material oficina - pendiente revisión
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, NULL, '2026-10-14', '[DEMO] Material oficina y papel TPV', 42.50, 21, 8.93, 51.43, 'EUR', 'material_oficina', 'consumibles', 'PENDING', 'PENDING', true, 2026, 4, 'Dato DEMO ficticio - pendiente de revisión', NOW(), NOW());

-- =============================================================================
-- RESUMEN DE DATOS INYECTADOS
-- =============================================================================
-- Negocio: La Corrala Escondida (id: 00000000-0000-0000-0000-000000000001)
-- Proveedores: 8 ficticios
-- Ingresos (ventas): 21 registros (octubre 2026)
--   → Base total: 17.107,00 € | IVA repercutido: 1.710,70 € | Total: 18.817,70 €
-- Gastos: 13 registros (octubre 2026)
--   → Base total: 5.595,90 € | IVA soportado: 1.077,22 € | Total: 6.673,12 €
-- Liquidación Modelo 303 estimada (oct):
--   → IVA repercutido: 1.710,70 € - IVA soportado deducible: 1.077,22 € = A INGRESAR: 633,48 €
-- =============================================================================
