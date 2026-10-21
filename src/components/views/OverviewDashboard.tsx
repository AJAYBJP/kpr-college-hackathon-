import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import {
  Activity, AlertTriangle, AlertCircle, TrendingDown,
  Building2, Binary, CheckCircle2, IndianRupee, Clock,
  ArrowRight, ShieldCheck, HelpCircle
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid
} from 'recharts';

interface OverviewDashboardProps {
  onNavigate: (view: string, filterParams?: any) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({ onNavigate }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFarm, setSelectedFarm] = useState<string>('');
  const [farms, setFarms] = useState<any[]>([]);

  useEffect(() => {
    loadDashboard();
    loadFarms();
  }, [selectedFarm]);

  const loadFarms = async () => {
    try {
      const f = await api.getFarms();
      setFarms(f);
    } catch (err) {
      console.error(err);
    }
  };

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.getDashboard(selectedFarm || undefined);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh] text-slate-400">
        <div className="text-center space-y-3">
          <Activity className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
          <p className="text-xs font-medium">Aggregating live SQLite herd telemetry...</p>
        </div>
      </div>
    );
  }

  const fin = data?.financial_impact;
  const missing = data?.missing_data_summary;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner: Clinical & Provenance Disclaimer */}
      <div className="bg-amber-50/80 border border-amber-200/90 rounded-lg p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong className="font-semibold">SYNTHETIC DEMONSTRATION DATA (Tamil Nadu Dairy Herds).</strong> Decision-support & early screening system only. Definitive mastitis diagnosis and antibiotic prescriptions require physical veterinary examination.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={selectedFarm}
            onChange={(e) => setSelectedFarm(e.target.value)}
            className="text-xs border border-amber-300 bg-white rounded-md px-2.5 py-1 text-slate-800 focus:outline-none"
          >
            <option value="">All 3 Registered Farms</option>
            {farms.map((f) => (
              <option key={f.farm_id} value={f.farm_id}>
                {f.farm_name} ({f.district})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-[11px] font-medium text-slate-500">Active Farms</div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono tabular-nums">
            {data?.active_farms ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Tamil Nadu Peri-Urban</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-[11px] font-medium text-slate-500">Monitored Herd</div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono tabular-nums">
            {data?.active_cows ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">HF, Jersey & Murrah</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-[11px] font-medium text-slate-500">Monitoring Records</div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono tabular-nums">
            {data?.monitoring_records_count?.toLocaleString() ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Stored in SQLite</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-[11px] font-medium text-slate-500">Open Screening Alerts</div>
          <div className="text-xl font-bold text-amber-700 mt-1 font-mono tabular-nums">
            {data?.recent_alerts?.length ?? 0}
          </div>
          <div className="text-[10px] text-amber-600 mt-0.5 font-medium">Requiring screening</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-[11px] font-medium text-slate-500">Overdue Follow-ups</div>
          <div className={`text-xl font-bold mt-1 font-mono tabular-nums ${
            (data?.overdue_followups || 0) > 0 ? 'text-rose-600' : 'text-slate-900'
          }`}>
            {data?.overdue_followups ?? 0}
          </div>
          <div className="text-[10px] text-rose-500 mt-0.5 font-medium">Coordination gap</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-[11px] font-medium text-slate-500">Economic Impact</div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono tabular-nums">
            ₹{fin?.estimated_total_economic_impact_inr?.toLocaleString() ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Yield loss + costs</div>
        </div>
      </div>

      {/* Main Charts & Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: 14-day Yield Trend */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Herd Daily Milk Yield & Production Trend</h3>
              <p className="text-xs text-slate-500">Observed 14-day average litres per cow per day</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
              <span>Average Yield (L/cow)</span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.yield_trends || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="yieldColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  formatter={(val: any) => [`${val} Litres`, 'Avg Daily Yield']}
                  labelFormatter={(lbl) => `Date: ${lbl}`}
                />
                <Area type="monotone" dataKey="avg_yield" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#yieldColor)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Aggregated across {data?.active_cows || 0} active milking cows</span>
            <button
              onClick={() => onNavigate('daily-monitoring')}
              className="text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1"
            >
              <span>Log new milk record</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Col: Missing Data & Data Quality Monitor */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Telemetry Completeness</h3>
              <span className="text-[11px] font-mono text-slate-500">{missing?.total_records || 0} total logs</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Diagnostic integrity relies on tracking missing fields. Null values are never treated as negative results.
            </p>

            <div className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">Somatic Cell Count (SCC)</span>
                  <span className="font-mono text-slate-800 font-semibold">{100 - (missing?.missing_scc_percent || 0)}% Complete</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${100 - (missing?.missing_scc_percent || 0)}%` }} />
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{missing?.missing_scc_percent || 0}% missing (tested periodically)</div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">Electrical Conductivity (EC)</span>
                  <span className="font-mono text-slate-800 font-semibold">{100 - (missing?.missing_ec_percent || 0)}% Complete</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full" style={{ width: `${100 - (missing?.missing_ec_percent || 0)}%` }} />
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{missing?.missing_ec_percent || 0}% missing</div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">California Mastitis Test (CMT)</span>
                  <span className="font-mono text-slate-800 font-semibold">{100 - (missing?.missing_cmt_percent || 0)}% Complete</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: `${100 - (missing?.missing_cmt_percent || 0)}%` }} />
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{missing?.missing_cmt_percent || 0}% missing</div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <button
              onClick={() => onNavigate('csv-import')}
              className="w-full py-2 px-3 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-center transition-colors"
            >
              Import CSV Batch Records
            </button>
          </div>
        </div>
      </div>

      {/* Recent Screening Alerts & Action Queue */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Active Mastitis Screening Alerts</h3>
            <p className="text-xs text-slate-500">Prioritised based on milk yield drop, elevated SCC, and clinical telemetry</p>
          </div>
          <button
            onClick={() => onNavigate('alerts-coordination')}
            className="text-xs text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1"
          >
            <span>View all alerts</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100 overflow-x-auto">
          {(!data?.recent_alerts || data.recent_alerts.length === 0) ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No active screening alerts. Herd parameters are currently nominal.
            </div>
          ) : (
            data.recent_alerts.map((alt: any) => {
              const reasons: string[] = JSON.parse(alt.reasons_json || '[]');
              const isUrgent = alt.risk_category === 'Urgent veterinary review';
              return (
                <div key={alt.alert_id} className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        isUrgent ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {alt.risk_category}
                      </span>
                      <span className="font-semibold text-xs text-slate-900">
                        Cow {alt.tag_number} ({alt.breed})
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-slate-500">{alt.farm_name}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-[11px] font-mono text-slate-400">{alt.created_at}</span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-1">
                      {reasons.slice(0, 2).join(' · ')}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-slate-500 font-mono">
                      Status: <strong className="text-slate-800">{alt.status}</strong>
                    </span>
                    <button
                      onClick={() => onNavigate('alerts-coordination', { alert_id: alt.alert_id })}
                      className="px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                    >
                      Coordinate Follow-up
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
