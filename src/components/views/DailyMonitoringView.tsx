import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { Cow, Farm, MonitoringRecord, UserRole } from '../../types/index.ts';
import { CalendarPlus, Check, AlertCircle, Droplets, Thermometer, Filter } from 'lucide-react';

interface DailyMonitoringViewProps {
  currentRole: UserRole;
  onRecordSaved?: () => void;
}

export const DailyMonitoringView: React.FC<DailyMonitoringViewProps> = ({ currentRole, onRecordSaved }) => {
  const [cows, setCows] = useState<Cow[]>([]);
  const [recentRecords, setRecentRecords] = useState<MonitoringRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    cow_id: '',
    observed_at: new Date().toISOString().substring(0, 16).replace('T', ' '),
    morning_milk_yield_litres: '',
    evening_milk_yield_litres: '',
    SCC_cells_per_ml: '',
    CMT_result: '',
    electrical_conductivity: '',
    milk_appearance: 'Normal',
    udder_swelling: 'None',
    udder_warmth: 'Normal',
    teat_condition: 'Normal/Intact',
    body_temperature_celsius: '',
    appetite_status: 'Normal',
    rumination_status: 'Normal (400-500 min/day)',
    water_intake_status: 'Normal',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [c, r] = await Promise.all([
        api.getCows(),
        api.getMonitoringRecords({ limit: 25 })
      ]);
      setCows(c);
      setRecentRecords(r);
      if (c.length > 0 && !form.cow_id) {
        setForm(prev => ({ ...prev, cow_id: c[0].cow_id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cow_id) {
      alert('Please select a cow.');
      return;
    }
    try {
      await api.createMonitoringRecord({
        ...form,
        morning_milk_yield_litres: form.morning_milk_yield_litres ? parseFloat(form.morning_milk_yield_litres) : null,
        evening_milk_yield_litres: form.evening_milk_yield_litres ? parseFloat(form.evening_milk_yield_litres) : null,
        SCC_cells_per_ml: form.SCC_cells_per_ml ? parseInt(form.SCC_cells_per_ml, 10) : null,
        CMT_result: form.CMT_result || null,
        electrical_conductivity: form.electrical_conductivity ? parseFloat(form.electrical_conductivity) : null,
        body_temperature_celsius: form.body_temperature_celsius ? parseFloat(form.body_temperature_celsius) : null,
        actor: currentRole
      });

      setSuccessMsg('Monitoring reading saved to SQLite udderwatch.db');
      setTimeout(() => setSuccessMsg(null), 4000);
      onRecordSaved?.();
      loadData();
    } catch (err: any) {
      alert(`Error saving record: ${err.message}`);
    }
  };

  const selectedCowObj = cows.find(c => c.cow_id === form.cow_id);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Daily Cow Health & Milk Quality Monitoring</h2>
        <p className="text-xs text-slate-500">Record morning/evening yields, somatic cell indicators, and early physical signs</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entry Form */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 text-sm">New Milk & Udder Observation</h3>
            {successMsg && (
              <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                <Check className="w-3 h-3" /> Saved
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Target Cow</label>
              <select
                value={form.cow_id}
                onChange={(e) => setForm({ ...form, cow_id: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-slate-900"
              >
                {cows.map((c) => (
                  <option key={c.cow_id} value={c.cow_id}>
                    {c.tag_number} ({c.breed}) · {c.farm_name}
                  </option>
                ))}
              </select>
              {selectedCowObj && (
                <div className="text-[11px] text-slate-500 mt-1">
                  Baseline: <strong className="text-slate-800">{selectedCowObj.baseline_milk_yield_litres} L/day</strong> · {selectedCowObj.lactation_stage}
                </div>
              )}
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Observation Date & Time</label>
              <input
                type="text"
                required
                value={form.observed_at}
                onChange={(e) => setForm({ ...form, observed_at: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Morning Yield (L)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="40"
                  placeholder="e.g. 10.5"
                  value={form.morning_milk_yield_litres}
                  onChange={(e) => setForm({ ...form, morning_milk_yield_litres: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Evening Yield (L)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="40"
                  placeholder="e.g. 8.0"
                  value={form.evening_milk_yield_litres}
                  onChange={(e) => setForm({ ...form, evening_milk_yield_litres: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">SCC (cells/mL)</label>
                <input
                  type="number"
                  placeholder="e.g. 180000"
                  value={form.SCC_cells_per_ml}
                  onChange={(e) => setForm({ ...form, SCC_cells_per_ml: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">CMT Result</label>
                <select
                  value={form.CMT_result}
                  onChange={(e) => setForm({ ...form, CMT_result: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                >
                  <option value="">Not Screened</option>
                  <option value="Negative (0)">Negative (0)</option>
                  <option value="Trace (T)">Trace (T)</option>
                  <option value="Weak Positive (1)">Weak Positive (1)</option>
                  <option value="Distinct Positive (2)">Distinct Positive (2)</option>
                  <option value="Strong Positive (3)">Strong Positive (3)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Conductivity (mS/cm)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 5.1"
                  value={form.electrical_conductivity}
                  onChange={(e) => setForm({ ...form, electrical_conductivity: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Body Temp (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 38.6"
                  value={form.body_temperature_celsius}
                  onChange={(e) => setForm({ ...form, body_temperature_celsius: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Milk Appearance</label>
                <select
                  value={form.milk_appearance}
                  onChange={(e) => setForm({ ...form, milk_appearance: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                >
                  <option value="Normal">Normal</option>
                  <option value="Watery">Watery</option>
                  <option value="Flakes/Clots Present">Flakes/Clots Present</option>
                  <option value="Blood Tinged">Blood Tinged</option>
                  <option value="Discolored/Yellowish">Discolored/Yellowish</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Udder Swelling</label>
                <select
                  value={form.udder_swelling}
                  onChange={(e) => setForm({ ...form, udder_swelling: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                >
                  <option value="None">None</option>
                  <option value="Mild Quarter Swelling">Mild Quarter</option>
                  <option value="Moderate Swelling">Moderate</option>
                  <option value="Severe Hardness">Severe Hardness</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Notes / Milker Observation</label>
              <textarea
                rows={2}
                placeholder="Optional notes regarding quarter condition or milking unit behavior"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 px-3 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition-colors"
            >
              Save Monitoring Record
            </button>
          </form>
        </div>

        {/* Recent Records Feed */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Recent Monitoring Log Stream</h3>
              <p className="text-xs text-slate-500">Live records from milker entries and sensor logs</p>
            </div>
            <span className="text-xs font-mono text-slate-500">{recentRecords.length} records</span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                <tr>
                  <th className="px-3.5 py-2.5">Date & Time</th>
                  <th className="px-3.5 py-2.5">Cow / Tag</th>
                  <th className="px-3.5 py-2.5 text-right">Yield (L)</th>
                  <th className="px-3.5 py-2.5 text-right">SCC (cells/mL)</th>
                  <th className="px-3.5 py-2.5">CMT</th>
                  <th className="px-3.5 py-2.5 text-right">EC (mS/cm)</th>
                  <th className="px-3.5 py-2.5">Appearance</th>
                  <th className="px-3.5 py-2.5">Swelling</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {recentRecords.map((r) => {
                  const sccAlert = r.SCC_cells_per_ml != null && r.SCC_cells_per_ml > 300000;
                  const clotAlert = r.milk_appearance && r.milk_appearance !== 'Normal';
                  return (
                    <tr key={r.record_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3.5 py-2.5 text-slate-500">{r.observed_at.substring(0, 16)}</td>
                      <td className="px-3.5 py-2.5 font-semibold text-slate-900 font-sans">{r.tag_number || r.cow_id}</td>
                      <td className="px-3.5 py-2.5 text-right text-slate-800 tabular-nums">
                        {r.total_milk_yield_litres != null ? `${r.total_milk_yield_litres.toFixed(1)} L` : '--'}
                      </td>
                      <td className={`px-3.5 py-2.5 text-right tabular-nums ${sccAlert ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
                        {r.SCC_cells_per_ml != null ? r.SCC_cells_per_ml.toLocaleString() : <span className="text-slate-300 font-normal">--</span>}
                      </td>
                      <td className="px-3.5 py-2.5 font-sans">
                        {r.CMT_result ? (
                          <span className={r.CMT_result.includes('Positive') ? 'text-amber-700 font-semibold' : 'text-slate-700'}>
                            {r.CMT_result}
                          </span>
                        ) : (
                          <span className="text-slate-300">--</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-right tabular-nums text-slate-700">
                        {r.electrical_conductivity != null ? `${r.electrical_conductivity.toFixed(1)}` : '--'}
                      </td>
                      <td className="px-3.5 py-2.5 font-sans">
                        <span className={clotAlert ? 'text-rose-600 font-semibold' : 'text-slate-700'}>
                          {r.milk_appearance || 'Normal'}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 font-sans">
                        <span className={r.udder_swelling && r.udder_swelling !== 'None' ? 'text-amber-700 font-semibold' : 'text-slate-500'}>
                          {r.udder_swelling || 'None'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
