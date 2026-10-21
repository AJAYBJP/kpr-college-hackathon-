import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { EnvironmentalRecord, Farm, UserRole } from '../../types/index.ts';
import { CloudSun, Thermometer, Droplets, Wind, AlertCircle, Plus, Check } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

interface EnvironmentalViewProps {
  currentRole: UserRole;
  initialFarmId?: string;
}

export const EnvironmentalView: React.FC<EnvironmentalViewProps> = ({ currentRole, initialFarmId }) => {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<string>(initialFarmId || '');
  const [records, setRecords] = useState<EnvironmentalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [form, setForm] = useState({
    farm_id: '',
    recorded_at: new Date().toISOString().substring(0, 16).replace('T', ' '),
    temperature_celsius: '33.5',
    relative_humidity_percent: '75',
    rainfall_mm: '0',
    bedding_condition: 'Clean & Dry Paddy Straw',
    ventilation_status: 'Good Cross-Ventilation',
    water_availability: 'Continuous Clean Fresh Water'
  });

  useEffect(() => {
    loadFarms();
  }, []);

  useEffect(() => {
    loadEnv();
  }, [selectedFarm]);

  const loadFarms = async () => {
    try {
      const f = await api.getFarms();
      setFarms(f);
      if (!selectedFarm && f.length > 0) {
        setSelectedFarm(f[0].farm_id);
        setForm(prev => ({ ...prev, farm_id: f[0].farm_id }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadEnv = async () => {
    setLoading(true);
    try {
      const res = await api.getEnvironmentalRecords(selectedFarm || undefined);
      setRecords(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createEnvironmentalRecord({
        ...form,
        farm_id: selectedFarm || form.farm_id,
        temperature_celsius: parseFloat(form.temperature_celsius),
        relative_humidity_percent: parseFloat(form.relative_humidity_percent),
        rainfall_mm: parseFloat(form.rainfall_mm)
      });
      setIsAddOpen(false);
      loadEnv();
    } catch (err: any) {
      alert(`Error saving environmental record: ${err.message}`);
    }
  };

  const latest = records[0];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Farm Environmental Context & Heat Stress (THI)</h2>
          <p className="text-xs text-slate-500">Microclimate, bedding conditions, and environmental pathogen exposure</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedFarm}
            onChange={(e) => setSelectedFarm(e.target.value)}
            className="text-xs border border-slate-300 bg-white rounded-lg px-2.5 py-1.5 text-slate-800"
          >
            {farms.map((f) => (
              <option key={f.farm_id} value={f.farm_id}>{f.farm_name}</option>
            ))}
          </select>

          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Environment</span>
          </button>
        </div>
      </div>

      {/* Domain Scientific Context Note */}
      <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg flex items-start gap-3 text-xs text-blue-900">
        <AlertCircle className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
        <div>
          <strong>Epidemiological Context:</strong> High Temperature-Humidity Index (THI &gt; 78) induces chronic heat stress in exotic/crossbred cows, suppressing immune defenses (neutrophil oxidative burst) and encouraging cows to lie on moist, dung-contaminated bedding. Environmental context correlates with pathogen challenge but does not prove individual clinical diagnosis.
        </div>
      </div>

      {/* Latest Readings Cards */}
      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-500 font-medium">Ambient Temperature</div>
            <div className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">
              {latest.temperature_celsius}°C
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Recorded: {latest.recorded_at.substring(11, 16)}</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-500 font-medium">Relative Humidity</div>
            <div className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">
              {latest.relative_humidity_percent}%
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Rainfall: {latest.rainfall_mm} mm</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-500 font-medium">Heat Stress Index (THI)</div>
            <div className="text-sm font-bold text-amber-700 mt-2">
              {latest.heat_stress_observation}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">NRC formula 0.8T + RH(T-14.4) + 46.4</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-500 font-medium">Bedding & Airflow</div>
            <div className="text-xs font-semibold text-slate-800 mt-1 line-clamp-1">{latest.bedding_condition}</div>
            <div className="text-[11px] text-slate-500 mt-1">{latest.ventilation_status}</div>
          </div>
        </div>
      )}

      {/* Environmental History Chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Historical Temperature & Relative Humidity (30 Days)</h3>
            <p className="text-xs text-slate-500">Track contextual weather conditions alongside cow screening flags</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-amber-700">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              <span>Temp (°C)</span>
            </span>
            <span className="flex items-center gap-1.5 text-blue-700">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
              <span>RH (%)</span>
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={[...records].reverse()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="recorded_at" tickFormatter={(v) => v.substring(5, 10)} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
              />
              <Area type="monotone" dataKey="temperature_celsius" stroke="#d97706" fill="#fef3c7" fillOpacity={0.4} strokeWidth={2} />
              <Area type="monotone" dataKey="relative_humidity_percent" stroke="#2563eb" fill="#dbeafe" fillOpacity={0.2} strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Add Record Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4 text-xs">
            <h3 className="font-semibold text-slate-900 text-sm">Log Environmental Reading</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Temperature (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={form.temperature_celsius}
                    onChange={(e) => setForm({ ...form, temperature_celsius: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Humidity (%)</label>
                  <input
                    type="number"
                    step="1"
                    min="10"
                    max="100"
                    required
                    value={form.relative_humidity_percent}
                    onChange={(e) => setForm({ ...form, relative_humidity_percent: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Bedding Condition</label>
                <select
                  value={form.bedding_condition}
                  onChange={(e) => setForm({ ...form, bedding_condition: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                >
                  <option value="Clean & Dry Paddy Straw">Clean & Dry Paddy Straw</option>
                  <option value="Damp/Moist Bedding">Damp/Moist Bedding</option>
                  <option value="Soiled/Wet Manure-Mixed">Soiled/Wet Manure-Mixed</option>
                  <option value="Bare Concrete Floor">Bare Concrete Floor</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Ventilation</label>
                <select
                  value={form.ventilation_status}
                  onChange={(e) => setForm({ ...form, ventilation_status: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                >
                  <option value="Good Cross-Ventilation">Good Cross-Ventilation</option>
                  <option value="Adequate Fan Circulation">Adequate Fan Circulation</option>
                  <option value="Stagnant Air/Poor Flow">Stagnant Air/Poor Flow</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium text-white bg-emerald-700 rounded-lg"
                >
                  Save Reading
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
