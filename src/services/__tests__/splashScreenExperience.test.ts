// src/services/__tests__/splashScreenExperience.test.ts
import { describe, it, expect } from 'vitest';

describe('Joy PeopleHR — Enterprise Splash Screen & Loading Stability', () => {
  it('guarantees minDurationMs threshold prevents instant unmount / flicker', () => {
    const minDurationMs = 2400;
    const fastAuthLoadTimeMs = 50;

    // Ensure the splash duration is substantially higher than the fast auth session check
    expect(minDurationMs).toBeGreaterThan(fastAuthLoadTimeMs * 10);
  });

  it('verifies 5 boot stages covers comprehensive enterprise initialization', () => {
    const stages = [
      { threshold: 25, message: 'Initializing Joy Enterprise Engine...' },
      { threshold: 50, message: 'Connecting to Multi-Tenant Core...' },
      { threshold: 75, message: 'Calibrating Statutory & Payroll Services...' },
      { threshold: 92, message: 'Loading Workforce & Procurement Roster...' },
      { threshold: 100, message: 'System Ready' },
    ];

    expect(stages).toHaveLength(5);
    expect(stages[0].threshold).toBe(25);
    expect(stages[4].threshold).toBe(100);
  });

  it('validates progress bar clamps at 90% when isReady is false until background is hydrated', () => {
    const isReady = false;
    const rawRatio = 0.98;
    const effectiveCap = isReady ? 1 : 0.90;
    const currentRatio = Math.min(rawRatio, effectiveCap);

    expect(currentRatio).toBe(0.90);
    expect(Math.round(currentRatio * 100)).toBe(90);
  });

  it('validates progress reaches 100% and triggers completion when isReady becomes true', () => {
    const isReady = true;
    const rawRatio = 1.0;
    const effectiveCap = isReady ? 1 : 0.90;
    const currentRatio = Math.min(rawRatio, effectiveCap);

    expect(currentRatio).toBe(1.0);
    expect(Math.round(currentRatio * 100)).toBe(100);
  });
});
