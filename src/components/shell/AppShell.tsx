import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { GlobalSearch } from './GlobalSearch';
import { Employee } from '../../types';

export interface AppShellProps {
  activeNav?: string;
  activeRoute?: string;
  onSelectNav?: (id: string) => void;
  onNavigate?: (id: string) => void;
  onSelectEmployee?: (emp: Employee) => void;
  onOpenAiAssistant?: () => void;
  onOpenCopilot?: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeNav,
  activeRoute,
  onSelectNav,
  onNavigate,
  onSelectEmployee,
  onOpenAiAssistant,
  onOpenCopilot,
  children,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const currentNav = activeNav || activeRoute || 'dashboard';
  const handleSelectNav = (id: string) => {
    if (onSelectNav) onSelectNav(id);
    else if (onNavigate) onNavigate(id);
  };
  const handleOpenAi = onOpenAiAssistant || onOpenCopilot;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F8F9FA]">
      {/* Sidebar Navigation */}
      <Sidebar activeNav={currentNav} onSelectNav={handleSelectNav} />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar Header */}
        <Topbar
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenAiAssistant={handleOpenAi}
        />

        {/* Dynamic Main Workspace Canvas */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>

      {/* Global Cmd+K Search Overlay */}
      <GlobalSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectEmployee={emp => {
          if (onSelectEmployee) onSelectEmployee(emp);
          handleSelectNav('people');
        }}
        onNavigate={route => handleSelectNav(route)}
      />
    </div>
  );
};
