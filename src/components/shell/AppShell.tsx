import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { GlobalSearch } from './GlobalSearch';
import { Employee } from '../../types';

export interface AppShellProps {
  activeNav?: string;
  activeRoute?: string;
  currentRoute?: string;
  onSelectNav?: (id: string) => void;
  onNavigate?: (id: string, params?: Record<string, string>, replace?: boolean) => void;
  onSelectEmployee?: (emp: Employee) => void;
  onOpenAiAssistant?: () => void;
  onOpenCopilot?: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeNav,
  activeRoute,
  currentRoute,
  onSelectNav,
  onNavigate,
  onSelectEmployee,
  onOpenAiAssistant,
  onOpenCopilot,
  children,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const currentNav = activeNav || activeRoute || currentRoute || 'dashboard';
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
          currentNav={currentNav}
        />

        {/* Dynamic Main Workspace Canvas */}
        <main id="joy-main-scroll-container" data-testid="joy-main-scroll-container" className="flex-1 overflow-y-auto overscroll-y-contain p-4 sm:p-5 lg:px-6 lg:py-6">
          <div className="max-w-[1440px] mx-auto space-y-6">{children}</div>
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
