import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { UserRole, Alert } from '../../types/index.ts';
import { ShieldAlert, Play, Check, AlertTriangle, Sliders, RefreshCw, Info, HelpCircle } from 'lucide-react';

interface ScreeningEngineViewProps {
  currentRole: UserRole;
  onAlertsUpdated?: () => void;
}

export const ScreeningEngineView: React.FC<ScreeningEngineViewProps> = ({ currentRole, onAlertsUpdated }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);

  // Configurable Veterinary Thresholds
  const [thresholds, setThresholds] = useState({
    scc_subclinical_threshold: 200000,
    scc_urgent_threshold: 1000000,
    yield_drop_percent_threshold: 15.0,
    yield_drop_urgent_percent: 30.0,
    electrical_conductivity_threshold: 5.8,
    body_temp_fever_threshold: 39.2
  });

  const [filterCategory, setFilterCategory] = useState<string>('');

  useEffect(() => {
    loadAlerts();
  }, [filterCategory]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const data = await api.getAlerts({
        risk_category: filterCategory || undefined
      });
      setAlerts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunPipeline = async () => {
    setIsRunning(true);
    setRunResult(null);
    try {
      const res = await api.runScreening(thresholds, `${currentRole} (Manual Pipeline Run)`);
      setRunResult(res);
      loadAlerts();
      onAlertsUpdated?.();
    } catch (err: any) {
      alert(`Pipeline error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title & Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">AI & Veterinary Screening Pipeline</h2>
          <p className="text-xs text-slate-500">Multimodal early warning engine combining yield drop, SCC deviations, and sensor telemetry</p>
        </div>

        <button
          onClick={handleRunPipeline}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg shadow-sm transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          {isRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          <span>Run Screening Analysis Across Herd</span>
        </button>
      </div>

      {/* Mandatory Regulatory Warning */}
      <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-start gap-3.5 text-xs text-emerald-950">
        <Info className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-emerald-900 uppercase tracking-wider text-[11px]">
            SCREENING PRIORITY — NOT A DIAGNOSIS
          </div>
          <p className="text-emerald-900 leading-relaxed">
            The indicator score is a transparent composite screening prioritization measure derived from historical milk yield deviations, Somatic Cell Count, CMT, and environmental risk factors. It is <strong>not a clinical probability of disease</strong>. Does not prescribe antimicrobial medicines.
          </p>
        </div>
      </div>

      {/* Configurable Veterinary Thresholds Panel */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-slate-600" />
            <h3 className="font-semibold text-slate-900 text-sm">Configurable Clinical Screening Thresholds</h3>
          </div>
          <span className="text-[11px] text-slate-500">IDF / TANUVAS standard recommended defaults</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 text-xs">
          <div>
            <label className="block text-slate-600 font-medium mb-1">SCC Subclinical</label>
            <input
              type="number"
              step="10000"
              value={thresholds.scc_subclinical_threshold}
              onChange={(e) => setThresholds({ ...thresholds, scc_subclinical_threshold: parseInt(e.target.value, 10) })}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono"
            />
            <span className="text-[10px] text-slate-400">Default: 200,000</span>
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">SCC Urgent Acute</label>
            <input
              type="number"
              step="50000"
              value={thresholds.scc_urgent_threshold}
              onChange={(e) => setThresholds({ ...thresholds, scc_urgent_threshold: parseInt(e.target.value, 10) })}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono"
            />
            <span className="text-[10px] text-slate-400">Default: 1,000,000</span>
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Yield Drop %</label>
            <input
              type="number"
              step="1"
              value={thresholds.yield_drop_percent_threshold}
              onChange={(e) => setThresholds({ ...thresholds, yield_drop_percent_threshold: parseFloat(e.target.value) })}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono"
            />
            <span className="text-[10px] text-slate-400">Default: 15%</span>
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Yield Drop Acute %</label>
            <input
              type="number"
              step="1"
              value={thresholds.yield_drop_urgent_percent}
              onChange={(e) => setThresholds({ ...thresholds, yield_drop_urgent_percent: parseFloat(e.target.value) })}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono"
            />
            <span className="text-[10px] text-slate-400">Default: 30%</span>
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Conductivity (mS/cm)</label>
            <input
              type="number"
              step="0.1"
              value={thresholds.electrical_conductivity_threshold}
              onChange={(e) => setThresholds({ ...thresholds, electrical_conductivity_threshold: parseFloat(e.target.value) })}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono"
            />
            <span className="text-[10px] text-slate-400">Default: 5.8</span>
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Fever Cut-off (°C)</label>
            <input
              type="number"
              step="0.1"
              value={thresholds.body_temp_fever_threshold}
              onChange={(e) => setThresholds({ ...thresholds, body_temp_fever_threshold: parseFloat(e.target.value) })}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono"
            />
            <span className="text-[10px] text-slate-400">Default: 39.2°C</span>
          </div>
        </div>
      </div>

      {/* Execution Results Notification */}
      {runResult && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1 animate-fadeIn">
          <div className="font-semibold text-emerald-900 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-700" />
            <span>Screening Execution Finished Successfully</span>
          </div>
          <div className="text-emerald-800">
            Scanned {runResult.scanned_cows} cows in herd. Created {runResult.new_alerts_created} new screening alerts, refreshed {runResult.existing_alerts_updated} alerts.
          </div>
          <div className="font-mono text-[11px] text-emerald-700 pt-1">
            Breakdown: Urgent: {runResult.categories_count['Urgent veterinary review']} · High Priority: {runResult.categories_count['High screening priority']} · Monitor: {runResult.categories_count['Monitor and recheck']} · Insufficient Data: {runResult.categories_count['Insufficient data']}
          </div>
        </div>
      )}

      {/* Filter Category Segmented Control */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setFilterCategory('')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
            filterCategory === '' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All Categories ({alerts.length})
        </button>
        <button
          onClick={() => setFilterCategory('Urgent veterinary review')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
            filterCategory === 'Urgent veterinary review' ? 'bg-rose-700 text-white' : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
          }`}
        >
          Urgent Veterinary Review
        </button>
        <button
          onClick={() => setFilterCategory('High screening priority')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
            filterCategory === 'High screening priority' ? 'bg-amber-700 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
          }`}
        >
          High Screening Priority
        </button>
        <button
          onClick={() => setFilterCategory('Monitor and recheck')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
            filterCategory === 'Monitor and recheck' ? 'bg-blue-700 text-white' : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
          }`}
        >
          Monitor & Recheck
        </button>
        <button
          onClick={() => setFilterCategory('Insufficient data')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
            filterCategory === 'Insufficient data' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Insufficient Data
        </button>
      </div>

      {/* Explainable Screening Cards */}
      <div className="space-y-3.5">
        {alerts.map((a) => {
          const reasons: string[] = JSON.parse(a.reasons_json || '[]');
          const isUrgent = a.risk_category === 'Urgent veterinary review';
          const isHigh = a.risk_category === 'High screening priority';
          const isDataMissing = a.risk_category === 'Insufficient data';

          return (
            <div
              key={a.alert_id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3 hover:border-slate-300 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                    isUrgent ? 'bg-rose-100 text-rose-800' :
                    isHigh ? 'bg-amber-100 text-amber-800' :
                    isDataMissing ? 'bg-slate-100 text-slate-700' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {a.risk_category}
                  </span>
                  <span className="font-bold text-slate-900 text-sm">Cow {a.tag_number} ({a.breed})</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs text-slate-600">{a.farm_name}</span>
                  <span className="text-slate-300">·</span>
                  <span className="font-mono text-xs text-slate-400">{a.created_at}</span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400">Indicator Score</div>
                    <div className="font-mono font-bold text-sm text-slate-900">{a.score_or_indicator} / 100</div>
                  </div>
                  <span className="text-xs font-mono px-2 py-1 rounded bg-slate-100 text-slate-700">
                    {a.status}
                  </span>
                </div>
              </div>

              {/* Explainable Triggers & Missing Telemetry */}
              <div className="space-y-1.5 text-xs">
                <div className="font-semibold text-slate-800 text-[11px] uppercase tracking-wider">
                  Explainable Indicator Rationale
                </div>
                <div className="space-y-1">
                  {reasons.map((r, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-slate-700">
                      <span className="text-emerald-700 font-bold shrink-0">•</span>
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Next Action */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-start gap-2">
                <span className="font-semibold text-slate-900 shrink-0">Next Protocol Action:</span>
                <span className="text-slate-700">{a.recommended_action}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
