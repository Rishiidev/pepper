import React, { useEffect, useState } from 'react';
import { systemHealthEngine, ComprehensiveHealthReport } from '../core/engines/system-health';
import { telemetryEngine, TelemetrySummary } from '../core/intelligence/telemetry/telemetry-engine';
import { X, CheckCircle2, AlertTriangle, Cpu, Activity, RefreshCw } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const HealthDashboardModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [report, setReport] = useState<ComprehensiveHealthReport | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetrySummary | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const runCheck = async () => {
    setIsRefreshing(true);
    try {
      const rep = await systemHealthEngine.runDiagnostic();
      const tel = await telemetryEngine.getSummary();
      setReport(rep);
      setTelemetry(tel);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen) runCheck();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-card border border-border rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 text-text-primary">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-pepper-500/10 text-pepper-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">System Health &amp; Diagnostic Panel</h3>
              <p className="text-[11px] text-text-muted">Live architectural status &amp; provider verification</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={runCheck}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg border border-border text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
              title="Refresh Diagnostic"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:bg-surface-hover">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Overall Health Score Card */}
        {report && (
          <div className="p-4 rounded-xl bg-surface border border-border/80 flex items-center justify-between">
            <div>
              <span className="text-xs text-text-muted font-medium block">Overall System Health</span>
              <span className="text-2xl font-bold text-text-primary">{report.overallHealthScore}% Operational</span>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                report.overallHealthScore >= 80
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              {report.overallHealthScore >= 80 ? 'ALL SYSTEMS NORMAL' : 'PARTIAL DEGRADATION'}
            </span>
          </div>
        )}

        {/* Subsystem Health Grid */}
        {report && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">Subsystem Status</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {report.services.map((srv, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-border/60 bg-surface/40 flex items-start gap-2.5">
                  {srv.isHealthy ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-xs text-text-primary block">{srv.service}</span>
                    <span className="text-[11px] text-text-muted truncate block">{srv.message}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Telemetry Stats */}
        {telemetry && (
          <div className="space-y-2 pt-2 border-t border-border">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-pepper-400" />
              <span>Live AI Telemetry</span>
            </h4>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-surface border border-border/60">
                <span className="text-[10px] text-text-muted block">Requests</span>
                <span className="font-bold text-text-primary">{telemetry.totalRequests}</span>
              </div>
              <div className="p-2 rounded-lg bg-surface border border-border/60">
                <span className="text-[10px] text-text-muted block">Success Rate</span>
                <span className="font-bold text-emerald-400">{telemetry.successRatePercent}%</span>
              </div>
              <div className="p-2 rounded-lg bg-surface border border-border/60">
                <span className="text-[10px] text-text-muted block">Avg Latency</span>
                <span className="font-bold text-pepper-400">{telemetry.avgLatencyMs} ms</span>
              </div>
              <div className="p-2 rounded-lg bg-surface border border-border/60">
                <span className="text-[10px] text-text-muted block">Cache Hit</span>
                <span className="font-bold text-blue-400">{telemetry.cacheHitRatePercent}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 bg-pepper-500 text-white font-bold text-xs rounded-xl hover:bg-pepper-600">
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
};
