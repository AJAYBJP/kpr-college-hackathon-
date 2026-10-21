import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { Cow, Farm, UserRole, MonitoringRecord, DiagnosticResult, Alert, TreatmentRecord, UserReportedEvent } from '../../types/index.ts';
import {
  Search, Filter, Plus, ArrowUpRight, AlertTriangle, CheckCircle,
  Binary, Calendar, Droplets, Thermometer, X, ShieldAlert, FileText, Activity
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

interface CowRegistryViewProps {
  currentRole: UserRole;
  initialFarmFilter?: string;
  onNavigateToScreening: () => void;
}

export const CowRegistryView: React.FC<CowRegistryViewProps> = ({
  currentRole,
  initialFarmFilter,
  onNavigateToScreening
}) => {
  const [cows, setCows] = useState<Cow[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFarm, setSelectedFarm] = useState<string>(initialFarmFilter || '');
  const [lactationStage, setLactationStage] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  // Detail Modal State
  const [selectedCowId, setSelectedCowId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<{
    cow: Cow;
    monitoring_records: MonitoringRecord[];
    diagnostics: DiagnosticResult[];
    alerts: Alert[];
    treatments: TreatmentRecord[];
    user_events: UserReportedEvent[];
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Add Cow Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    farm_id: '',
    tag_number: '',
    breed: 'Crossbred HF (Holstein Friesian)',
    date_of_birth: '2023-01-15',
    parity: 2,
    lactation_stage: 'Mid (61-180d)',
    calving_date: '2026-03-10',
    previous_mastitis_history: 0,
    baseline_milk_yield_litres: 19.5
  });

  useEffect(() => {
    loadFarms();
  }, []);

  useEffect(() => {
    loadCows();
  }, [selectedFarm, lactationStage, search]);

  const loadFarms = async () => {
    try {
      const f = await api.getFarms();
      setFarms(f);
      if (!selectedFarm && f.length > 0 && !initialFarmFilter) {
        setAddForm(prev => ({ ...prev, farm_id: f[0].farm_id }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadCows = async () => {
    setLoading(true);
    try {
      const data = await api.getCows({
        farm_id: selectedFarm || undefined,
        lactation_stage: lactationStage || undefined,
        search: search || undefined
      });
      setCows(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openCowDetail = async (cowId: string) => {
    setSelectedCowId(cowId);
    setDetailLoading(true);
    try {
      const res = await api.getCowDetail(cowId);
      setDetailData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAddCow = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCow({
        ...addForm,
        parity: Number(addForm.parity),
        baseline_milk_yield_litres: Number(addForm.baseline_milk_yield_litres),
        previous_mastitis_history: Number(addForm.previous_mastitis_history)
      });
      setIsAddModalOpen(false);
      loadCows();
    } catch (err: any) {
      alert(`Error registering cow: ${err.message}`);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Cow Registry & Longitudinal Profiles</h2>
          <p className="text-xs text-slate-500">Individual lactation stages, historical baselines, and screening trajectories</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tag or breed..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white w-44 focus:outline-emerald-600"
            />
          </div>

          <select
            value={selectedFarm}
            onChange={(e) => setSelectedFarm(e.target.value)}
            className="text-xs border border-slate-300 bg-white rounded-lg px-2.5 py-1.5 text-slate-700"
          >
            <option value="">All Farms</option>
            {farms.map((f) => (
              <option key={f.farm_id} value={f.farm_id}>{f.farm_name}</option>
            ))}
          </select>

          <select
            value={lactationStage}
            onChange={(e) => setLactationStage(e.target.value)}
            className="text-xs border border-slate-300 bg-white rounded-lg px-2.5 py-1.5 text-slate-700"
          >
            <option value="">All Lactation Stages</option>
            <option value="Early (0-60d)">Early (0-60d)</option>
            <option value="Mid (61-180d)">Mid (61-180d)</option>
            <option value="Late (181-305d)">Late (181-305d)</option>
          </select>

          {(currentRole === 'Administrator' || currentRole === 'Farm Manager') && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Cow</span>
            </button>
          )}
        </div>
      </div>

      {/* Cows Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-4 py-3">Tag / Cow ID</th>
                <th className="px-4 py-3">Farm / District</th>
                <th className="px-4 py-3">Breed</th>
                <th className="px-4 py-3">Parity & Stage</th>
                <th className="px-4 py-3 text-right">Baseline Yield</th>
                <th className="px-4 py-3 text-right">Latest Yield</th>
                <th className="px-4 py-3 text-right">Latest SCC</th>
                <th className="px-4 py-3">Screening Priority</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    No cows matching the selected filters.
                  </td>
                </tr>
              ) : (
                cows.map((c) => {
                  const hasAlert = !!c.active_alert_priority;
                  const isUrgent = c.active_alert_priority === 'Urgent veterinary review';
                  return (
                    <tr key={c.cow_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 font-mono">{c.tag_number}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">{c.cow_id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-800 font-medium">{c.farm_name}</div>
                        <div className="text-[10px] text-slate-400">{c.district}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{c.breed}</td>
                      <td className="px-4 py-3">
                        <div className="text-slate-800 font-medium">Parity {c.parity}</div>
                        <div className="text-[10px] text-slate-500">{c.lactation_stage}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-slate-700 tabular-nums">
                        {c.baseline_milk_yield_litres.toFixed(1)} L
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">
                        {c.latest_yield != null ? (
                          <span className={c.latest_yield < c.baseline_milk_yield_litres * 0.85 ? 'text-amber-700' : 'text-slate-900'}>
                            {c.latest_yield.toFixed(1)} L
                          </span>
                        ) : (
                          <span className="text-slate-300">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        {c.latest_scc != null ? (
                          <span className={c.latest_scc > 400000 ? 'text-rose-600 font-semibold' : 'text-slate-700'}>
                            {c.latest_scc.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-300">Unmeasured</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {hasAlert ? (
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            isUrgent ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {c.active_alert_priority}
                          </span>
                        ) : (
                          <span className="text-emerald-700 text-[11px] font-medium flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Nominal</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => openCowDetail(c.cow_id)}
                          className="px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                        >
                          View Profile
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cow Detail Profile Modal */}
      {selectedCowId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-mono font-bold text-sm">
                  {detailData?.cow?.tag_number.split('-')[2] || 'CW'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm">
                      Cow {detailData?.cow?.tag_number} ({detailData?.cow?.breed})
                    </h3>
                    <span className="text-xs text-slate-500">· {detailData?.cow?.farm_name}</span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>Parity {detailData?.cow?.parity}</span>
                    <span>·</span>
                    <span>{detailData?.cow?.lactation_stage}</span>
                    <span>·</span>
                    <span>Calved: {detailData?.cow?.calving_date}</span>
                    <span>·</span>
                    <span className="font-semibold text-emerald-800">
                      Baseline: {detailData?.cow?.baseline_milk_yield_litres} L/day
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedCowId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {detailLoading ? (
                <div className="py-12 text-center text-slate-400">Loading historical timeline...</div>
              ) : (
                <>
                  {/* Historical Yield & Baseline Deviation Chart */}
                  <div className="p-4 border border-slate-200 rounded-lg bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-slate-900 text-xs">30-Day Daily Milk Yield Trajectory</h4>
                        <p className="text-[11px] text-slate-500">Observed yield compared to cow baseline ({detailData?.cow?.baseline_milk_yield_litres}L)</p>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-mono">
                        <span className="flex items-center gap-1 text-emerald-700">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                          <span>Actual Yield</span>
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <span className="w-2.5 h-0.5 bg-slate-400 inline-block" />
                          <span>Personal Baseline</span>
                        </span>
                      </div>
                    </div>

                    <div className="h-52 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={detailData?.monitoring_records || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis
                            dataKey="observed_at"
                            tickFormatter={(v) => v.substring(5, 10)}
                            tick={{ fontSize: 10 }}
                            axisLine={{ stroke: '#e2e8f0' }}
                          />
                          <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize: 10 }} axisLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                            formatter={(val: any) => [`${val} Litres`, 'Yield']}
                            labelFormatter={(lbl) => `Observed: ${lbl}`}
                          />
                          <Line type="monotone" dataKey="total_milk_yield_litres" stroke="#059669" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Somatic Cell Count & Electrical Conductivity Readings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                      <h4 className="font-semibold text-slate-800 text-xs mb-2">Diagnostic & Reference Lab Results</h4>
                      {detailData?.diagnostics.length === 0 ? (
                        <p className="text-slate-400 italic">No laboratory culture or PCR recorded for this cow.</p>
                      ) : (
                        <div className="space-y-2">
                          {detailData?.diagnostics.map((d) => (
                            <div key={d.diagnostic_id} className="p-2.5 bg-white border border-slate-200 rounded text-xs space-y-1">
                              <div className="flex items-center justify-between font-medium">
                                <span className="text-slate-800">{d.test_type}</span>
                                <span className={`font-semibold px-1.5 py-0.2 rounded text-[10px] ${
                                  d.test_result === 'Positive' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {d.test_result}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-600">Diagnosis: {d.veterinarian_diagnosis}</div>
                              {d.pathogen_identification && (
                                <div className="text-[11px] text-slate-700 font-mono">Pathogen: {d.pathogen_identification}</div>
                              )}
                              <div className="text-[10px] text-slate-400">Verified by: {d.verified_by} · {d.verification_date}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                      <h4 className="font-semibold text-slate-800 text-xs mb-2">Veterinary Treatment & Milk Withdrawal</h4>
                      {detailData?.treatments.length === 0 ? (
                        <p className="text-slate-400 italic">No veterinary treatment courses currently logged.</p>
                      ) : (
                        <div className="space-y-2">
                          {detailData?.treatments.map((t) => (
                            <div key={t.treatment_id} className="p-2.5 bg-white border border-slate-200 rounded text-xs space-y-1">
                              <div className="font-medium text-slate-900">{t.treatment_name}</div>
                              <div className="text-[11px] text-slate-600">Prescribed by: {t.prescribed_by}</div>
                              <div className="text-[11px] text-amber-800 bg-amber-50 p-1 rounded border border-amber-200 font-mono">
                                Mandatory Withdrawal: {t.milk_withdrawal_start.substring(0, 10)} to {t.milk_withdrawal_end.substring(0, 10)}
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                                <span>Cost: ₹{t.treatment_cost}</span>
                                <span className="font-medium text-slate-800">Outcome: {t.outcome}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Active Alerts for this Cow */}
                  <div className="border border-slate-200 rounded-lg p-4">
                    <h4 className="font-semibold text-slate-800 text-xs mb-2">Alerts & Screening Traceability</h4>
                    {detailData?.alerts.length === 0 ? (
                      <p className="text-slate-400 italic">No active or historical alerts recorded.</p>
                    ) : (
                      <div className="space-y-2">
                        {detailData?.alerts.map((a) => {
                          const reasons: string[] = JSON.parse(a.reasons_json || '[]');
                          return (
                            <div key={a.alert_id} className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-900">{a.risk_category}</span>
                                <span className="font-mono text-[10px] text-slate-500">{a.created_at} · Status: {a.status}</span>
                              </div>
                              <p className="text-[11px] text-slate-700">Recommended: {a.recommended_action}</p>
                              <div className="text-[10px] text-slate-500 space-y-0.5 pt-1">
                                {reasons.map((r, i) => (
                                  <div key={i}>• {r}</div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedCowId(null)}
                className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Cow Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-semibold text-slate-900 text-sm">Register Cow into Herd</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCow} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Farm</label>
                <select
                  required
                  value={addForm.farm_id}
                  onChange={(e) => setAddForm({ ...addForm, farm_id: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                >
                  <option value="">Select Farm...</option>
                  {farms.map((f) => (
                    <option key={f.farm_id} value={f.farm_id}>{f.farm_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Tag Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TN-CHE-25"
                    value={addForm.tag_number}
                    onChange={(e) => setAddForm({ ...addForm, tag_number: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Breed</label>
                  <select
                    value={addForm.breed}
                    onChange={(e) => setAddForm({ ...addForm, breed: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  >
                    <option value="Crossbred HF (Holstein Friesian)">Crossbred HF</option>
                    <option value="Jersey Cross">Jersey Cross</option>
                    <option value="Murrah Buffalo Cross">Murrah Buffalo</option>
                    <option value="Sahiwal Cross">Sahiwal Cross</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Parity (Calvings)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    required
                    value={addForm.parity}
                    onChange={(e) => setAddForm({ ...addForm, parity: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Baseline Yield (L/day)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="2"
                    max="45"
                    required
                    value={addForm.baseline_milk_yield_litres}
                    onChange={(e) => setAddForm({ ...addForm, baseline_milk_yield_litres: parseFloat(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Lactation Stage</label>
                  <select
                    value={addForm.lactation_stage}
                    onChange={(e) => setAddForm({ ...addForm, lactation_stage: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  >
                    <option value="Early (0-60d)">Early (0-60d)</option>
                    <option value="Mid (61-180d)">Mid (61-180d)</option>
                    <option value="Late (181-305d)">Late (181-305d)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Calving Date</label>
                  <input
                    type="date"
                    required
                    value={addForm.calving_date}
                    onChange={(e) => setAddForm({ ...addForm, calving_date: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={addForm.previous_mastitis_history === 1}
                    onChange={(e) => setAddForm({ ...addForm, previous_mastitis_history: e.target.checked ? 1 : 0 })}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-slate-700">Cow has documented previous history of mastitis</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
                >
                  Save Cow Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
