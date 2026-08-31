import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { runAllSecurityAuditTests } from './services/__tests__/securityAuditSuite.test';

// Expose security audit runner for dev inspection
if (typeof window !== 'undefined') {
  (window as any).__runSecurityAudit = runAllSecurityAuditTests;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
