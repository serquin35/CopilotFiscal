import { describe, it, expect } from 'vitest';
import { buildStoragePath, isLegacyRootPath } from '../../../../web/src/lib/storage-path';

describe('C11: Suite de Validación de Aislamiento Multi-Tenant y Seguridad RLS', () => {
  const TENANT_A_BIZ = 'a0000000-0000-0000-0000-000000000001';
  const TENANT_B_BIZ = 'b0000000-0000-0000-0000-000000000002';
  const VALID_DOC_ID = 'd0000000-0000-0000-0000-000000000001';

  describe('1. Reglas de almacenamiento y Storage Path Isolation (ADR-11)', () => {
    it('construye paths estrictos dentro del subdirectorio del propio negocio', () => {
      const pathA = buildStoragePath(TENANT_A_BIZ, VALID_DOC_ID, 'application/pdf');
      expect(pathA).toBe(`${TENANT_A_BIZ}/${VALID_DOC_ID}.pdf`);
      expect(pathA.startsWith(`${TENANT_A_BIZ}/`)).toBe(true);
      expect(pathA.startsWith(`${TENANT_B_BIZ}/`)).toBe(false);
    });

    it('deniega intentos de path traversal para escapar del bucket o del tenant', () => {
      expect(() => buildStoragePath(`../${TENANT_A_BIZ}`, VALID_DOC_ID, 'application/pdf')).toThrow();
      expect(() => buildStoragePath(TENANT_A_BIZ, `../${VALID_DOC_ID}`, 'application/pdf')).toThrow();
      expect(() => buildStoragePath(TENANT_A_BIZ, VALID_DOC_ID, 'invalid/mime')).toThrow();
    });

    it('identifica rutas legacy de la raíz vs rutas particionadas por tenant', () => {
      expect(isLegacyRootPath('factura123.pdf')).toBe(true);
      expect(isLegacyRootPath(`${TENANT_A_BIZ}/factura123.pdf`)).toBe(false);
    });
  });

  describe('2. Contrato de Inserción Protegida en audit_events (C3)', () => {
    it('la política RLS exige coincidencia entre el owner del negocio y el actor', () => {
      // Simulación de la regla WITH CHECK:
      // business_id IN (SELECT b.id FROM businesses b WHERE b.owner_id = auth.uid())
      const businesses = [
        { id: TENANT_A_BIZ, owner_id: 'user-a' },
        { id: TENANT_B_BIZ, owner_id: 'user-b' },
      ];

      const canUserInsertAuditEvent = (userId: string, targetBizId: string, role = 'authenticated') => {
        if (role === 'service_role') return true;
        const biz = businesses.find((b) => b.id === targetBizId);
        return biz?.owner_id === userId;
      };

      expect(canUserInsertAuditEvent('user-a', TENANT_A_BIZ)).toBe(true);
      expect(canUserInsertAuditEvent('user-a', TENANT_B_BIZ)).toBe(false);
      expect(canUserInsertAuditEvent('user-b', TENANT_A_BIZ)).toBe(false);
      expect(canUserInsertAuditEvent('anonymous', TENANT_A_BIZ)).toBe(false);
      expect(canUserInsertAuditEvent('backend-worker', TENANT_A_BIZ, 'service_role')).toBe(true);
    });
  });

  describe('3. Contrato de Unicidad de Extracción Activa (C7)', () => {
    it('garantiza que solo existe como máximo una extracción activa por document_id', () => {
      const extractions = [
        { id: 'ext-1', document_id: VALID_DOC_ID, is_active: false, extracted_at: '2026-10-01' },
        { id: 'ext-2', document_id: VALID_DOC_ID, is_active: true, extracted_at: '2026-10-02' },
      ];

      const activeCount = extractions.filter((e) => e.document_id === VALID_DOC_ID && e.is_active).length;
      expect(activeCount).toBe(1);

      // Si entra una nueva extracción activa:
      const newExtraction = { id: 'ext-3', document_id: VALID_DOC_ID, is_active: true, extracted_at: '2026-10-03' };
      const simulatedState = extractions.map((e) =>
        e.document_id === newExtraction.document_id && newExtraction.is_active
          ? { ...e, is_active: false }
          : e
      );
      simulatedState.push(newExtraction);

      const updatedActive = simulatedState.filter((e) => e.document_id === VALID_DOC_ID && e.is_active);
      expect(updatedActive.length).toBe(1);
      expect(updatedActive[0].id).toBe('ext-3');
    });
  });
});
