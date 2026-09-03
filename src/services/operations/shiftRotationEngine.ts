// src/services/operations/shiftRotationEngine.ts
// ============================================================================
// Joy PeopleHR — Engine 2: Multi-Week Shift Rotation & Roster Pattern Engine
// ============================================================================

import { supabase } from '../../lib/supabase';

export interface ShiftRotationPattern {
  id?: string;
  organization_id: string;
  name: string;
  description?: string;
  cycle_weeks: number; // e.g. 4
  rotation_type: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM';
  pattern_schedule: {
    week_number: number; // 1, 2, 3, 4
    shift_id: string;
    shift_name: string;
    start_time: string;
    end_time: string;
  }[];
  is_active: boolean;
}

export interface ShiftResolutionResult {
  shiftId: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  weekInCycle: number;
  rotationName: string;
}

class ShiftRotationEngine {
  /**
   * Resolves the exact shift for any given employee on any given date
   * based on their multi-week rotation pattern
   */
  async resolveShiftForDate(
    employeeId: string,
    targetDate: Date,
    orgId: string
  ): Promise<ShiftResolutionResult | null> {
    try {
      // 1. Check for explicit shift rotation assignment
      const targetDateStr = targetDate.toISOString().split('T')[0];
      const { data: assignment } = await supabase
        .from('shift_rotation_assignments')
        .select('*, pattern:shift_rotation_patterns(*)')
        .eq('organization_id', orgId)
        .eq('target_id', employeeId)
        .eq('status', 'ACTIVE')
        .lte('effective_from', targetDateStr)
        .maybeSingle();

      if (!assignment || !assignment.pattern) {
        return null;
      }

      const pattern = assignment.pattern as ShiftRotationPattern;
      const effectiveFrom = new Date(assignment.effective_from);
      
      // 2. Calculate week index in cycle
      const diffMs = targetDate.getTime() - effectiveFrom.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffWeeks = Math.floor(diffDays / 7);

      const cycleWeeks = pattern.cycle_weeks || 4;
      const startWeek = assignment.cycle_start_week || 1;
      
      // Compute 1-indexed week in cycle: 1 to cycleWeeks
      const weekInCycle = (((diffWeeks + (startWeek - 1)) % cycleWeeks) + cycleWeeks) % cycleWeeks + 1;

      // 3. Match week in schedule
      const matchedSchedule = pattern.pattern_schedule.find((s) => s.week_number === weekInCycle) || pattern.pattern_schedule[0];

      if (!matchedSchedule) return null;

      return {
        shiftId: matchedSchedule.shift_id,
        shiftName: matchedSchedule.shift_name,
        startTime: matchedSchedule.start_time,
        endTime: matchedSchedule.end_time,
        weekInCycle: weekInCycle,
        rotationName: pattern.name,
      };
    } catch (err) {
      console.error('[ShiftRotationEngine] Resolution failed:', err);
      return null;
    }
  }

  /**
   * Create or update a multi-week rotation pattern (e.g. Morning -> Evening -> Night -> Morning)
   */
  async saveRotationPattern(pattern: ShiftRotationPattern): Promise<ShiftRotationPattern> {
    const payload = {
      ...pattern,
      updated_at: new Date().toISOString(),
    };

    if (pattern.id) {
      const { data, error } = await supabase
        .from('shift_rotation_patterns')
        .update(payload)
        .eq('id', pattern.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('shift_rotation_patterns')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  }

  /**
   * Assign rotation pattern to an employee or entire department
   */
  async assignRotationPattern(params: {
    organizationId: string;
    patternId: string;
    targetType: 'EMPLOYEE' | 'DEPARTMENT' | 'BRANCH' | 'VENDOR';
    targetId: string;
    effectiveFrom: string;
    cycleStartWeek?: number;
  }) {
    const { data, error } = await supabase
      .from('shift_rotation_assignments')
      .upsert({
        organization_id: params.organizationId,
        rotation_pattern_id: params.patternId,
        assignment_target_type: params.targetType,
        target_id: params.targetId,
        effective_from: params.effectiveFrom,
        cycle_start_week: params.cycleStartWeek || 1,
        status: 'ACTIVE',
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export const shiftRotationEngine = new ShiftRotationEngine();
