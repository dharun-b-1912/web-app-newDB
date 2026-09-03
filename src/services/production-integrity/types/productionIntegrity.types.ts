// ============================================================
// Joy PeopleHR — Production Data Integrity Types & Contracts
// ============================================================
// Formal classification types for Data Provenance, DataState,
// and 12 Violation Codes (PD-001 through PD-012).
// ============================================================

export type IntegrityViolationCode =
  | 'PD-001' // Mock Data in Production Path
  | 'PD-002' // Hardcoded Business Record
  | 'PD-003' // Fallback Dataset Detected
  | 'PD-004' // API Failure Hidden
  | 'PD-005' // Dashboard Metric Has Unknown Source
  | 'PD-006' // Static Chart Data in Production
  | 'PD-007' // Seed Data Reachable in Production
  | 'PD-008' // Development Fixture Imported by Production
  | 'PD-009' // Duplicate Source of Truth
  | 'PD-010' // Local Storage Acting as Authority
  | 'PD-011' // Randomly Generated Business Metric
  | 'PD-012'; // Simulated Timestamp Used as Production Record

export type ViolationSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface DataIntegrityViolation {
  violationId: string;
  code: IntegrityViolationCode;
  title: string;
  severity: ViolationSeverity;
  filePath: string;
  lineNumber?: number;
  currentBehavior: string;
  dangerExplanation: string;
  authoritativeSourceRequired: string;
  remediationStatus: 'REMEDIATED' | 'BLOCKED_PENDING_BACKEND' | 'UNDER_INVESTIGATION';
  remediationSummary?: string;
  detectedAt: string;
}

export type DataOriginClassification =
  | 'REAL_PERSISTED_DATABASE'
  | 'AUTHENTICATED_API'
  | 'VERIFIED_CALCULATION'
  | 'SAFE_SYSTEM_CONSTANT'
  | 'SAFE_STATIC_UI_METADATA'
  | 'BUSINESS_RULE_CONFIG'
  | 'DEV_TEST_FIXTURE_ISOLATED'
  | 'MOCK_DATA_PROHIBITED'
  | 'UNVERIFIED_SOURCE';

export interface DataOriginRecord {
  moduleId: string;
  moduleName: string;
  featureDomain: string;
  uiComponentPath: string;
  serviceMethod: string;
  authoritativeTableOrEndpoint: string;
  classification: DataOriginClassification;
  isCompliant: boolean;
  notes: string;
}

export type ProductionDataState<T> =
  | { status: 'LOADING'; data: null; error: null }
  | { status: 'SUCCESS'; data: T; error: null; retrievedAt: string; source: string }
  | { status: 'EMPTY'; data: T; error: null; message: string }
  | { status: 'ERROR'; data: null; error: { code: string; message: string; refId?: string } }
  | { status: 'UNAVAILABLE'; data: null; message: string };

export interface ProductionIntegrityScoreCard {
  integrityScore: number; // 0 to 100
  totalFilesScanned: number;
  productionPathsVerified: number;
  apiChainsVerified: number;
  criticalViolationsCount: number;
  highViolationsCount: number;
  mediumViolationsCount: number;
  lowViolationsCount: number;
  activeViolationsList: DataIntegrityViolation[];
  scannedAt: string;
  isProductionCertified: boolean;
}
