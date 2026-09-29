import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Joy PeopleHR — Vendor Navigation & Domain Architecture Certification', () => {
  it('certifies Sidebar has VENDOR WORKFORCE & FIELD OPS group with all 6 menus directly after Document Vault', () => {
    const sidebarPath = path.resolve(__dirname, '../../components/shell/Sidebar.tsx');
    const content = fs.readFileSync(sidebarPath, 'utf8');

    // Group name check
    expect(content).toContain("groupName: 'VENDOR WORKFORCE & FIELD OPS'");

    // All 6 items after document vault check
    expect(content).toContain("id: 'vendor-workforce', label: 'Workforce Allocation'");
    expect(content).toContain("id: 'vendor-attendance', label: 'Attendance & Ingestion'");
    expect(content).toContain("id: 'vendor-leaderboard', label: 'Performance Analytics'");
    expect(content).toContain("id: 'vendor-assets', label: 'Asset Allocation'");
    expect(content).toContain("id: 'vendor-communication', label: 'Communication Desk'");
    expect(content).toContain("id: 'vendor-reports', label: 'Reports & Audit'");

    // Route active matching checks
    expect(content).toContain("if (itemId === 'vendor-workforce' && (currentNav === 'vendor-workforce' || currentNav === 'vendor/workforce')) return true;");
    expect(content).toContain("if (itemId === 'vendor-attendance' && (currentNav === 'vendor-attendance' || currentNav === 'vendor/attendance')) return true;");
    expect(content).toContain("if (itemId === 'vendor-leaderboard' && (currentNav === 'vendor-leaderboard' || currentNav === 'vendor/leaderboard')) return true;");
    expect(content).toContain("if (itemId === 'vendor-assets' && (currentNav === 'vendor-assets' || currentNav === 'vendor/assets')) return true;");
    expect(content).toContain("if (itemId === 'vendor-communication' && (currentNav === 'vendor-communication' || currentNav === 'vendor/communication')) return true;");
    expect(content).toContain("if (itemId === 'vendor-reports' && (currentNav === 'vendor-reports' || currentNav === 'vendor/reports')) return true;");
  });

  it('certifies VendorPortalWorkspace has two segregated domains with real-time domain switcher and non-overflowing upper tabs', () => {
    const workspacePath = path.resolve(__dirname, '../../features/vendor/VendorPortalWorkspace.tsx');
    const content = fs.readFileSync(workspacePath, 'utf8');

    // Domain separation arrays
    expect(content).toContain('GOVERNANCE_TAB_IDS');
    expect(content).toContain('OPERATIONS_TAB_IDS');
    expect(content).toContain('activeDomain');
    expect(content).toContain('governanceTabs');
    expect(content).toContain('operationsTabs');
    expect(content).toContain('displayedTabs');

    // Segmented domain switcher buttons
    expect(content).toContain('Vendor Governance & Commercials');
    expect(content).toContain('Workforce & Field Operations');
    expect(content).toContain('View All');

    // Breadcrumb updates with domain
    expect(content).toContain("activeDomain === 'OPERATIONS' ? 'Vendor Workforce & Field Ops' : 'Vendor Governance'");

    // Metadata for all tabs including assets
    expect(content).toContain("case 'assets':");
    expect(content).toContain("Asset Allocation & Custody Register");
  });

  it('certifies App.tsx preserves Company HR view for vendor-portal overview while routing all 6 operational tabs', () => {
    const appPath = path.resolve(__dirname, '../../App.tsx');
    const content = fs.readFileSync(appPath, 'utf8');

    // Clean explicit vendor route check
    expect(content).toContain("currentRoute === 'vendor-dashboard'");
    expect(content).not.toContain("currentRoute.startsWith('vendor-portal')");

    // All 6 operation routes routed
    expect(content).toContain("case 'vendor-workforce':");
    expect(content).toContain("case 'vendor-attendance':");
    expect(content).toContain("case 'vendor-leaderboard':");
    expect(content).toContain("case 'vendor-assets':");
    expect(content).toContain("case 'vendor-communication':");
    expect(content).toContain("case 'vendor-reports':");
  });
});
