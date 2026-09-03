// ============================================================
// Joy PeopleHR — Multi-Tenant Biometric User & Template Sync Engine (Phase 8.5)
// ============================================================
// Synchronizes employee credentials, biometric numeric PINs, RFID cards,
// and AES-256 encrypted biometric templates to physical edge machines.
// ============================================================

import {
  MultiTenantBiometricUser,
  EncryptedBiometricTemplate,
} from './types/biometricSaas.types';

export class BiometricUserSyncEngine {
  private static users: Map<string, MultiTenantBiometricUser> = new Map();
  private static templateVault: Map<string, EncryptedBiometricTemplate> = new Map();

  public static initialize() {
    if (this.users.size > 0) return;

    const initialUsers: MultiTenantBiometricUser[] = [
      {
        userId: 'usr_bio_01',
        organizationId: 'org_enterprise_demo',
        employeeId: 'emp_1001',
        employeeCode: 'JOY-1001',
        fullName: 'Rahul Sharma',
        biometricPin: '1001',
        cardNumber: '9842109842',
        privilege: 'STANDARD_USER',
        enrolledModes: {
          fingerprintCount: 2,
          hasFaceEnrolled: true,
          hasPalmEnrolled: false,
          hasCardEnrolled: true,
        },
        assignedDeviceIds: ['dev_zk_blr_01', 'dev_essl_hyd_01', 'dev_hik_mum_01'],
        syncStatus: 'SYNCED',
        lastSyncedAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        userId: 'usr_bio_02',
        organizationId: 'org_enterprise_demo',
        employeeId: 'emp_1002',
        employeeCode: 'JOY-1002',
        fullName: 'Priya Sundaram',
        biometricPin: '1002',
        cardNumber: '9842109843',
        privilege: 'STANDARD_USER',
        enrolledModes: {
          fingerprintCount: 1,
          hasFaceEnrolled: true,
          hasPalmEnrolled: false,
          hasCardEnrolled: true,
        },
        assignedDeviceIds: ['dev_zk_blr_01'],
        syncStatus: 'SYNCED',
        lastSyncedAt: new Date(Date.now() - 7200000).toISOString(),
      },
    ];

    for (const u of initialUsers) {
      this.users.set(`${u.organizationId}_${u.biometricPin}`, u);
    }
  }

  public static getUsersByTenant(organizationId: string): MultiTenantBiometricUser[] {
    this.initialize();
    return Array.from(this.users.values()).filter((u) => u.organizationId === organizationId);
  }

  public static getUserByPin(organizationId: string, pin: string): MultiTenantBiometricUser | undefined {
    this.initialize();
    return this.users.get(`${organizationId}_${pin}`);
  }

  public static enrollUser(user: MultiTenantBiometricUser): boolean {
    this.initialize();
    this.users.set(`${user.organizationId}_${user.biometricPin}`, user);
    return true;
  }

  /**
   * Stores AES-256 encrypted biometric template in tenant vault
   */
  public static storeEncryptedTemplate(template: EncryptedBiometricTemplate): boolean {
    this.templateVault.set(template.templateId, template);
    return true;
  }

  public static getTemplatesForEmployee(organizationId: string, employeeId: string): EncryptedBiometricTemplate[] {
    return Array.from(this.templateVault.values()).filter(
      (t) => t.organizationId === organizationId && t.employeeId === employeeId
    );
  }
}

BiometricUserSyncEngine.initialize();
