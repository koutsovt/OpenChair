import { describe, it, expect } from 'vitest';
import { productNaturalKey, validateCsvRows } from '@/lib/validations/products';

const validRow = {
  brand: 'Wella Professionals',
  name: 'Koleston Perfect',
  shade_code: '7/3',
  category: 'colour',
  unit: 'tube',
};

describe('productNaturalKey', () => {
  it('is case-insensitive on brand and name', () => {
    expect(productNaturalKey('Wella', 'Koleston', '7/3')).toBe(
      productNaturalKey('WELLA', 'koleston', '7/3')
    );
  });

  it('treats null and undefined shade codes as empty', () => {
    expect(productNaturalKey('Wella', 'Koleston', null)).toBe(
      productNaturalKey('Wella', 'Koleston')
    );
  });
});

describe('validateCsvRows', () => {
  const noExisting = new Set<string>();

  it('marks a correct row as valid', () => {
    const [result] = validateCsvRows([validRow], noExisting);
    expect(result).toEqual({ status: 'valid', message: null, existing: false });
  });

  it('marks rows with an invalid category as errors', () => {
    const [result] = validateCsvRows([{ ...validRow, category: 'colur' }], noExisting);
    expect(result.status).toBe('error');
    expect(result.message).toMatch(/category must be one of/i);
  });

  it('marks rows missing a brand as errors', () => {
    const [result] = validateCsvRows([{ ...validRow, brand: '' }], noExisting);
    expect(result.status).toBe('error');
    expect(result.message).toMatch(/brand is required/i);
  });

  it('flags duplicates within the batch with the first row number', () => {
    const results = validateCsvRows([validRow, { ...validRow }], noExisting);
    expect(results[0].status).toBe('valid');
    expect(results[1].status).toBe('error');
    expect(results[1].message).toBe('duplicate of row 2 (same brand + name + shade_code)');
  });

  it('flags rows already in the catalog as existing warnings', () => {
    const existing = new Set([
      productNaturalKey(validRow.brand, validRow.name, validRow.shade_code),
    ]);
    const [result] = validateCsvRows([validRow], existing);
    expect(result).toEqual({ status: 'warning', message: 'already in catalog', existing: true });
  });

  it('warns when a shade code is set for a non-colour category', () => {
    const [result] = validateCsvRows(
      [{ ...validRow, name: 'ANGEL.WASH', category: 'shampoo', unit: 'bottle' }],
      noExisting
    );
    expect(result.status).toBe('warning');
    expect(result.message).toMatch(/shade code is unusual/i);
    expect(result.existing).toBe(false);
  });
});
