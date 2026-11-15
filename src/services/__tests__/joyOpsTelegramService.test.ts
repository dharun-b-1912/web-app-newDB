// src/services/__tests__/joyOpsTelegramService.test.ts
// ============================================================================
// JOY Ops & Telegram Bot Operations Test Suite
// Verifies: Bot Control, Telegram Dispatch, System Monitoring & Solution Playbooks
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  joyOpsTelegramService,
  TELEGRAM_OPS_CONFIG,
  OPS_RESOLUTION_PLAYBOOKS,
  BOT_AVAILABLE_COMMANDS,
} from '../ops/joyOpsTelegramService';

describe('JOY Ops — Telegram Bot & Autonomous Engineering Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Telegram Bot Gateway Configuration & Channel Targets', () => {
    it('verifies active Telegram Bot metadata and monitored channels', () => {
      const cfg = joyOpsTelegramService.getConfig();
      expect(cfg.botUsername).toBe('@joy_ops_alert_bot');
      expect(cfg.status).toBe('CONNECTED');
      expect(cfg.authorizedChats).toHaveLength(2);

      const groupChat = cfg.authorizedChats.find((c) => c.type === 'GROUP');
      expect(groupChat?.id).toBe('-5189746331');
      expect(groupChat?.label).toContain('Watchdog');

      const privateChat = cfg.authorizedChats.find((c) => c.type === 'PRIVATE');
      expect(privateChat?.id).toBe('9155594412');
      expect(privateChat?.label).toContain('SRE Lead');
    });

    it('verifies that the webhook URL targets the Supabase Edge Gateway', () => {
      const cfg = joyOpsTelegramService.getConfig();
      expect(cfg.webhookUrl).toContain('/functions/v1/telegram-webhook');
    });
  });

  describe('2. Interactive Bot Commands & Terminal Emulation', () => {
    it('executes /status and returns full operational health report', async () => {
      const res = await joyOpsTelegramService.executeBotCommand('/status');
      expect(res.command).toBe('/status');
      expect(res.outputHtml).toContain('JOY SENTINEL — Platform Health Report');
      expect(res.outputHtml).toContain('ALL SYSTEMS OPERATIONAL');
      expect(res.outputHtml).toContain('45/45 Tables Protected');
      expect(res.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('executes /critical and confirms 0 active blockers', async () => {
      const res = await joyOpsTelegramService.executeBotCommand('/critical');
      expect(res.command).toBe('/critical');
      expect(res.outputHtml).toContain('<b>Active P0 Incidents</b>: <b>0</b>');
      expect(res.outputHtml).toContain('Zero active production blockers');
    });

    it('executes /devices and returns biometric fleet telemetry', async () => {
      const res = await joyOpsTelegramService.executeBotCommand('/devices');
      expect(res.command).toBe('/devices');
      expect(res.outputHtml).toContain('Active ADMS Devices');
      expect(res.outputHtml).toContain('<b>Offline Kiosks</b>: <b>0</b>');
      expect(res.outputHtml).toContain('Safe Departure Checkouts');
    });

    it('executes /airtel and returns carrier DLT telemetry', async () => {
      const res = await joyOpsTelegramService.executeBotCommand('/airtel');
      expect(res.command).toBe('/airtel');
      expect(res.outputHtml).toContain('Airtel IQ DLT Carrier Telemetry');
      expect(res.outputHtml).toContain('JOYHRM');
    });

    it('executes /slo and validates error budget burn status', async () => {
      const res = await joyOpsTelegramService.executeBotCommand('/slo');
      expect(res.command).toBe('/slo');
      expect(res.outputHtml).toContain('Service Level Objectives (SLOs)');
      expect(res.outputHtml).toContain('99.98%');
    });

    it('executes /investigate with incident argument', async () => {
      const res = await joyOpsTelegramService.executeBotCommand('/investigate INC-9081');
      expect(res.command).toBe('/investigate');
      expect(res.outputHtml).toContain('Incident Investigation [INC-9081]');
      expect(res.outputHtml).toContain('ERR_SAFE_CHECKOUT_RECORDED');
    });
  });

  describe('3. Platform Anomaly Monitoring Telemetry', () => {
    it('provides multi-system health metrics across database, security, biometrics, and carriers', () => {
      const metrics = joyOpsTelegramService.getSystemHealthMetrics();
      expect(metrics.length).toBeGreaterThanOrEqual(6);

      const rls = metrics.find((m) => m.category === 'SECURITY');
      expect(rls?.value).toContain('100%');
      expect(rls?.status).toBe('HEALTHY');

      const seats = metrics.find((m) => m.category === 'COMMERCIAL');
      expect(seats?.value).toBe('ACTIVE');

      const geofence = metrics.find((m) => m.category === 'BIOMETRICS');
      expect(geofence?.value).toContain('STRICT IN / FLEX OUT');

      const airtel = metrics.find((m) => m.category === 'COMMUNICATION');
      expect(airtel?.value).toContain('99.4% Delivery');
    });
  });

  describe('4. "What To Do" Resolution Playbooks & Runbooks Catalog', () => {
    it('contains comprehensive resolution playbooks for all primary failure domains', () => {
      const playbooks = joyOpsTelegramService.getPlaybooks();
      expect(playbooks.length).toBeGreaterThanOrEqual(7);

      const errorCodes = playbooks.map((p) => p.errorCode);
      expect(errorCodes).toContain('TENANT-001');      // Cross-tenant boundary breach
      expect(errorCodes).toContain('COMMERCIAL-001');  // Subscription seat capacity
      expect(errorCodes).toContain('GEOFENCE-001');    // GPS boundary check-in
      expect(errorCodes).toContain('BIOMETRIC-002');   // Hardware kiosk offline
      expect(errorCodes).toContain('CARRIER-001');     // Airtel DLT carrier rejection
      expect(errorCodes).toContain('EDGE-001');        // Edge Function circuit breaker
      expect(errorCodes).toContain('DB-002');           // Database latency
    });

    it('validates that every playbook contains structured symptoms, root cause, and "what to do" steps', () => {
      const playbooks = joyOpsTelegramService.getPlaybooks();
      for (const pb of playbooks) {
        expect(pb.title).toBeTruthy();
        expect(pb.symptoms.length).toBeGreaterThanOrEqual(2);
        expect(pb.rootCause.length).toBeGreaterThanOrEqual(20);
        expect(pb.whatToDoSteps.length).toBeGreaterThanOrEqual(3);
        expect(pb.remediationActionLabel).toBeTruthy();
        expect(pb.targetNavId).toBeTruthy();
      }
    });

    it('verifies that the TENANT-001 playbook directs to Users/IAM and has P0 severity', () => {
      const rlsPb = OPS_RESOLUTION_PLAYBOOKS.find((p) => p.errorCode === 'TENANT-001');
      expect(rlsPb).toBeDefined();
      expect(rlsPb?.severity).toBe('P0');
      expect(rlsPb?.targetNavId).toBe('platform-users');
      expect(rlsPb?.whatToDoSteps.some((s) => s.includes('is_platform_admin'))).toBe(true);
    });

    it('verifies that the COMMERCIAL-001 seat limit playbook directs to Subscriptions upgrade', () => {
      const seatPb = OPS_RESOLUTION_PLAYBOOKS.find((p) => p.errorCode === 'COMMERCIAL-001');
      expect(seatPb).toBeDefined();
      expect(seatPb?.severity).toBe('P1');
      expect(seatPb?.targetNavId).toBe('platform-tenants');
      expect(seatPb?.whatToDoSteps.some((s) => s.includes('upgrade_tenant_subscription_plan'))).toBe(true);
    });

    it('verifies that GEOFENCE-001 reinforces Safe Departure checkout policy', () => {
      const geoPb = OPS_RESOLUTION_PLAYBOOKS.find((p) => p.errorCode === 'GEOFENCE-001');
      expect(geoPb).toBeDefined();
      expect(geoPb?.whatToDoSteps.some((s) => s.includes('WARN_ONLY (Safe Departure)'))).toBe(true);
    });
  });
});
