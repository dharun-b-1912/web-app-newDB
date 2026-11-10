// src/features/onboarding/OnboardingView.tsx
// ============================================================
// Joy PeopleHR Enterprise — Onboarding Engine & Statutory Automation
// Multi-stage candidate onboarding, KYC, EPFO Form 11, Nominees & Forms
// ============================================================

import React, { useState } from 'react';
import { Breadcrumb } from '../../components/shell/Breadcrumb';
import { DivyaManpowerOnboardingTab } from './components/DivyaManpowerOnboardingTab';
import { EmployeeCreateWizardModal } from '../people/EmployeeCreateWizardModal';
import { BulkEmployeeImportModal } from '../people/bulk/BulkEmployeeImportModal';

export const OnboardingView: React.FC = () => {
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumb items={[{ label: 'People & Core HR' }, { label: 'Onboarding Engine 2.0' }]} />

      <DivyaManpowerOnboardingTab
        onInitiateOnboarding={() => setIsCreateWizardOpen(true)}
        onBulkImport={() => setIsBulkImportOpen(true)}
      />

      {/* Employee Creation Wizard Modal */}
      <EmployeeCreateWizardModal
        isOpen={isCreateWizardOpen}
        onClose={() => setIsCreateWizardOpen(false)}
        onCreated={() => {}}
      />

      {/* Bulk Employee Import Pipeline Modal */}
      <BulkEmployeeImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onImportComplete={() => {}}
      />
    </div>
  );
};
