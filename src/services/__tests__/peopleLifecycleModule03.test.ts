// src/services/__tests__/peopleLifecycleModule03.test.ts
// ============================================================================
// JOY PeopleHR — Module Certification 03: People / Employee Lifecycle Engine
// 15-Test Master Verification Suite
// ============================================================================

import { employeeLifecycleEngine } from '../identity/employeeLifecycleEngine';
import { domainEventService } from '../events/domainEventService';
import { Employee } from '../../types';

export async function runPeopleLifecycleModule03CertificationSuite(): Promise<{
  passed: number;
  failed: number;
  total: number;
  details: string[];
}> {
  console.log('\n================================================================');
  console.log('🚀 MODULE CERTIFICATION 03: PEOPLE / EMPLOYEE LIFECYCLE ENGINE');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;
  const details: string[] = [];

  const assert = (condition: boolean, testName: string, message?: string) => {
    if (condition) {
      passed++;
      const msg = `  ✅ PASS: ${testName}`;
      console.log(msg);
      details.push(msg);
    } else {
      failed++;
      const msg = `  ❌ FAIL: ${testName} — ${message || 'Assertion failed'}`;
      console.error(msg);
      details.push(msg);
    }
  };

  const TENANT_A = 'org-tenant-alpha';
  const TENANT_B = 'org-tenant-beta';
  const ADMIN_ACTOR = 'usr-superadmin-01';

  // Test Entities
  const EMP_1 = 'emp-arun-001';
  const EMP_2 = 'emp-bhavna-002';
  const EMP_3 = 'emp-chitra-003';
  const EMP_EX = 'emp-deepak-exited';
  const EMP_FOREIGN = 'emp-tenant-b-user';

  // Initialize clean test stores
  (globalThis as any).__JOY_EMPLOYEES__ = [
    {
      id: EMP_1,
      organization_id: TENANT_A,
      first_name: 'Arun',
      last_name: 'Kumar',
      employee_code: 'WF-1001',
      work_email: 'arun@corp.com',
      department_id: 'dept-eng',
      designation_id: 'desig-eng',
      status: 'Draft',
      employment_status: 'DRAFT',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: EMP_2,
      organization_id: TENANT_A,
      first_name: 'Bhavna',
      last_name: 'Sharma',
      employee_code: 'WF-1002',
      work_email: 'bhavna@corp.com',
      department_id: 'dept-eng',
      designation_id: 'desig-lead',
      status: 'Active',
      employment_status: 'ACTIVE',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: EMP_3,
      organization_id: TENANT_A,
      first_name: 'Chitra',
      last_name: 'Rao',
      employee_code: 'WF-1003',
      work_email: 'chitra@corp.com',
      department_id: 'dept-prod',
      designation_id: 'desig-mgr',
      status: 'Active',
      employment_status: 'ACTIVE',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: EMP_EX,
      organization_id: TENANT_A,
      first_name: 'Deepak',
      last_name: 'Verma',
      employee_code: 'WF-1004',
      work_email: 'deepak@corp.com',
      department_id: 'dept-eng',
      designation_id: 'desig-eng',
      status: 'Exited',
      employment_status: 'EXITED',
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2026-05-01T00:00:00.000Z',
    },
    {
      id: EMP_FOREIGN,
      organization_id: TENANT_B,
      first_name: 'Farhan',
      last_name: 'Ali',
      employee_code: 'WF-B-101',
      work_email: 'farhan@tenantb.com',
      department_id: 'dept-sales-b',
      designation_id: 'desig-sales',
      status: 'Active',
      employment_status: 'ACTIVE',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  ];

  (globalThis as any).__JOY_USER_PROFILES__ = [
    { employee_id: EMP_1, status: 'ACTIVE' },
    { employee_id: EMP_2, status: 'ACTIVE' },
    { employee_id: EMP_3, status: 'ACTIVE' },
    { employee_id: EMP_EX, status: 'INACTIVE' },
    { employee_id: EMP_FOREIGN, status: 'ACTIVE' },
  ];

  (globalThis as any).__JOY_LIFECYCLE_EVENTS__ = [];
  (globalThis as any).__JOY_LEAVE_REQUESTS__ = [];
  (globalThis as any).__JOY_FNF_SETTLEMENTS__ = [];
  (globalThis as any).__JOY_SEPARATIONS__ = [];

  // ==========================================================================
  // LAYER 1: State Machine & Lifecycle Transitions
  // ==========================================================================

  // Test 1: Happy path forward transitions (DRAFT -> ONBOARDING -> PROBATION -> CONFIRMED)
  try {
    const r1 = await employeeLifecycleEngine.transitionEmployeeStatus({
      employeeId: EMP_1,
      organizationId: TENANT_A,
      targetStatus: 'Onboarding',
      actorId: ADMIN_ACTOR,
    });
    const r2 = await employeeLifecycleEngine.transitionEmployeeStatus({
      employeeId: EMP_1,
      organizationId: TENANT_A,
      targetStatus: 'Probation',
      actorId: ADMIN_ACTOR,
    });
    const r3 = await employeeLifecycleEngine.transitionEmployeeStatus({
      employeeId: EMP_1,
      organizationId: TENANT_A,
      targetStatus: 'Confirmed',
      effectiveDate: '2026-06-01',
      actorId: ADMIN_ACTOR,
    });

    const isConfirmed = r3.newStatus === 'Confirmed' && (r3.employee as any).confirmation_date === '2026-06-01';
    assert(
      isConfirmed && r1.newStatus === 'Onboarding' && r2.newStatus === 'Probation',
      'Test 1: Happy path forward lifecycle transitions (Draft -> Onboarding -> Probation -> Confirmed)',
      `Status=${r3.newStatus}, ConfirmationDate=${(r3.employee as any).confirmation_date}`
    );
  } catch (e: any) {
    assert(false, 'Test 1: Happy path transitions failed', e.message);
  }

  // Test 2: Illegal state transition rejection
  try {
    let threwIllegal = false;
    try {
      // Confirmed employee jumping backward to Onboarding
      await employeeLifecycleEngine.transitionEmployeeStatus({
        employeeId: EMP_1,
        organizationId: TENANT_A,
        targetStatus: 'Onboarding',
        actorId: ADMIN_ACTOR,
      });
    } catch (err: any) {
      threwIllegal = err.message.includes('ILLEGAL_LIFECYCLE_TRANSITION');
    }

    let threwExitedIllegal = false;
    try {
      // Exited employee jumping directly to Probation without formal Rehire
      await employeeLifecycleEngine.transitionEmployeeStatus({
        employeeId: EMP_EX,
        organizationId: TENANT_A,
        targetStatus: 'Probation',
        actorId: ADMIN_ACTOR,
      });
    } catch (err: any) {
      threwExitedIllegal = err.message.includes('ILLEGAL_LIFECYCLE_TRANSITION');
    }

    assert(
      threwIllegal && threwExitedIllegal,
      'Test 2: Illegal state transitions rejected by authoritative state machine',
      `ThrewConfirmedToOnboarding=${threwIllegal}, ThrewExitedToProbation=${threwExitedIllegal}`
    );
  } catch (e: any) {
    assert(false, 'Test 2: Illegal state transition check failed', e.message);
  }

  // Test 3: Suspension and reinstatement lifecycle
  try {
    const suspendRes = await employeeLifecycleEngine.transitionEmployeeStatus({
      employeeId: EMP_2,
      organizationId: TENANT_A,
      targetStatus: 'Suspended',
      reason: 'Disciplinary investigation pending',
      actorId: ADMIN_ACTOR,
    });

    const profs = (globalThis as any).__JOY_USER_PROFILES__ || [];
    const profSuspended = profs.find((p: any) => p.employee_id === EMP_2)?.status === 'INACTIVE';

    const reinstateRes = await employeeLifecycleEngine.transitionEmployeeStatus({
      employeeId: EMP_2,
      organizationId: TENANT_A,
      targetStatus: 'Active',
      reason: 'Investigation concluded cleanly',
      actorId: ADMIN_ACTOR,
    });

    const profActive = profs.find((p: any) => p.employee_id === EMP_2)?.status === 'ACTIVE';

    assert(
      suspendRes.newStatus === 'Suspended' && profSuspended && reinstateRes.newStatus === 'Active' && profActive,
      'Test 3: Employee suspension and reinstatement lifecycle with synchronized user_profile deactivation',
      `SuspendStatus=${suspendRes.newStatus}, ProfSuspended=${profSuspended}, ReinstateStatus=${reinstateRes.newStatus}, ProfActive=${profActive}`
    );
  } catch (e: any) {
    assert(false, 'Test 3: Suspension/reinstatement failed', e.message);
  }

  // Test 4: Formal Rehire governance for Exited employees
  try {
    const rehireRes = await employeeLifecycleEngine.transitionEmployeeStatus({
      employeeId: EMP_EX,
      organizationId: TENANT_A,
      targetStatus: 'REHIRED',
      effectiveDate: '2026-07-01',
      reason: 'Alumni rehired as Principal Engineer',
      actorId: ADMIN_ACTOR,
    });

    const events = (globalThis as any).__JOY_LIFECYCLE_EVENTS__ || [];
    const hasRehireEvent = events.some((e: any) => e.employee_id === EMP_EX && e.event_type === 'REHIRE');

    // Rehired transitions to Confirmed
    const confirmRes = await employeeLifecycleEngine.transitionEmployeeStatus({
      employeeId: EMP_EX,
      organizationId: TENANT_A,
      targetStatus: 'Confirmed',
      actorId: ADMIN_ACTOR,
    });

    assert(
      rehireRes.newStatus === 'REHIRED' && hasRehireEvent && confirmRes.newStatus === 'Confirmed',
      'Test 4: Formal Rehire governance reactivates exited alumni with dedicated REHIRE lifecycle event',
      `RehireStatus=${rehireRes.newStatus}, HasRehireEvent=${hasRehireEvent}, ConfirmStatus=${confirmRes.newStatus}`
    );
  } catch (e: any) {
    assert(false, 'Test 4: Rehire flow failed', e.message);
  }

  // ==========================================================================
  // LAYER 2: Hierarchy & Reporting DAG (Cycle Detection)
  // ==========================================================================

  // Test 5: Direct manager assignment and direct report tree calculation
  try {
    // EMP_3 is Manager of EMP_2; EMP_2 is Manager of EMP_1
    const assign1 = await employeeLifecycleEngine.assignReportingManager({
      employeeId: EMP_2,
      managerId: EMP_3,
      organizationId: TENANT_A,
      actorId: ADMIN_ACTOR,
    });

    const assign2 = await employeeLifecycleEngine.assignReportingManager({
      employeeId: EMP_1,
      managerId: EMP_2,
      organizationId: TENANT_A,
      actorId: ADMIN_ACTOR,
    });

    const emp1Record = await employeeLifecycleEngine.getEmployeeById(EMP_1);
    const emp2Record = await employeeLifecycleEngine.getEmployeeById(EMP_2);

    const isAssigned = emp1Record?.reporting_manager_id === EMP_2 && emp2Record?.reporting_manager_id === EMP_3;

    assert(
      isAssigned && assign2.directReportsCount >= 1,
      'Test 5: Direct reporting manager assignment establishes valid hierarchy tree',
      `EMP1_Manager=${emp1Record?.reporting_manager_id}, EMP2_Manager=${emp2Record?.reporting_manager_id}`
    );
  } catch (e: any) {
    assert(false, 'Test 5: Hierarchy assignment failed', e.message);
  }

  // Test 6: Self-reporting rejection (A -> A)
  try {
    let threwSelf = false;
    try {
      await employeeLifecycleEngine.assignReportingManager({
        employeeId: EMP_1,
        managerId: EMP_1, // Self
        organizationId: TENANT_A,
        actorId: ADMIN_ACTOR,
      });
    } catch (err: any) {
      threwSelf = err.message.includes('HIERARCHY_CYCLE_DETECTED');
    }

    assert(
      threwSelf,
      'Test 6: Self-reporting assignment (A -> A) strictly rejected with HIERARCHY_CYCLE_DETECTED',
      `ThrewSelf=${threwSelf}`
    );
  } catch (e: any) {
    assert(false, 'Test 6: Self-reporting check failed', e.message);
  }

  // Test 7: Circular reporting cycle detection (A -> B -> C -> A)
  // EMP_3 manages EMP_2, EMP_2 manages EMP_1. Attempting to assign EMP_1 as manager of EMP_3!
  try {
    let threwCircular = false;
    try {
      await employeeLifecycleEngine.assignReportingManager({
        employeeId: EMP_3,
        managerId: EMP_1, // Would create cycle: EMP_3 -> EMP_1 -> EMP_2 -> EMP_3
        organizationId: TENANT_A,
        actorId: ADMIN_ACTOR,
      });
    } catch (err: any) {
      threwCircular = err.message.includes('HIERARCHY_CYCLE_DETECTED');
    }

    assert(
      threwCircular,
      'Test 7: Multi-node circular reporting cycle (A -> B -> C -> A) detected and rejected by DFS',
      `ThrewCircular=${threwCircular}`
    );
  } catch (e: any) {
    assert(false, 'Test 7: Circular reporting check failed', e.message);
  }

  // ==========================================================================
  // LAYER 3: Employment Transfers & Promotions
  // ==========================================================================

  // Test 8: Departmental transfer with immutable TRANSFER event
  try {
    const transferRes = await employeeLifecycleEngine.transferDepartment({
      employeeId: EMP_1,
      newDepartmentId: 'dept-cloud-infra',
      organizationId: TENANT_A,
      effectiveDate: '2026-08-01',
      remarks: 'Transferred to Cloud Infrastructure group',
      actorId: ADMIN_ACTOR,
    });

    const updatedEmp = await employeeLifecycleEngine.getEmployeeById(EMP_1);
    const events = (globalThis as any).__JOY_LIFECYCLE_EVENTS__ || [];
    const transferEvent = events.find(
      (e: any) => e.employee_id === EMP_1 && e.event_type === 'TRANSFER'
    );

    assert(
      updatedEmp?.department_id === 'dept-cloud-infra' && !!transferEvent,
      'Test 8: Atomic departmental transfer updates department_id and appends TRANSFER lifecycle event',
      `Dept=${updatedEmp?.department_id}, HasTransferEvent=${!!transferEvent}`
    );
  } catch (e: any) {
    assert(false, 'Test 8: Department transfer failed', e.message);
  }

  // Test 9: Designation promotion with immutable PROMOTION event
  try {
    const promoRes = await employeeLifecycleEngine.promoteDesignation({
      employeeId: EMP_1,
      newDesignationId: 'desig-lead-cloud',
      organizationId: TENANT_A,
      effectiveDate: '2026-08-15',
      remarks: 'Promoted to Lead Cloud Architect',
      actorId: ADMIN_ACTOR,
    });

    const updatedEmp = await employeeLifecycleEngine.getEmployeeById(EMP_1);
    const events = (globalThis as any).__JOY_LIFECYCLE_EVENTS__ || [];
    const promoEvent = events.find(
      (e: any) => e.employee_id === EMP_1 && e.event_type === 'PROMOTION'
    );

    assert(
      updatedEmp?.designation_id === 'desig-lead-cloud' && !!promoEvent,
      'Test 9: Atomic designation promotion updates designation_id and appends PROMOTION lifecycle event',
      `Desig=${updatedEmp?.designation_id}, HasPromoEvent=${!!promoEvent}`
    );
  } catch (e: any) {
    assert(false, 'Test 9: Designation promotion failed', e.message);
  }

  // ==========================================================================
  // LAYER 4: Soft-Delete Preservation & Hard-Delete Shield
  // ==========================================================================

  // Test 10: Soft-delete execution sets deleted_at, status=ARCHIVED, and deactivates user profile
  try {
    const softDelRes = await employeeLifecycleEngine.deleteEmployee({
      employeeId: EMP_2,
      organizationId: TENANT_A,
      actorId: ADMIN_ACTOR,
      reason: 'Contract concluded cleanly',
    });

    const empRecord = await employeeLifecycleEngine.getEmployeeById(EMP_2);
    const profs = (globalThis as any).__JOY_USER_PROFILES__ || [];
    const prof = profs.find((p: any) => p.employee_id === EMP_2);

    const isSoftDeleted =
      softDelRes.isSoftDeleted &&
      empRecord?.deleted_at !== undefined &&
      empRecord?.status === 'Archived' &&
      prof?.status === 'INACTIVE';

    assert(
      isSoftDeleted,
      'Test 10: Soft-delete sets deleted_at, transitions status to Archived, and deactivates user_profile',
      `SoftDeleted=${softDelRes.isSoftDeleted}, DeletedAt=${empRecord?.deleted_at}, ProfileStatus=${prof?.status}`
    );
  } catch (e: any) {
    assert(false, 'Test 10: Soft-delete execution failed', e.message);
  }

  // Test 11: Hard-delete barrier protects historical footprints across 41 downstream FK consumers
  try {
    // Add a historical footprint (e.g. Leave request) to EMP_1
    const leaves = (globalThis as any).__JOY_LEAVE_REQUESTS__ || [];
    leaves.push({
      id: 'lr-historical-01',
      employee_id: EMP_1,
      status: 'APPROVED',
    });
    (globalThis as any).__JOY_LEAVE_REQUESTS__ = leaves;

    let threwHardDeleteBarrier = false;
    try {
      await employeeLifecycleEngine.deleteEmployee({
        employeeId: EMP_1,
        organizationId: TENANT_A,
        actorId: ADMIN_ACTOR,
        forceHardDelete: true, // Attempt hard delete
      });
    } catch (err: any) {
      threwHardDeleteBarrier = err.message.includes('HARD_DELETE_PROHIBITED');
    }

    assert(
      threwHardDeleteBarrier,
      'Test 11: Hard-delete barrier strictly prohibits purging employee with downstream historical records',
      `ThrewHardDeleteBarrier=${threwHardDeleteBarrier}`
    );
  } catch (e: any) {
    assert(false, 'Test 11: Hard-delete barrier check failed', e.message);
  }

  // ==========================================================================
  // LAYER 5: Exited Employee Shield, Concurrency & Multi-Tenancy
  // ==========================================================================

  // Test 12: Exited employee operational shielding
  try {
    const exitedEmp = {
      id: 'emp-temp-exited',
      organization_id: TENANT_A,
      status: 'Exited' as any,
      employment_status: 'EXITED',
    } as unknown as Employee;

    const activeEmp = {
      id: 'emp-temp-active',
      organization_id: TENANT_A,
      status: 'Active' as any,
      employment_status: 'ACTIVE',
    } as unknown as Employee;

    const exitedPerm = employeeLifecycleEngine.validateOperationalPermissibility(exitedEmp);
    const activePerm = employeeLifecycleEngine.validateOperationalPermissibility(activeEmp);

    assert(
      !exitedPerm.permissible && activePerm.permissible,
      'Test 12: Operational shield blocks attendance, leave, and payroll processing for Exited employees',
      `ExitedPermissible=${exitedPerm.permissible}, ActivePermissible=${activePerm.permissible}`
    );
  } catch (e: any) {
    assert(false, 'Test 12: Operational shield failed', e.message);
  }

  // Test 13: Identity mapping synchronization between employees and user_profiles
  try {
    await employeeLifecycleEngine.syncUserProfileStatus(EMP_1, 'INACTIVE');
    const profs = (globalThis as any).__JOY_USER_PROFILES__ || [];
    const status1 = profs.find((p: any) => p.employee_id === EMP_1)?.status;

    await employeeLifecycleEngine.syncUserProfileStatus(EMP_1, 'ACTIVE');
    const status2 = profs.find((p: any) => p.employee_id === EMP_1)?.status;

    assert(
      status1 === 'INACTIVE' && status2 === 'ACTIVE',
      'Test 13: 1:1 Identity mapping guarantees immediate auth status synchronization in user_profiles',
      `Status1=${status1}, Status2=${status2}`
    );
  } catch (e: any) {
    assert(false, 'Test 13: Identity mapping sync failed', e.message);
  }

  // Test 14: Optimistic concurrency and dirty write conflict detection
  try {
    let threwConcurrency = false;
    try {
      await employeeLifecycleEngine.transitionEmployeeStatus({
        employeeId: EMP_3,
        organizationId: TENANT_A,
        targetStatus: 'Suspended',
        actorId: ADMIN_ACTOR,
        expectedUpdatedAt: '2020-01-01T00:00:00.000Z', // Stale timestamp!
      });
    } catch (err: any) {
      threwConcurrency = err.message.includes('CONCURRENCY_CONFLICT');
    }

    assert(
      threwConcurrency,
      'Test 14: Optimistic concurrency control rejects dirty write with CONCURRENCY_CONFLICT',
      `ThrewConcurrency=${threwConcurrency}`
    );
  } catch (e: any) {
    assert(false, 'Test 14: Concurrency check failed', e.message);
  }

  // Test 15: Multi-Tenant Boundary Enforcement
  try {
    let threwCrossTenantManager = false;
    try {
      // Attempt to assign manager from Tenant B (EMP_FOREIGN) to employee in Tenant A (EMP_3)
      await employeeLifecycleEngine.assignReportingManager({
        employeeId: EMP_3,
        managerId: EMP_FOREIGN,
        organizationId: TENANT_A,
        actorId: ADMIN_ACTOR,
      });
    } catch (err: any) {
      threwCrossTenantManager = err.message.includes('TENANT_BOUNDARY_VIOLATION');
    }

    let threwCrossTenantMutation = false;
    try {
      // Tenant A admin attempting to mutate Tenant B employee
      await employeeLifecycleEngine.transitionEmployeeStatus({
        employeeId: EMP_FOREIGN,
        organizationId: TENANT_A,
        targetStatus: 'Suspended',
        actorId: ADMIN_ACTOR,
      });
    } catch (err: any) {
      threwCrossTenantMutation = err.message.includes('TENANT_BOUNDARY_VIOLATION');
    }

    assert(
      threwCrossTenantManager && threwCrossTenantMutation,
      'Test 15: Multi-tenant boundary strictly blocks cross-tenant manager assignment and foreign mutations',
      `ThrewCrossTenantManager=${threwCrossTenantManager}, ThrewCrossTenantMutation=${threwCrossTenantMutation}`
    );
  } catch (e: any) {
    assert(false, 'Test 15: Multi-tenant check failed', e.message);
  }

  // ==========================================================================
  // Summary
  // ==========================================================================
  console.log('----------------------------------------------------------------');
  console.log(`Summary: ${passed} / ${passed + failed} Tests Passed (${passed === 15 ? '100%' : 'INCOMPLETE'})`);
  console.log('================================================================\n');

  return {
    passed,
    failed,
    total: passed + failed,
    details,
  };
}

// Allow direct execution via tsx
if (typeof process !== 'undefined' && process.argv[1]?.includes('peopleLifecycleModule03.test.ts')) {
  runPeopleLifecycleModule03CertificationSuite()
    .then((res) => {
      if (res.failed > 0) {
        process.exitCode = 1;
      } else {
        process.exitCode = 0;
      }
    })
    .catch((err) => {
      console.error('Fatal error running certification suite:', err);
      process.exitCode = 1;
    });
}
