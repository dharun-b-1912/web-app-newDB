// src/services/biometric/firmware/firmwareVersionComparator.ts
// ============================================================================
// Joy PeopleHR — Gate B12: Semantic Firmware Version Comparator
// ============================================================================

export class FirmwareVersionComparator {
  /**
   * Compares two semantic version strings (e.g. "v3.4.1" vs "3.4.0").
   * Returns:
   *   1  if v1 > v2
   *  -1  if v1 < v2
   *   0  if v1 === v2
   */
  static compare(v1: string, v2: string): number {
    const clean1 = (v1 || '').trim().replace(/^v/i, '');
    const clean2 = (v2 || '').trim().replace(/^v/i, '');

    if (!clean1 && !clean2) return 0;
    if (!clean1) return -1;
    if (!clean2) return 1;

    const parts1 = clean1.split('.').map((p) => parseInt(p, 10) || 0);
    const parts2 = clean2.split('.').map((p) => parseInt(p, 10) || 0);

    const maxLength = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < maxLength; i++) {
      const num1 = parts1[i] || 0;
      const num2 = parts2[i] || 0;

      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }

    return 0;
  }

  static isGte(v1: string, v2: string): boolean {
    return this.compare(v1, v2) >= 0;
  }

  static isLt(v1: string, v2: string): boolean {
    return this.compare(v1, v2) < 0;
  }
}
