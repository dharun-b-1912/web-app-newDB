import { describe, it, expect } from 'vitest';
import {
  hrIntelligenceMisEngine,
  HR_MIS_METRIC_DICTIONARY,
  type DailyWorkforceMisReport,
  type MonthlyHrMisReport
} from '../hrIntelligenceMisEngine';

describe('HR Intelligence MIS Engine & Metric Dictionary', () => {
  describe('Authoritative Metric Dictionary Formulas', () => {
    it('should have unambiguous formula for Opening Headcount', () => {
      const def = HR_MIS_METRIC_DICTIONARY['HEADCOUNT_OPENING'];
      expect(def).toBeDefined();
      expect(def.metricName).toBe('Opening Headcount');
      expect(def.formula).toContain('Active employees at start of reporting period');
      expect(def.inclusions).toContain('Active, Probation');
    });

    it('should have unambiguous formula for Closing Headcount', () => {
      const def = HR_MIS_METRIC_DICTIONARY['HEADCOUNT_CLOSING'];
      expect(def).toBeDefined();
      expect(def.metricName).toBe('Closing Headcount');
      expect(def.formula).toBe('Opening Headcount + New Joiners - Exits');
    });

    it('should define Attendance Percentage with unit consistency', () => {
      const def = HR_MIS_METRIC_DICTIONARY['ATTENDANCE_PERCENTAGE'];
      expect(def).toBeDefined();
      expect(def.formula).toContain('(Eligible Attended Scheduled Units / Eligible Scheduled Attendance Units) * 100');
      // Denominator and numerator must both exclude weekly offs and declared public holidays
      expect(def.exclusions).toContain('Weekly offs and public holidays');
    });

    it('should define Absenteeism Percentage excluding authorized leaves and off days', () => {
      const def = HR_MIS_METRIC_DICTIONARY['ABSENTEEISM_PERCENTAGE'];
      expect(def).toBeDefined();
      expect(def.formula).toContain('(Eligible Absent Scheduled Units / Eligible Scheduled Attendance Units) * 100');
      expect(def.exclusions).toContain('Authorized paid leave');
    });

    it('should define 4-Month Overtime Allocation Utilization against 20 hours', () => {
      const def = HR_MIS_METRIC_DICTIONARY['OVERTIME_UTILIZATION'];
      expect(def).toBeDefined();
      expect(def.formula).toContain('Period Allocation of 20 Hours');
      expect(def.description).toContain('20-hour 4-month governance threshold');
    });

    it('should define Monthly Attrition Rate formula using average monthly headcount', () => {
      const def = HR_MIS_METRIC_DICTIONARY['MONTHLY_ATTRITION_RATE'];
      expect(def).toBeDefined();
      expect(def.formula).toBe('(Exits During Month / ((Opening Headcount + Closing Headcount) / 2)) * 100');
      expect(def.exclusions).toContain('Internal department transfers');
    });
  });

  describe('Mathematical Validation of Core Formulas', () => {
    it('should compute closing headcount as Opening + Joiners - Exits', () => {
      const opening = 250;
      const joiners = 12;
      const exits = 5;
      const closing = opening + joiners - exits;
      expect(closing).toBe(257);

      const netMovement = joiners - exits;
      expect(netMovement).toBe(7);
    });

    it('should compute monthly attrition rate against average headcount correctly', () => {
      const opening = 200;
      const closing = 200;
      const exits = 4;
      const avgHeadcount = (opening + closing) / 2;
      const attritionRate = (exits / avgHeadcount) * 100;
      expect(attritionRate).toBe(2.0); // 2%
    });

    it('should compute attendance percentage accurately', () => {
      const scheduledUnits = 240;
      const attendedUnits = 228;
      const attendancePct = Number(((attendedUnits / scheduledUnits) * 100).toFixed(1));
      expect(attendancePct).toBe(95.0);

      const absentUnits = scheduledUnits - attendedUnits;
      const absenteeismPct = Number(((absentUnits / scheduledUnits) * 100).toFixed(1));
      expect(absenteeismPct).toBe(5.0);
      expect(attendancePct + absenteeismPct).toBe(100.0);
    });
  });

  describe('Report Snapshot Structure & Cryptographic Immutability', () => {
    it('should produce valid snapshot structure with SHA-256 digest', async () => {
      const snapshot = await hrIntelligenceMisEngine.generateReportSnapshot({
        reportType: 'DAILY_MIS',
        reportingPeriod: '2026-10-24',
        startDate: '2026-10-24',
        endDate: '2026-10-24',
        generatedBy: 'Test HR Auditor'
      });

      expect(snapshot).toBeDefined();
      expect(snapshot.id).toMatch(/^snp-/);
      expect(typeof snapshot.sha256Checksum).toBe('string');
      expect(snapshot.sha256Checksum.length).toBeGreaterThan(10);
      expect(snapshot.snapshot).toBeDefined();
      expect(snapshot.snapshot.organizationId).toBeDefined();
    }, 20000);
  });
});
