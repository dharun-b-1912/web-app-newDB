// ============================================================================
// JOY PeopleHR — Garment Workforce Master Data & Configuration Service
// Covers Org Settings, Units/Lines, Teams, Worker Profiles, Wage Assignments,
// Styles, Operations, Orders, Piece-Rate Cards, and Incentive Rules
// ============================================================================

import { supabase } from '../../lib/supabase';
import { getActiveOrgId } from '../attendance/biometricCommandService';
import {
  GarmentIncentiveRule,
  GarmentOperation,
  GarmentOrgSettings,
  GarmentPieceRateCard,
  GarmentProductionOrder,
  GarmentProductionTeam,
  GarmentProductionUnit,
  GarmentStyle,
  GarmentWageAssignment,
  GarmentWorkerProfile,
} from '../../types/garment';

function orgIdOrThrow(orgId?: string): string {
  const id = orgId || getActiveOrgId();
  if (!id) throw new Error('Active organization ID is required');
  return id;
}

export async function recordGarmentAudit(params: {
  organization_id: string;
  entity_type: string;
  entity_id?: string | null;
  action: string;
  old_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  reason?: string;
}) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from('garment_audit_logs').insert({
      organization_id: params.organization_id,
      entity_type: params.entity_type,
      entity_id: params.entity_id || null,
      action: params.action,
      actor_user_id: userData?.user?.id || null,
      old_values: params.old_values || null,
      new_values: params.new_values || null,
      reason: params.reason || null,
    });
  } catch (err) {
    console.warn('[GarmentAudit] Audit insert warning:', err);
  }
}

export const garmentMasterService = {
  // ── 1. Organization Settings ────────────────────────────────────────────────
  async getSettings(organizationId?: string): Promise<GarmentOrgSettings> {
    const orgId = orgIdOrThrow(organizationId);
    const { data, error } = await supabase
      .from('garment_org_settings')
      .select('*')
      .eq('organization_id', orgId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (data) return data as GarmentOrgSettings;

    // Auto-create tenant default settings record
    const defaults: Partial<GarmentOrgSettings> = {
      organization_id: orgId,
      piece_rate_calculation_mode: 'CONFIGURABLE_PER_ORDER',
      default_shared_split_method: 'EQUAL',
      default_rework_payment_rule: 'ACCEPTED_ONLY',
      rework_rate_percentage: 0,
      rejected_payment_rule: 'NEVER_PAY',
      rejected_rate_percentage: 0,
      require_qc_before_piece_pay: true,
      supervisor_can_override_rate: false,
      allow_backdated_entry_days: 2,
      overtime_multiplier_daily: 1.5,
      overtime_multiplier_hourly: 1.5,
      overtime_applies_to_piece_rate: true,
      standard_hours_per_day: 8,
      max_deduction_pct_of_gross: 50,
      enforce_minimum_wage_check: true,
      statutory_minimum_daily_wage: 0,
      currency_code: 'INR',
    };

    const { data: created, error: createErr } = await supabase
      .from('garment_org_settings')
      .upsert(defaults, { onConflict: 'organization_id' })
      .select()
      .single();

    if (createErr) throw new Error(createErr.message);
    return created as GarmentOrgSettings;
  },

  async saveSettings(settings: GarmentOrgSettings): Promise<GarmentOrgSettings> {
    const { data, error } = await supabase
      .from('garment_org_settings')
      .upsert(settings, { onConflict: 'organization_id' })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await recordGarmentAudit({
      organization_id: settings.organization_id,
      entity_type: 'garment_org_settings',
      action: 'UPSERT_SETTINGS',
      new_values: settings,
    });
    return data as GarmentOrgSettings;
  },

  // ── 2. Production Units (Factories, Floors, Lines) ──────────────────────────
  async listUnits(organizationId?: string): Promise<GarmentProductionUnit[]> {
    const orgId = orgIdOrThrow(organizationId);
    const { data, error } = await supabase
      .from('garment_production_units')
      .select('*')
      .eq('organization_id', orgId)
      .order('unit_type', { ascending: true })
      .order('unit_name', { ascending: true });
    if (error) throw new Error(error.message);
    return (data || []) as GarmentProductionUnit[];
  },

  async saveUnit(unit: Partial<GarmentProductionUnit>): Promise<GarmentProductionUnit> {
    const orgId = orgIdOrThrow(unit.organization_id);
    const payload = { ...unit, organization_id: orgId };
    const { data, error } = await supabase
      .from('garment_production_units')
      .upsert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    await recordGarmentAudit({
      organization_id: orgId,
      entity_type: 'garment_production_unit',
      entity_id: data.id,
      action: unit.id ? 'UPDATE_UNIT' : 'CREATE_UNIT',
      new_values: data,
    });
    return data as GarmentProductionUnit;
  },

  // ── 3. Production Teams ─────────────────────────────────────────────────────
  async listTeams(organizationId?: string): Promise<GarmentProductionTeam[]> {
    const orgId = orgIdOrThrow(organizationId);
    const { data, error } = await supabase
      .from('garment_production_teams')
      .select('*')
      .eq('organization_id', orgId)
      .order('team_name', { ascending: true });
    if (error) throw new Error(error.message);
    return (data || []) as GarmentProductionTeam[];
  },

  async saveTeam(team: Partial<GarmentProductionTeam>): Promise<GarmentProductionTeam> {
    const orgId = orgIdOrThrow(team.organization_id);
    const { data, error } = await supabase
      .from('garment_production_teams')
      .upsert({ ...team, organization_id: orgId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as GarmentProductionTeam;
  },

  // ── 4. Worker Profiles & Wage Assignments ──────────────────────────────────
  async listWorkerProfiles(organizationId?: string): Promise<GarmentWorkerProfile[]> {
    const orgId = orgIdOrThrow(organizationId);
    const { data, error } = await supabase
      .from('garment_worker_profiles')
      .select('*')
      .eq('organization_id', orgId)
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []) as GarmentWorkerProfile[];
  },

  async upsertWorkerProfile(profile: Partial<GarmentWorkerProfile>): Promise<GarmentWorkerProfile> {
    const orgId = orgIdOrThrow(profile.organization_id);
    const { data, error } = await supabase
      .from('garment_worker_profiles')
      .upsert({ ...profile, organization_id: orgId }, { onConflict: 'organization_id,employee_id' })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await recordGarmentAudit({
      organization_id: orgId,
      entity_type: 'garment_worker_profile',
      entity_id: data.id,
      action: 'UPSERT_WORKER_PROFILE',
      new_values: data,
    });
    return data as GarmentWorkerProfile;
  },

  async listWageAssignments(organizationId?: string, employeeId?: string): Promise<GarmentWageAssignment[]> {
    const orgId = orgIdOrThrow(organizationId);
    let q = supabase
      .from('garment_wage_assignments')
      .select('*')
      .eq('organization_id', orgId)
      .order('effective_from', { ascending: false });
    if (employeeId) q = q.eq('employee_id', employeeId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data || []) as GarmentWageAssignment[];
  },

  async saveWageAssignment(assignment: Partial<GarmentWageAssignment>): Promise<GarmentWageAssignment> {
    const orgId = orgIdOrThrow(assignment.organization_id);
    if (!assignment.employee_id || !assignment.wage_method || !assignment.effective_from) {
      throw new Error('employee_id, wage_method, and effective_from are required');
    }

    // Close prior open-ended active assignment cleanly if creating a new effective version
    if (!assignment.id) {
      const prevEnd = new Date(assignment.effective_from);
      prevEnd.setDate(prevEnd.getDate() - 1);
      const prevEndStr = prevEnd.toISOString().split('T')[0];

      await supabase
        .from('garment_wage_assignments')
        .update({ effective_to: prevEndStr })
        .eq('organization_id', orgId)
        .eq('employee_id', assignment.employee_id)
        .eq('is_active', true)
        .is('effective_to', null)
        .lt('effective_from', assignment.effective_from);
    }

    const { data, error } = await supabase
      .from('garment_wage_assignments')
      .upsert({ ...assignment, organization_id: orgId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await recordGarmentAudit({
      organization_id: orgId,
      entity_type: 'garment_wage_assignment',
      entity_id: data.id,
      action: assignment.id ? 'UPDATE_WAGE_ASSIGNMENT' : 'CREATE_WAGE_ASSIGNMENT',
      new_values: data,
    });
    return data as GarmentWageAssignment;
  },

  // ── 5. Styles, Operations & Orders ─────────────────────────────────────────
  async listStyles(organizationId?: string): Promise<GarmentStyle[]> {
    const orgId = orgIdOrThrow(organizationId);
    const { data, error } = await supabase
      .from('garment_styles')
      .select('*')
      .eq('organization_id', orgId)
      .order('style_code', { ascending: true });
    if (error) throw new Error(error.message);
    return (data || []) as GarmentStyle[];
  },

  async saveStyle(style: Partial<GarmentStyle>): Promise<GarmentStyle> {
    const orgId = orgIdOrThrow(style.organization_id);
    const { data, error } = await supabase
      .from('garment_styles')
      .upsert({ ...style, organization_id: orgId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as GarmentStyle;
  },

  async listOperations(organizationId?: string): Promise<GarmentOperation[]> {
    const orgId = orgIdOrThrow(organizationId);
    const { data, error } = await supabase
      .from('garment_operations')
      .select('*')
      .eq('organization_id', orgId)
      .order('sequence_order', { ascending: true });
    if (error) throw new Error(error.message);
    return (data || []) as GarmentOperation[];
  },

  async saveOperation(op: Partial<GarmentOperation>): Promise<GarmentOperation> {
    const orgId = orgIdOrThrow(op.organization_id);
    const { data, error } = await supabase
      .from('garment_operations')
      .upsert({ ...op, organization_id: orgId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as GarmentOperation;
  },

  async listOrders(organizationId?: string): Promise<GarmentProductionOrder[]> {
    const orgId = orgIdOrThrow(organizationId);
    const { data, error } = await supabase
      .from('garment_production_orders')
      .select('*')
      .eq('organization_id', orgId)
      .order('start_date', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []) as GarmentProductionOrder[];
  },

  async saveOrder(order: Partial<GarmentProductionOrder>): Promise<GarmentProductionOrder> {
    const orgId = orgIdOrThrow(order.organization_id);
    const { data, error } = await supabase
      .from('garment_production_orders')
      .upsert({ ...order, organization_id: orgId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as GarmentProductionOrder;
  },

  // ── 6. Piece-Rate Cards & Incentive Rules ──────────────────────────────────
  async listRateCards(organizationId?: string): Promise<GarmentPieceRateCard[]> {
    const orgId = orgIdOrThrow(organizationId);
    const { data, error } = await supabase
      .from('garment_piece_rate_cards')
      .select('*')
      .eq('organization_id', orgId)
      .order('effective_from', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []) as GarmentPieceRateCard[];
  },

  async saveRateCard(card: Partial<GarmentPieceRateCard>): Promise<GarmentPieceRateCard> {
    const orgId = orgIdOrThrow(card.organization_id);
    const { data, error } = await supabase
      .from('garment_piece_rate_cards')
      .upsert({ ...card, organization_id: orgId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await recordGarmentAudit({
      organization_id: orgId,
      entity_type: 'garment_piece_rate_card',
      entity_id: data.id,
      action: card.id ? 'UPDATE_RATE_CARD' : 'CREATE_RATE_CARD',
      new_values: data,
    });
    return data as GarmentPieceRateCard;
  },

  async listIncentiveRules(organizationId?: string): Promise<GarmentIncentiveRule[]> {
    const orgId = orgIdOrThrow(organizationId);
    const { data, error } = await supabase
      .from('garment_incentive_rules')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []) as GarmentIncentiveRule[];
  },

  async saveIncentiveRule(rule: Partial<GarmentIncentiveRule>): Promise<GarmentIncentiveRule> {
    const orgId = orgIdOrThrow(rule.organization_id);
    const { data, error } = await supabase
      .from('garment_incentive_rules')
      .upsert({ ...rule, organization_id: orgId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as GarmentIncentiveRule;
  },
};

