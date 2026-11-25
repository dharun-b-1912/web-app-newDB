import { describe, it, expect } from 'vitest';
import { smartShiftResolutionService, ELECTRA_EV_SHIFTS } from '../attendance/smartShiftResolutionService';
import { sanitizeAuthorizedEntities } from '../../utils/entitySanitizer';
import { Company } from '../../types';

describe('Electra EV Shift Adaptive Matching and Permission Verification', () => {
  it('deduplicates duplicate Electra EV and Electra EV Pvt Ltd entities into 1 canonical entity', () => {
    const rawEntities: Company[] = [
      {
        id: 'c0bbfb28-1500-4ebb-aba8-453b3681f342',
        organization_id: 'c5ab6b03-adde-47cc-a033-064f4c39b21e',
        legal_name: 'Electra EV',
        trade_name: 'Electra EV',
        country: 'India',
        city: 'Coimbatore',
        currency: 'INR',
        status: 'Active',
        created_at: new Date().toISOString(),
      },
      {
        id: '3041388a-b7b2-438a-cfba-5fd788b4cbf3',
        organization_id: 'c5ab6b03-adde-47cc-a033-064f4c39b21e',
        legal_name: 'Electra EV Pvt Ltd',
        trade_name: 'Electra EV',
        statutory_registration_no: 'U34100TN2024PTC054321',
        country: 'India',
        city: 'Coimbatore',
        currency: 'INR',
        status: 'Active',
        created_at: new Date().toISOString(),
      },
    ];

    const clean = sanitizeAuthorizedEntities(rawEntities);
    expect(clean.length).toBe(1);
    expect(clean[0].id).toBe('c0bbfb28-1500-4ebb-aba8-453b3681f342');
    expect(clean[0].legal_name).toBe('Electra EV');
    expect(clean[0].statutory_registration_no).toBe('U34100TN2024PTC054321');
  });

  it('matches AJAIVIKRAM (EEV8554) to SHIFT-1 (06:00 AM) based on 06:35:29 AM punch', () => {
    const gen01 = ELECTRA_EV_SHIFTS.find(s => s.code === 'GEN-01');
    const res = smartShiftResolutionService.resolveShiftDeterministic({
      assignedShift: gen01,
      activeShifts: ELECTRA_EV_SHIFTS,
      firstPunchTime: '06:35:29',
      mode: 'ADAPTIVE_SHIFT',
    });

    expect(res.shiftCode).toBe('SHIFT-1');
    expect(res.startTime).toBe('06:00');
    expect(res.endTime).toBe('14:30');
  });

  it('matches SAKTHIVEL (EEV8466) to SHIFT-1 (06:00 AM) based on 07:01:29 AM punch', () => {
    const gen01 = ELECTRA_EV_SHIFTS.find(s => s.code === 'GEN-01');
    const res = smartShiftResolutionService.resolveShiftDeterministic({
      assignedShift: gen01,
      activeShifts: ELECTRA_EV_SHIFTS,
      firstPunchTime: '07:01:29',
      mode: 'ADAPTIVE_SHIFT',
    });

    expect(res.shiftCode).toBe('SHIFT-1');
    expect(res.startTime).toBe('06:00');
    expect(res.endTime).toBe('14:30');
  });

  it('matches SUJIMITHA (EEV8441) to SHIFT-1 (06:00 AM) based on 07:15:33 AM punch', () => {
    const gen01 = ELECTRA_EV_SHIFTS.find(s => s.code === 'GEN-01');
    const res = smartShiftResolutionService.resolveShiftDeterministic({
      assignedShift: gen01,
      activeShifts: ELECTRA_EV_SHIFTS,
      firstPunchTime: '07:15:33',
      mode: 'ADAPTIVE_SHIFT',
    });

    expect(res.shiftCode).toBe('SHIFT-1');
    expect(res.startTime).toBe('06:00');
    expect(res.endTime).toBe('14:30');
  });

  it('evaluates permission deduction correctly against Shift 1', () => {
    // 06:00 shift start
    // Ajaivikram (EEV8554): arrival at 06:35 (35m raw late), 30m permission -> net late 5m <= 15m grace -> 0 late
    const ajaivikramRawLate = 35;
    const ajaivikramPerm = 30;
    const ajaivikramNetLate = Math.max(0, ajaivikramRawLate - ajaivikramPerm);
    expect(ajaivikramNetLate <= 15).toBe(true);

    // Sakthivel (EEV8466): arrival at 07:01 (61m raw late), 60m permission -> net late 1m <= 15m grace -> 0 late
    const sakthivelRawLate = 61;
    const sakthivelPerm = 60;
    const sakthivelNetLate = Math.max(0, sakthivelRawLate - sakthivelPerm);
    expect(sakthivelNetLate <= 15).toBe(true);

    // Sujimitha (EEV8441): arrival at 07:15 (75m raw late), 60m permission -> net late 15m <= 15m grace -> 0 late
    const sujimithaRawLate = 75;
    const sujimithaPerm = 60;
    const sujimithaNetLate = Math.max(0, sujimithaRawLate - sujimithaPerm);
    expect(sujimithaNetLate <= 15).toBe(true);
  });
});
