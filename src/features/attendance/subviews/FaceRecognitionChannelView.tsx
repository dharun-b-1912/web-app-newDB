import React, { useState, useEffect } from 'react';
import {
  ScanFace,
  Camera,
  MonitorDot,
  FileText,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Plus,
  Activity,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useToast } from '../../../components/ui/Toast';

export interface FaceRecognitionChannelViewProps {
  currentTab?: string;
  onNavigateSubPath?: (path: string) => void;
  onOpenEmployeeProfile?: (empId: string) => void;
}

export const FaceRecognitionChannelView: React.FC<FaceRecognitionChannelViewProps> = ({
  currentTab = 'face-attendance',
  onNavigateSubPath,
  onOpenEmployeeProfile,
}) => {
  const { showToast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'attendance' | 'enrollment' | 'devices' | 'logs' | 'exceptions'>(() => {
    if (currentTab === 'face-enrollment') return 'enrollment';
    if (currentTab === 'face-devices') return 'devices';
    if (currentTab === 'face-logs') return 'logs';
    if (currentTab === 'face-exceptions') return 'exceptions';
    return 'attendance';
  });

  useEffect(() => {
    if (currentTab === 'face-enrollment') setActiveSubTab('enrollment');
    else if (currentTab === 'face-devices') setActiveSubTab('devices');
    else if (currentTab === 'face-logs') setActiveSubTab('logs');
    else if (currentTab === 'face-exceptions') setActiveSubTab('exceptions');
    else if (currentTab === 'face-attendance') setActiveSubTab('attendance');
  }, [currentTab]);

  const handleTabSwitch = (tab: 'attendance' | 'enrollment' | 'devices' | 'logs' | 'exceptions') => {
    setActiveSubTab(tab);
    if (onNavigateSubPath) {
      const map: Record<string, string> = {
        attendance: 'face-attendance',
        enrollment: 'face-enrollment',
        devices: 'face-devices',
        logs: 'face-logs',
        exceptions: 'face-exceptions',
      };
      onNavigateSubPath(map[tab]);
    }
  };

  // Face recognition devices
  const kiosks = [
    { id: 'kiosk-01', name: 'HQ Reception Face Kiosk A', location: 'Coimbatore HQ · Lobby Gate 1', status: 'ONLINE', ip: '192.168.1.45', fps: 30, resolution: '1080p', todayMatches: 142, lastPing: 'Just now' },
    { id: 'kiosk-02', name: 'HQ Cafeteria Optical Gate', location: 'Coimbatore HQ · Floor 2', status: 'ONLINE', ip: '192.168.1.48', fps: 28, resolution: '1080p', todayMatches: 98, lastPing: '1 min ago' },
    { id: 'kiosk-03', name: 'Chennai Plant Turnstile Optical', location: 'Chennai Factory · Main Gate', status: 'ONLINE', ip: '10.20.4.12', fps: 25, resolution: '720p', todayMatches: 310, lastPing: 'Just now' },
    { id: 'kiosk-04', name: 'Hosur Plant Production Gate', location: 'Hosur Plant · Shop Floor', status: 'WARNING', ip: '10.30.2.18', fps: 12, resolution: '720p', todayMatches: 84, lastPing: '4 mins ago' },
  ];

  // Live recognition stream feed
  const recognitionLogs = [
    { id: 'face-log-1', employee_id: 'emp-hr-001', employee_name: 'Hari Priya', employee_code: 'WF-1001', department: 'People & HR', kiosk: 'HQ Reception Face Kiosk A', timestamp: '09:04:12 AM', confidence: 99.4, status: 'MATCHED', spoof_score: 0.02, photo_status: 'VERIFIED' },
    { id: 'face-log-2', employee_id: 'emp-admin-001', employee_name: 'Dharun Joy', employee_code: 'WF-1000', department: 'Executive Management', kiosk: 'HQ Reception Face Kiosk A', timestamp: '08:58:30 AM', confidence: 98.7, status: 'MATCHED', spoof_score: 0.01, photo_status: 'VERIFIED' },
    { id: 'face-log-3', employee_id: 'emp-mgr-001', employee_name: 'Karthik Natarajan', employee_code: 'WF-1002', department: 'Engineering & DevOps', kiosk: 'HQ Cafeteria Optical Gate', timestamp: '09:12:05 AM', confidence: 96.2, status: 'MATCHED', spoof_score: 0.04, photo_status: 'VERIFIED' },
    { id: 'face-log-4', employee_id: 'emp-tl-001', employee_name: 'Deepa Subramanian', employee_code: 'WF-1003', department: 'Engineering & DevOps', kiosk: 'HQ Reception Face Kiosk A', timestamp: '09:15:40 AM', confidence: 97.9, status: 'MATCHED', spoof_score: 0.02, photo_status: 'VERIFIED' },
    { id: 'face-log-5', employee_id: 'emp-unk-01', employee_name: 'Unknown Individual', employee_code: 'UNRESOLVED', department: 'Unassigned', kiosk: 'Hosur Plant Production Gate', timestamp: '10:02:18 AM', confidence: 64.1, status: 'EXCEPTION', spoof_score: 0.28, photo_status: 'LOW_CONFIDENCE' },
  ];

  // Face enrollment registry
  const enrollments = [
    { id: 'enr-01', employee_name: 'Hari Priya', employee_code: 'WF-1001', department: 'People & HR', vector_status: 'ENROLLED (5 Angles)', quality_score: '98%', updated_at: '2026-08-10', status: 'ACTIVE' },
    { id: 'enr-02', employee_name: 'Dharun Joy', employee_code: 'WF-1000', department: 'Executive Management', vector_status: 'ENROLLED (5 Angles)', quality_score: '99%', updated_at: '2026-08-01', status: 'ACTIVE' },
    { id: 'enr-03', employee_name: 'Karthik Natarajan', employee_code: 'WF-1002', department: 'Engineering & DevOps', vector_status: 'ENROLLED (3 Angles)', quality_score: '94%', updated_at: '2026-08-05', status: 'ACTIVE' },
    { id: 'enr-04', employee_name: 'Deepa Subramanian', employee_code: 'WF-1003', department: 'Engineering & DevOps', vector_status: 'ENROLLED (5 Angles)', quality_score: '97%', updated_at: '2026-08-02', status: 'ACTIVE' },
  ];

  return (
    <div className="space-y-4">
      {/* 1. Header & Channel Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-50 text-[#07563D] rounded-lg">
              <ScanFace className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-gray-900">Face Recognition Clocking Channel</h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-800 rounded-full">
              AI Optical Engine Active
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Touchless optical face attendance, biometric vector enrollment, confidence logs, and anti-spoof telemetry.
          </p>
        </div>

        {/* Sub-tab segmented bar */}
        <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs">
          <button
            onClick={() => handleTabSwitch('attendance')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5',
              activeSubTab === 'attendance' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <ScanFace className="w-3.5 h-3.5" />
            Live Stream
          </button>
          <button
            onClick={() => handleTabSwitch('enrollment')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5',
              activeSubTab === 'enrollment' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <Camera className="w-3.5 h-3.5" />
            Face Enrollment
          </button>
          <button
            onClick={() => handleTabSwitch('devices')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5',
              activeSubTab === 'devices' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <MonitorDot className="w-3.5 h-3.5" />
            Kiosks & Gateways ({kiosks.length})
          </button>
          <button
            onClick={() => handleTabSwitch('logs')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5',
              activeSubTab === 'logs' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            Recognition Logs
          </button>
          <button
            onClick={() => handleTabSwitch('exceptions')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5',
              activeSubTab === 'exceptions' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Match Exceptions
          </button>
        </div>
      </div>

      {/* 2. LIVE STREAM & STATS */}
      {activeSubTab === 'attendance' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
              <span className="text-gray-500 font-medium">Face Punches Today</span>
              <div className="text-2xl font-bold text-gray-900 mt-1">634</div>
              <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3 h-3" /> 99.2% auto-matched
              </span>
            </div>
            <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
              <span className="text-gray-500 font-medium">Active AI Optical Kiosks</span>
              <div className="text-2xl font-bold text-emerald-700 mt-1">4 / 4</div>
              <span className="text-[11px] text-gray-500 font-medium mt-1 block">
                Avg. latency: 120ms
              </span>
            </div>
            <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
              <span className="text-gray-500 font-medium">Avg Confidence Score</span>
              <div className="text-2xl font-bold text-indigo-700 mt-1">98.4%</div>
              <span className="text-[11px] text-indigo-600 font-medium mt-1 block">
                Cosine similarity threshold: 85.0%
              </span>
            </div>
            <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
              <span className="text-gray-500 font-medium">Anti-Spoofing & Liveness</span>
              <div className="text-2xl font-bold text-teal-700 mt-1">100% Pass</div>
              <span className="text-[11px] text-teal-600 font-medium mt-1 block">
                3D depth & blink validation active
              </span>
            </div>
          </div>

          {/* Live Feed Table */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">Real-Time Face Match Feed</h3>
              </div>
              <button
                onClick={() => showToast('Live stream synced with gateway cameras.')}
                className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1 font-semibold"
              >
                <RefreshCw className="w-3 h-3" /> Refresh Feed
              </button>
            </div>

            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                <tr>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Optical Kiosk</th>
                  <th className="p-3">Time</th>
                  <th className="p-3">Match Confidence</th>
                  <th className="p-3">Liveness</th>
                  <th className="p-3 text-right">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recognitionLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="p-3">
                      <div
                        onClick={() => onOpenEmployeeProfile?.(log.employee_id)}
                        className="font-bold text-gray-900 hover:text-[#07563D] cursor-pointer"
                      >
                        {log.employee_name}
                      </div>
                      <div className="text-[11px] text-gray-500 font-mono">{log.employee_code}</div>
                    </td>
                    <td className="p-3 text-gray-700">{log.department}</td>
                    <td className="p-3 font-medium text-gray-700">{log.kiosk}</td>
                    <td className="p-3 font-mono font-semibold text-gray-900">{log.timestamp}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full', log.confidence >= 90 ? 'bg-emerald-500' : 'bg-amber-500')}
                            style={{ width: `${log.confidence}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold">{log.confidence}%</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                        Passed (3D Depth)
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {log.status === 'MATCHED' ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
                          Clocked In
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 rounded-full">
                          Review Required
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. FACE ENROLLMENT */}
      {activeSubTab === 'enrollment' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div>
              <h3 className="text-xs font-bold text-gray-900">Biometric Vector Enrollment Desk</h3>
              <p className="text-xs text-gray-500">Capture 5-angle biometric facial embeddings for touchless kiosk pairing.</p>
            </div>
            <button
              onClick={() => showToast('Face enrollment scanner initialized on connected webcam/kiosk.')}
              className="px-3 py-1.5 bg-[#07563D] text-white rounded-lg text-xs font-semibold hover:bg-[#064e37] transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Enroll New Employee
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                <tr>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Vector Embedding Quality</th>
                  <th className="p-3">Enrollment Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {enrollments.map(enr => (
                  <tr key={enr.id} className="hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-bold text-gray-900">{enr.employee_name}</div>
                      <div className="text-[11px] text-gray-500 font-mono">{enr.employee_code}</div>
                    </td>
                    <td className="p-3 text-gray-700">{enr.department}</td>
                    <td className="p-3">
                      <div className="font-medium text-emerald-700">{enr.vector_status}</div>
                      <div className="text-[10px] text-gray-500">Quality Score: {enr.quality_score}</div>
                    </td>
                    <td className="p-3 text-gray-600">{enr.updated_at}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
                        {enr.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => showToast(`Re-indexing biometric face vector for ${enr.employee_name}...`)}
                        className="text-xs text-[#07563D] hover:underline font-semibold"
                      >
                        Re-scan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. KIOSKS & GATEWAYS */}
      {activeSubTab === 'devices' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {kiosks.map(k => (
            <div key={k.id} className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-900">{k.name}</h4>
                  <p className="text-[11px] text-gray-500">{k.location}</p>
                </div>
                <span
                  className={cn(
                    'px-2 py-0.5 text-[10px] font-bold rounded-full',
                    k.status === 'ONLINE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  )}
                >
                  {k.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 p-2 bg-gray-50 rounded text-[11px] text-gray-600 font-mono">
                <div>
                  <span className="text-[10px] text-gray-400 block">IP ADDR</span>
                  {k.ip}
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block">FPS / RES</span>
                  {k.fps} fps · {k.resolution}
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block">TODAY PUNCH</span>
                  <strong className="text-gray-900">{k.todayMatches}</strong>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                <span className="text-gray-400 text-[11px]">Heartbeat: {k.lastPing}</span>
                <button
                  onClick={() => showToast(`Sent test ping to ${k.name} (${k.ip}) - Response: 18ms`)}
                  className="px-2.5 py-1 text-[11px] font-semibold border border-gray-200 rounded hover:bg-gray-50"
                >
                  Test Ping
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. LOGS & EXCEPTIONS */}
      {(activeSubTab === 'logs' || activeSubTab === 'exceptions') && (
        <div className="p-4 bg-white border border-gray-200 rounded-lg text-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900">
              {activeSubTab === 'exceptions' ? 'Face Match Exception Queue' : 'Historical Recognition Telemetry'}
            </h3>
            <span className="text-gray-500">Showing last 50 optical camera match traces</span>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <div>
                <strong className="text-gray-900 block">Hosur Plant Gate · Low Confidence Match (64.1%)</strong>
                <span className="text-[11px] text-gray-600">Candidate image matched below threshold (85.0%). Manual verification recommended.</span>
              </div>
            </div>
            <button
              onClick={() => showToast('Exception forwarded to HR Attendance Regularization Desk.')}
              className="px-2.5 py-1 bg-amber-700 text-white rounded text-xs font-semibold hover:bg-amber-800"
            >
              Resolve
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
