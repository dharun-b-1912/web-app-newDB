import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { GlobalErrorInterceptor } from './services/observability/globalErrorInterceptor';
import { supabaseProject, supabaseUrl } from './lib/supabase';

// Initialize zero-leakage global observability interceptor
GlobalErrorInterceptor.initialize();

if (typeof window !== 'undefined') {
  console.log(`[WF][SUPABASE][RUNTIME] project=${supabaseProject}`);
}

// Expose security audit runners for dev inspection via dynamic on-demand import
if (typeof window !== 'undefined') {
  (window as any).__runSecurityAudit = async () => {
    const m = await import('./services/__tests__/securityAuditSuite.test');
    return m.runAllSecurityAuditTests();
  };
  (window as any).__run12GateSecurityCertification = async () => {
    const m = await import('./services/__tests__/observabilitySecurityCertification.test');
    return m.ObservabilitySecurityCertificationSuite.runAllGates();
  };
  (window as any).__runPhase45RealityCertification = async () => {
    const m = await import('./services/__tests__/phase45ProductionRealityCertification.test');
    return m.Phase45ProductionRealityCertificationSuite.runAllGates();
  };
  (window as any).__runPhase5PredictiveCertification = async () => {
    const m = await import('./services/__tests__/phase5PredictiveReliabilityCertification.test');
    return m.Phase5PredictiveReliabilityCertificationSuite.runAllGates();
  };
  (window as any).__runProductionIntegrityCertification = async () => {
    const m = await import('./services/production-integrity/tests/productionIntegrityCertification.test');
    return m.ProductionIntegrityCertificationSuite.runAllGates();
  };
  (window as any).__runPhase6PredictionTrustCertification = async () => {
    const m = await import('./services/__tests__/phase6PredictionTrustCertification.test');
    return m.Phase6PredictionTrustCertificationSuite.runAllGates();
  };
  (window as any).__runPhase7ReleaseIntelligenceCertification = async () => {
    const m = await import('./services/__tests__/phase7ReleaseIntelligenceCertification.test');
    return m.Phase7ReleaseIntelligenceCertificationSuite.runAllGates();
  };
  (window as any).__runPhase8ProductionRealityCertification = async () => {
    const m = await import('./services/__tests__/phase8ProductionRealityCertification.test');
    return m.Phase8ProductionRealityCertificationSuite.runAllGates();
  };
  (window as any).__runMultiTenantBiometricCertification = async () => {
    const m = await import('./services/__tests__/multiTenantBiometricCertification.test');
    return m.MultiTenantBiometricCertificationSuite.runAllGates();
  };
  (window as any).__runEnterpriseResilienceCertification = async () => {
    const m = await import('./services/__tests__/enterpriseResilienceCertification.test');
    return m.runEnterpriseResilienceCertification();
  };
  (window as any).__runBiometricV3EnterpriseCertification = async () => {
    const m = await import('./services/__tests__/biometricV3EnterpriseCertification.test');
    return m.runBiometricV3EnterpriseCertification();
  };
  (window as any).__runBiometricV4EnterpriseCertification = async () => {
    const m = await import('./services/__tests__/biometricV4EnterpriseCertification.test');
    return m.runBiometricV4EnterpriseCertification();
  };
  (window as any).__runBiometricV5EnterpriseCertification = async () => {
    const m = await import('./services/__tests__/biometricV5EnterpriseCertification.test');
    return m.runBiometricV5EnterpriseCertification();
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
