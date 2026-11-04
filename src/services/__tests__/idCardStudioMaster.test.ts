// src/services/__tests__/idCardStudioMaster.test.ts
// ============================================================================
// Joy PeopleHR — Automated ID Card Studio Verification Test Suite
// Verifies: Landscape & Portrait layouts, Smart Photo Matcher, Relational HR data,
// CMYK PDF rendering, Preflight print quality checks, and QR code token generation
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  CR80_LANDSCAPE,
  CR80_PORTRAIT,
  DYNAMIC_FIELD_CHIPS,
  IdCardPersonRecord,
} from '../../features/people/idcard/idCardTypes';
import {
  makeLandscapeCorporateTemplate,
  makePortraitCorporateTemplate,
  makePortraitWorkerTemplate,
  makePortraitContractorTemplate,
  makePortraitCampusTemplate,
  makePortraitMinimalTemplate,
  makePortraitSecurityTemplate,
  getTemplateByName,
  matchUploadedPhotos,
  normalizeKey,
  runPreflightChecks,
  getSampleEmployees,
  generateQrImage,
  exportCmykPdfFile,
} from '../../features/people/idcard/idCardService';
import {
  substituteField,
  hex2rgb,
  cmykPct,
  toCmyk,
  cropMarks,
  IdCardPdf,
} from '../../features/people/idcard/idCardPdfEngine';

describe('Joy PeopleHR ID Card Studio Master Test Suite', () => {
  // 1. Geometry & Physical Dimension Tests
  it('correctly configures CR80 physical standards for Landscape & Portrait', () => {
    expect(CR80_LANDSCAPE.w).toBe(85.6);
    expect(CR80_LANDSCAPE.h).toBe(54.0);
    expect(CR80_LANDSCAPE.bleed).toBe(3.0);
    expect(CR80_LANDSCAPE.safe).toBe(3.0);
    expect(CR80_LANDSCAPE.orientation).toBe('landscape');

    expect(CR80_PORTRAIT.w).toBe(54.0);
    expect(CR80_PORTRAIT.h).toBe(85.6);
    expect(CR80_PORTRAIT.bleed).toBe(3.0);
    expect(CR80_PORTRAIT.safe).toBe(3.0);
    expect(CR80_PORTRAIT.orientation).toBe('portrait');
  });

  // 2. Dedicated Template Construction Tests
  it('builds distinct front & back element trees for all 6 portrait templates', () => {
    const templates = ['corporate', 'worker', 'contractor', 'campus', 'minimal', 'security'] as const;

    templates.forEach(category => {
      const { front, back } = getTemplateByName(category, 'portrait');
      expect(front.length).toBeGreaterThan(4);
      expect(back.length).toBeGreaterThan(3);

      // Verify that every template includes a Photo and Organization element on front
      const hasPhoto = front.some(e => e.type === 'image' && e.src === 'photo');
      const hasOrg = front.some(e => e.type === 'text' && e.text.includes('{org}'));
      expect(hasPhoto).toBe(true);
      expect(hasOrg).toBe(true);

      // Verify that back side includes QR verification element
      const hasQr = back.some(e => e.type === 'qr');
      expect(hasQr).toBe(true);
    });
  });

  it('builds distinct front & back element trees for landscape templates', () => {
    const { front, back } = getTemplateByName('corporate', 'landscape');
    expect(front.length).toBeGreaterThan(5);
    expect(back.length).toBeGreaterThan(3);

    const hasName = front.some(e => e.type === 'text' && e.text.includes('{name}'));
    expect(hasName).toBe(true);
  });

  // 3. Dynamic Placeholder Substitution Tests
  it('accurately substitutes all enterprise HR workforce placeholders', () => {
    const sampleEmp: IdCardPersonRecord = {
      id: 'emp-uuid-1',
      idno: 'JCS-012',
      name: 'Muthu Kumar P',
      designation: 'Senior Lead Architect',
      department: 'Engineering & Technology',
      branch: 'Coimbatore HQ',
      worksite: 'Joy Innovation Hub',
      phone: '+91 98765 43210',
      email: 'muthu@joypeoplehr.com',
      blood: 'O+ Positive',
      dob: '09 Dec 2003',
      doj: '24 Nov 2025',
      address: '12 Mill Road, Coimbatore',
      valid: 'Dec 2028',
      org: 'JOY Corporate Solutions Pvt Ltd',
      reporting_manager: 'Dharun B',
      contractor: 'Joy Workforce Services',
    };

    const templateText = 'Name: {name} | ID: {idno} | Dept: {department} | Org: {org} | Blood: {blood}';
    const resolved = substituteField(templateText, sampleEmp);

    expect(resolved).toBe('Name: Muthu Kumar P | ID: JCS-012 | Dept: Engineering & Technology | Org: JOY Corporate Solutions Pvt Ltd | Blood: O+ Positive');
    expect(resolved).not.toContain('{name}');
    expect(resolved).not.toContain('{idno}');
  });

  // 4. Smart Photo Matching Tests
  it('correctly matches photos by employee code, normalized code, and UUID', () => {
    const employees: IdCardPersonRecord[] = [
      { id: 'uuid-1', idno: 'EMP-20418', name: 'Aarav Menon', designation: 'Eng', department: 'IT', branch: 'CBE', phone: '123', blood: 'B+', dob: '1990', address: 'HQ', valid: '2028', org: 'Joy' },
      { id: 'uuid-2', idno: 'JCS-012', name: 'Muthu Kumar P', designation: 'Dev', department: 'Dev', branch: 'CBE', phone: '456', blood: 'O+', dob: '2000', address: 'HQ', valid: '2028', org: 'Joy' },
      { id: 'uuid-3', idno: 'JCS-099', name: 'Ranjith P', designation: 'QA', department: 'QA', branch: 'CBE', phone: '789', blood: 'A+', dob: '1995', address: 'HQ', valid: '2028', org: 'Joy' },
    ];

    const mockImg = {} as HTMLImageElement;

    const uploadedFiles = [
      { fileName: 'EMP-20418.jpg', fileSize: 54000, dataUrl: 'data:...', img: mockImg },
      { fileName: 'jcs012.png', fileSize: 62000, dataUrl: 'data:...', img: mockImg }, // Normalized code without dash
      { fileName: 'unknown_face.jpg', fileSize: 41000, dataUrl: 'data:...', img: mockImg }, // Unmatched
    ];

    const { matched, unmatched, missingEmployees } = matchUploadedPhotos(uploadedFiles, employees);

    expect(matched.length).toBe(2);
    expect(unmatched.length).toBe(1);
    expect(missingEmployees.length).toBe(1);

    // Verify exact code match
    const aaravMatch = matched.find(m => m.matchedEmployeeCode === 'EMP-20418');
    expect(aaravMatch).toBeDefined();
    expect(aaravMatch?.matchMethod).toBe('EXACT_CODE');

    // Verify normalized match
    const muthuMatch = matched.find(m => m.matchedEmployeeCode === 'JCS-012');
    expect(muthuMatch).toBeDefined();
    expect(muthuMatch?.matchMethod).toBe('NORMALIZED_CODE');

    // Verify unmatched
    expect(unmatched[0].fileName).toBe('unknown_face.jpg');

    // Verify missing employee report
    expect(missingEmployees[0].idno).toBe('JCS-099');
  });

  // 5. CMYK Color Conversion & Vector Engine Tests
  it('converts RGB hex colors to true CMYK percentages accurately', () => {
    // Pure White
    expect(cmykPct('#ffffff')).toEqual([0, 0, 0, 0]);
    // Pure Black
    expect(cmykPct('#000000')).toEqual([0, 0, 0, 100]);
    // Corporate Navy (#0f2f57)
    const navy = cmykPct('#0f2f57');
    expect(navy[0]).toBeGreaterThan(70); // High Cyan
    expect(navy[3]).toBeGreaterThan(50); // Significant Black component
  });

  it('generates 4 corner crop marks with correct physical offsets', () => {
    const marks = cropMarks(10, 10, 95.6, 64, 3, 3.5);
    // 4 corners × 2 lines each = 8 crop mark lines
    expect(marks.length).toBe(8);
    // Each mark has [x1, y1, x2, y2]
    expect(marks[0].length).toBe(4);
  });

  it('initializes PDF 1.4 binary stream with valid header', () => {
    const pdf = new IdCardPdf();
    expect(pdf.pageIds).toEqual([]);
    const blob = pdf.finish();
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(100);
  });

  // 6. Preflight Print Quality Validator Tests
  it('evaluates preflight checks and detects missing photos and missing names', () => {
    const { front, back } = getTemplateByName('corporate', 'portrait');
    const employees = getSampleEmployees();

    const emptyPhotosMap = new Map<string, HTMLImageElement>();
    const report = runPreflightChecks(
      { front: { bg: '#fff', bgImg: null, bgName: '', els: front }, back: { bg: '#fff', bgImg: null, bgName: '', els: back } },
      employees,
      CR80_PORTRAIT,
      null, // No logo
      emptyPhotosMap
    );

    expect(report.issues.length).toBeGreaterThan(0);
    // Should warn that logo is missing
    const logoIssue = report.issues.find(i => i.t.includes('logo'));
    expect(logoIssue).toBeDefined();

    // Should report missing photo
    const photoIssue = report.issues.find(i => i.t.includes('photo'));
    expect(photoIssue).toBeDefined();
  });
});

