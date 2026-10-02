import { describe, it, expect } from 'vitest';
import { validateNif, normalizeNif, maskNif, getNifType } from '../validators/NifValidator.js';

describe('NifValidator - validacion determinista NIF/CIF/NIE', () => {
  it('normaliza guiones, espacios y minusculas', () => {
    expect(normalizeNif('b-84920194')).toBe('B84920194');
    expect(normalizeNif(' x 1234567 l ')).toBe('X1234567L');
  });

  it('clasifica tipos DNI / NIE / CIF', () => {
    expect(getNifType('12345678Z')).toBe('DNI');
    expect(getNifType('X1234567L')).toBe('NIE');
    expect(getNifType('B84920194')).toBe('CIF');
    expect(getNifType('XYZ')).toBe('UNKNOWN');
  });

  it('acepta DNI valido y rechaza letra incorrecta', () => {
    expect(validateNif('12345678Z').valid).toBe(true);
    const bad = validateNif('12345678A');
    expect(bad.valid).toBe(false);
    expect(bad.code).toBe('INVALID_NIF_CHECKSUM');
  });

  it('acepta NIE valido y rechaza letra incorrecta', () => {
    expect(validateNif('X1234567L').valid).toBe(true);
    expect(validateNif('X1234567A').valid).toBe(false);
  });

  it('acepta CIF con checksum correcto y rechaza el NIF del benchmark con control erroneo', () => {
    expect(validateNif('B84920198').valid).toBe(true);
    expect(validateNif('B84920194').valid).toBe(false);
    expect(validateNif('B84920194').code).toBe('INVALID_NIF_CHECKSUM');
    expect(validateNif('B849201994').valid).toBe(false);
  });

  it('acepta CIF A28045615 y rechaza A28045612 del benchmark', () => {
    expect(validateNif('A28045615').valid).toBe(true);
    expect(validateNif('A28045612').valid).toBe(false);
  });

  it('rechaza CIF con digito de control erroneo', () => {
    expect(validateNif('B84920199').valid).toBe(false);
  });

  it('detecta NIF ausente', () => {
    expect(validateNif('-').code).toBe('MISSING_NIF');
    expect(validateNif('').valid).toBe(false);
  });

  it('permite NIF ficticio solo en DEMO', () => {
    expect(validateNif('B00000001', { allowDemo: true }).valid).toBe(true);
    expect(validateNif('B00000001', { allowDemo: false }).code).toBe('DEMO_NIF_IN_PROD');
    expect(validateNif('00000001X', { allowDemo: true }).valid).toBe(true);
  });

  it('enmascara NIF para suppliers.tax_id_masked', () => {
    expect(maskNif('B84920194')).toBe('B****0194');
    expect(maskNif('-')).toBe('-');
  });
});
