import React, { useState, useEffect } from 'react';
import {
  Terminal,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Copy,
  Download,
  Trash2,
  X,
  Search,
  Filter,
  RefreshCw,
  Bug,
} from 'lucide-react';
import { appLogger, LogEntry, LogLevel, Subsystem } from '../../lib/appLogger';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';

interface AppDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppDiagnosticsModal: React.FC<AppDiagnosticsModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [selectedSubsystem, setSelectedSubsystem] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  const refreshLogs = () => {
    const data = appLogger.getRecentLogs();
    setLogs(data);
    if (data.length > 0 && !selectedLog) {
      setSelectedLog(data[0]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshLogs();
    }
    const handleNewLog = () => {
      if (isOpen) refreshLogs();
    };
    window.addEventListener('wf-app-log', handleNewLog);
    return () => window.removeEventListener('wf-app-log', handleNewLog);
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    const matchesLevel = selectedLevel === 'ALL' || log.level === selectedLevel;
    const matchesSubsystem = selectedSubsystem === 'ALL' || log.subsystem === selectedSubsystem;
    const matchesSearch =
      searchTerm === '' ||
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.cause && log.cause.toLowerCase().includes(searchTerm.toLowerCase())) ||
      log.subsystem.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesLevel && matchesSubsystem && matchesSearch;
  });

  const handleCopyReport = () => {
    const report = appLogger.exportDiagnosticReport();
    navigator.clipboard.writeText(report);
    showToast('Telemetry diagnostic report copied to clipboard!', 'success');
  };

  const handleDownloadReport = () => {
    const report = appLogger.exportDiagnosticReport();
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `joy-peoplehr-telemetry-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Diagnostic report downloaded.', 'success');
  };

  const errorCount = logs.filter((l) => l.level === 'ERROR' || l.level === 'CRASH').length;
  const warnCount = logs.filter((l) => l.level === 'WARN').length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">System Diagnostics & Telemetry Hub</h3>
                <Badge variant={errorCount > 0 ? 'rose' : 'emerald'} size="sm">
                  {errorCount > 0 ? `${errorCount} Errors Detected` : 'All Systems Operational'}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400">
                Real-time event logging, Supabase network tracing, and resilient fallback status
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleCopyReport} className="text-slate-300 border-slate-700 hover:bg-slate-800 text-xs">
              <Copy className="w-3.5 h-3.5 mr-1" /> Copy Report
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownloadReport} className="text-slate-300 border-slate-700 hover:bg-slate-800 text-xs">
              <Download className="w-3.5 h-3.5 mr-1" /> Download JSON
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center gap-3 text-xs">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search logs, errors, or root causes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-semibold">Level:</span>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Levels ({logs.length})</option>
              <option value="ERROR">Errors ({errorCount})</option>
              <option value="WARN">Warnings ({warnCount})</option>
              <option value="DB_OP">DB Queries</option>
              <option value="INFO">Info</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-semibold">Subsystem:</span>
            <select
              value={selectedSubsystem}
              onChange={(e) => setSelectedSubsystem(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Subsystems</option>
              <option value="SUPABASE">Supabase</option>
              <option value="BRANCHES">Branches</option>
              <option value="DEPARTMENTS">Departments</option>
              <option value="WORKFORCE">Workforce</option>
              <option value="VENDOR_PORTAL">Vendor Portal</option>
              <option value="PAYROLL">Payroll</option>
            </select>
          </div>

          <button
            onClick={refreshLogs}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Refresh Logs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Master-Detail Split Pane */}
        <div className="flex-1 flex overflow-hidden">
          {/* Logs List Pane */}
          <div className="w-1/2 border-r border-slate-800 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1">
            {filteredLogs.map((log) => {
              const isSelected = selectedLog?.id === log.id;
              const isError = log.level === 'ERROR' || log.level === 'CRASH';
              const isWarn = log.level === 'WARN';

              return (
                <button
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className={`w-full text-left p-2.5 rounded-xl transition flex items-start gap-2.5 ${
                    isSelected
                      ? 'bg-indigo-950/60 border border-indigo-500/40 text-white'
                      : 'hover:bg-slate-800/50 text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {isError ? (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    ) : isWarn ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    ) : log.level === 'DB_OP' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Info className="w-4 h-4 text-blue-400" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-mono text-[10px] text-slate-400">
                          {log.timestamp.split('T')[1].slice(0, 8)}
                        </span>
                        <span className="font-mono text-[10px] font-bold text-indigo-400 px-1.5 py-0.2 bg-slate-950 rounded">
                          [{log.subsystem}]
                        </span>
                      </div>
                      {log.fallbackUsed && (
                        <span className="text-[9px] font-semibold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40">
                          Fallback
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium truncate mt-1 text-slate-200">
                      {log.message}
                    </p>
                    {log.cause && (
                      <p className="text-[11px] text-rose-300/80 truncate mt-0.5 font-mono">
                        Cause: {log.cause}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}

            {filteredLogs.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-xs">
                No logs matching the current filter.
              </div>
            )}
          </div>

          {/* Log Detail Inspector */}
          <div className="w-1/2 bg-slate-950 p-4 overflow-y-auto space-y-4">
            {selectedLog ? (
              <div className="space-y-4 text-xs font-mono">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] text-slate-500">EVENT ID</span>
                    <p className="text-slate-300 font-bold">{selectedLog.id}</p>
                  </div>
                  <Badge
                    variant={
                      selectedLog.level === 'ERROR' || selectedLog.level === 'CRASH'
                        ? 'rose'
                        : selectedLog.level === 'WARN'
                        ? 'amber'
                        : selectedLog.level === 'DB_OP'
                        ? 'emerald'
                        : 'blue'
                    }
                    size="sm"
                  >
                    {selectedLog.level}
                  </Badge>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 block mb-1">EVENT SUMMARY</span>
                  <p className="text-sm font-sans font-bold text-white bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    {selectedLog.message}
                  </p>
                </div>

                {selectedLog.cause && (
                  <div>
                    <span className="text-[10px] text-rose-400 block mb-1 font-bold">
                      ROOT CAUSE & EXPLANATION
                    </span>
                    <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-xl text-rose-200 text-xs leading-relaxed whitespace-pre-wrap">
                      {selectedLog.cause}
                    </div>
                  </div>
                )}

                {selectedLog.payload && (
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-1">CONTEXT & DATA PAYLOAD</span>
                    <pre className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 text-[11px] overflow-x-auto max-h-60 scrollbar-thin">
                      {JSON.stringify(selectedLog.payload, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.errorStack && (
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-1">STACK TRACE</span>
                    <pre className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 text-[10px] overflow-x-auto max-h-40 scrollbar-thin">
                      {selectedLog.errorStack}
                    </pre>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-3 border-t border-slate-800">
                  <div>
                    <span className="text-slate-500">Subsystem:</span>{' '}
                    <span className="text-indigo-300 font-bold">{selectedLog.subsystem}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Route:</span>{' '}
                    <span className="text-slate-300">{selectedLog.route || '/'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Fallback Used:</span>{' '}
                    <span className={selectedLog.fallbackUsed ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                      {selectedLog.fallbackUsed ? 'YES (Resilient Mode)' : 'NO'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Timestamp:</span>{' '}
                    <span className="text-slate-300">{selectedLog.timestamp}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                Select a log from the left list to inspect details.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
