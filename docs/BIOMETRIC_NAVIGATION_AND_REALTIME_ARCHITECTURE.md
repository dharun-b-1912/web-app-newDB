# JOY PEOPLEHR — BIOMETRIC DEVICES NAVIGATION & REALTIME ARCHITECTURE

## 1. Overview & Root Cause Analysis

### The Problem
When users navigate to **CLOCKING & DEVICES → BIOMETRIC DEVICES**, the web application previously suffered from:
- Stalls / 1–3 second delays on tab switching
- Console errors: `@supabase_supabase-js.js WebSocket connection to ... failed: WebSocket is closed before the connection is established`
- Supabase Realtime reconnection storms and channel thrashing
- Overfetching of 7 datasets concurrently when opening the biometric workspace

### Root Cause
1. **Ad-Hoc WebSocket Subscriptions on Route Change**:
   Individual subviews (`EmployeeAttendanceView`, `AttendanceDashboardView`, `AuditControlView`, `ExpenseClaimsView`, `DocumentManagementView`, `CommandCenterView`) called `supabase.channel(...)` on mount and `supabase.removeChannel(channel)` on unmount. Rapidly clicking between sub-tabs tore down the socket while it was still connecting, causing Supabase to throw WebSocket abort errors and repeatedly back off and reconnect.
2. **Synchronous/Heavy Data Loading**:
   Opening biometric sub-workspaces concurrently queried full user lists, punches, commands, sync logs, and diagnostic records simultaneously without pagination or on-demand lazy loading.

---

## 2. Decoupled Architecture Model

```
                         JOY PEOPLEHR WEB
                               |
                               | (0ms Instant Transition)
                         ROUTER / APP
                               |
              +----------------+----------------+
              |                                 |
        NORMAL DATA                         REALTIME
        QUERY/API                         CHANNEL MGR
              |                           (Single Mesh)
              ↓                                 ↓
          SUPABASE DB                    SUPABASE REALTIME
              |
              | (Async Status)
        DEVICE STATE
              |
              ↓
        JOY CONNECTOR (Optional / Async)
              |
              ↓
       DEVICE ADAPTER
              |
              ↓
     eSSL AI-FACE MAGNUM (Hardware Terminal)
```

### Core Invariants
- **Router does NOT wait for physical device.**
- **Router does NOT wait for Joy Connector or local TCP ports.**
- **Router does NOT wait for WebSocket connection or handshake.**
- **Biometric page shell mounts instantaneously ($<50\text{ms}$) from memory/cache.**
- **All hardware probes, sync operations, and diagnostics execute purely asynchronously in background workers.**

---

## 3. Realtime Lifecycle & Single-Mesh Architecture

Instead of allocating ad-hoc WebSocket channels per React component, Joy PeopleHR uses a single unified mesh channel (`wf-realtime-unified-mesh`) managed by `RealtimeChannelManager`.

### Subscription Lifecycle
1. When a component mounts, it calls `realtimeChannelManager.subscribeToTable('biometric_devices', handler)`.
2. The handler is registered in an in-memory `Set<RealtimeChangeHandler>`.
3. When the component unmounts, the returned cleanup function **only deletes the handler callback** from the set.
4. The underlying WebSocket connection and channel remain active and shared across all modules without tearing down or churning connections.

```typescript
// Pattern used across all attendance & biometric views:
useEffect(() => {
  const unsubDevs = realtimeChannelManager.subscribeToTable('biometric_devices', () => debouncedLoadData());
  const unsubPunches = realtimeChannelManager.subscribeToTable('biometric_punches', () => debouncedLoadData());
  return () => {
    unsubDevs();
    unsubPunches();
  };
}, []);
```

---

## 4. Hardware & Connector Lifecycle

The browser **NEVER attempts direct TCP connections** to LAN terminals (`192.168.x.x:4370`). Communication flows through Joy Connector:

```
[Browser Web App]  <--HTTPS/REST/WS-->  [JOY Cloud Backend]  <--HTTPS Tunnel-->  [JOY Connector Agent]  <--TCP-->  [eSSL Hardware Terminal]
```

### Timeout Boundaries
- **Database queries**: 10 seconds bounded timeout
- **API calls**: 10 seconds bounded timeout
- **Connector health probe**: 400ms timeout with circuit-breaker (5-minute backoff if offline)
- **Device socket probe**: 5 seconds bounded timeout
- **Device clock sync**: 5 seconds bounded timeout

---

## 5. Machine Users Pagination & Lazy Loading

To support factory environments with 500+ employees:
1. **Lazy Loading**: `BiometricDeviceWorkspace` only queries data relevant to the active tab (`overview`, `users`, `attendance`, `commands`, `health`, `sync_history`, `diagnostics`).
2. **Pagination**: The `Machine Users` tab renders in pages of 25, 50, or 100 rows with server-side/client-side chunking and memoized filtering.

---

## 6. Multi-Tenant & RBAC Isolation

- All device records, commands, and punches require `organization_id` verification.
- Realtime events are filtered by tenant scope.
- LocalStorage is strictly a display cache; backend RLS and JWT claims are the authoritative security boundaries.

---

## 7. Rollback & Failover Strategy

- If the physical device is turned off: The UI displays `Device: OFFLINE` and remains 100% interactive.
- If Joy Connector is stopped: The UI displays `Connector: OFFLINE` with last heartbeat timestamp.
- If Supabase Realtime fails: The UI seamlessly falls back to standard REST/database polling without redirecting, reloading, or throwing unhandled errors.
