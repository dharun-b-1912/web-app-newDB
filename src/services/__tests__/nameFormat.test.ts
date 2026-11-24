import { describe, it, expect } from 'vitest';
import { formatEmployeeName } from '../../utils/nameFormat';

describe('formatEmployeeName universal name sanitization', () => {
  it('strips dot last names and displays single names cleanly', () => {
    expect(formatEmployeeName({ first_name: 'BASUDED', last_name: '.', display_name: 'BASUDED' })).toBe('BASUDED');
    expect(formatEmployeeName({ first_name: 'PAVITHRA', last_name: '.' })).toBe('PAVITHRA');
    expect(formatEmployeeName({ first_name: 'DHANUSH', last_name: '-' })).toBe('DHANUSH');
    expect(formatEmployeeName({ first_name: 'VAISHNAVI', last_name: 'N/A' })).toBe('VAISHNAVI');
  });

  it('preserves real full names with legitimate surnames', () => {
    expect(formatEmployeeName({ first_name: 'SANTHOSH', last_name: 'KUMAR', display_name: 'SANTHOSH KUMAR' })).toBe('SANTHOSH KUMAR');
    expect(formatEmployeeName({ first_name: 'NANDHA', last_name: 'BALAN', display_name: 'NANDHA BALAN' })).toBe('NANDHA BALAN');
  });

  it('cleans trailing dots from string names', () => {
    expect(formatEmployeeName('BASUDED .')).toBe('BASUDED');
    expect(formatEmployeeName('MAANICKAVAASAGAM .')).toBe('MAANICKAVAASAGAM');
    expect(formatEmployeeName('KALIDAS .')).toBe('KALIDAS');
  });

  it('handles null or empty employee cleanly without errors', () => {
    expect(formatEmployeeName(null)).toBe('Employee');
    expect(formatEmployeeName(undefined)).toBe('Employee');
    expect(formatEmployeeName({})).toBe('Employee');
  });
});
