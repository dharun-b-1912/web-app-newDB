// ============================================================
// Joy PeopleHR — Mock Data Detector
// ============================================================
// Audits source modules to ensure mock fixtures, dummy data files,
// and development stubs are not imported or referenced in production paths.
// ============================================================

export interface MockAuditTarget {
  filePath: string;
  isProductionPath: boolean;
  importedMockFiles: string[];
  containsMockObjects: boolean;
  violatesIntegrity: boolean;
}

export class MockDataDetector {
  private static prohibitedImportPatterns = [
    '/mocks/',
    '/__mocks__/',
    '/fixtures/',
    'mockData',
    'dummyEmployees',
    'samplePayroll',
    'faker',
    'chance',
  ];

  public static isProductionPath(filePath: string): boolean {
    const normalized = filePath.replace(/\\/g, '/');
    const isTest = normalized.includes('/__tests__/') || normalized.includes('.test.') || normalized.includes('.spec.');
    const isStory = normalized.includes('.stories.');
    const isMockDir = normalized.includes('/mocks/') || normalized.includes('/fixtures/');
    return !isTest && !isStory && !isMockDir;
  }

  public static inspectModuleImports(filePath: string, importStatements: string[]): MockAuditTarget {
    const isProd = this.isProductionPath(filePath);
    const importedMocks: string[] = [];

    for (const imp of importStatements) {
      for (const pattern of this.prohibitedImportPatterns) {
        if (imp.includes(pattern)) {
          importedMocks.push(imp);
          break;
        }
      }
    }

    const violatesIntegrity = isProd && importedMocks.length > 0;

    return {
      filePath,
      isProductionPath: isProd,
      importedMockFiles: importedMocks,
      containsMockObjects: importedMocks.length > 0,
      violatesIntegrity,
    };
  }

  public static assertZeroMockContamination(items: any[]): boolean {
    if (!items || items.length === 0) return true;
    for (const item of items) {
      if (item && typeof item === 'object') {
        if (item.__isMock || item.isMock === true || item._mockId) {
          return false;
        }
      }
    }
    return true;
  }
}
