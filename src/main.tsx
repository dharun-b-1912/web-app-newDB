import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { runAllSecurityAuditTests } from './services/__tests__/securityAuditSuite.test';
import { ObservabilitySecurityCertificationSuite } from './services/__tests__/observabilitySecurityCertification.test';
import { Phase45ProductionRealityCertificationSuite } from './services/__tests__/phase45ProductionRealityCertification.test';
import { Phase5PredictiveReliabilityCertificationSuite } from './services/__tests__/phase5PredictiveReliabilityCertification.test';
import { ProductionIntegrityCertificationSuite } from './services/production-integrity/tests/productionIntegrityCertification.test';
import { Phase6PredictionTrustCertificationSuite } from './services/__tests__/phase6PredictionTrustCertification.test';
import { Phase7ReleaseIntelligenceCertificationSuite } from './services/__tests__/phase7ReleaseIntelligenceCertification.test';
import { Phase8ProductionRealityCertificationSuite } from './services/__tests__/phase8ProductionRealityCertification.test';
import { MultiTenantBiometricCertificationSuite } from './services/__tests__/multiTenantBiometricCertification.test';
import { runEnterpriseResilienceCertification } from './services/__tests__/enterpriseResilienceCertification.test';
import { runBiometricV3EnterpriseCertification } from './services/__tests__/biometricV3EnterpriseCertification.test';
import { runBiometricV4EnterpriseCertification } from './services/__tests__/biometricV4EnterpriseCertification.test';
import { runBiometricV5EnterpriseCertification } from './services/__tests__/biometricV5EnterpriseCertification.test';
import { GlobalErrorInterceptor } from './services/observability/globalErrorInterceptor';

// Initialize zero-leakage global observability interceptor
GlobalErrorInterceptor.initialize();

// Expose security audit runners for dev inspection
if (typeof window !== 'undefined') {
  (window as any).__runSecurityAudit = runAllSecurityAuditTests;
  (window as any).__run12GateSecurityCertification = ObservabilitySecurityCertificationSuite.runAllGates;
  (window as any).__runPhase45RealityCertification = Phase45ProductionRealityCertificationSuite.runAllGates;
  (window as any).__runPhase5PredictiveCertification = Phase5PredictiveReliabilityCertificationSuite.runAllGates;
  (window as any).__runProductionIntegrityCertification = ProductionIntegrityCertificationSuite.runAllGates;
  (window as any).__runPhase6PredictionTrustCertification = Phase6PredictionTrustCertificationSuite.runAllGates;
  (window as any).__runPhase7ReleaseIntelligenceCertification = Phase7ReleaseIntelligenceCertificationSuite.runAllGates;
  (window as any).__runPhase8ProductionRealityCertification = Phase8ProductionRealityCertificationSuite.runAllGates;
  (window as any).__runMultiTenantBiometricCertification = MultiTenantBiometricCertificationSuite.runAllGates;
  (window as any).__runEnterpriseResilienceCertification = runEnterpriseResilienceCertification;
  (window as any).__runBiometricV3EnterpriseCertification = runBiometricV3EnterpriseCertification;
  (window as any).__runBiometricV4EnterpriseCertification = runBiometricV4EnterpriseCertification;
  (window as any).__runBiometricV5EnterpriseCertification = runBiometricV5EnterpriseCertification;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
