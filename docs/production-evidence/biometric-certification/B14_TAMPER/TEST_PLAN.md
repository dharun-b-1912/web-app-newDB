# 🏛️ Gate B14: Physical Tamper Sensor Detection Test Plan

---

## 1. Physical Trigger Chain
Physical microswitch / optical tamper sensor breach on device chassis triggers hardware packet $\rightarrow$ `biometricGatewayService` $\rightarrow$ `biometric.device_tamper_detected` event.

---

## 2. Event Cascade & Lifecycle
1. **Device Status Update**: Device automatically marked `TAMPER_ALERT` in DB.
2. **Realtime Broadcast**: Command Center alert sent to security personnel.
3. **Escalation Lifecycle**: State set to `UNACKNOWLEDGED` (cannot be silently auto-closed).
4. **Access Restriction**: Automatic temporary lockout of physical door relay until supervisor inspection.
