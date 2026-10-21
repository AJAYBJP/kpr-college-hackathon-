import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { OperationalRecord, Farm, UserRole } from '../../types/index.ts';
import { Sparkles, Plus, Check, AlertCircle, Wrench } from 'lucide-react';

interface OperationsViewProps {
  currentRole: UserRole;
}

export const OperationsView: React.FC<OperationsViewProps> = ({ currentRole }) => {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<string>('');
  const [records, setRecords] = useState<OperationalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [form, setForm] = useState({
    farm_id: '',
    recorded_at: new Date().toISOString().substring(0, 16).replace('T', ' '),
    milking_shift: 'Morning (05:00)',
    milking_hygiene_status: 'Excellent Protocol',
    teat_cleaning_status: 'Individual Clean Cloth Dry Wipe',
    post_milking_disinfection_status: 'Immediate Barrier Dip (0.5% Iodine)',
    equipment_cleaning_status: 'Full CIP Hot Alkaline Wash',
    bedding_cleaning_status: 'Daily Removal & Fresh Bedding',
    notes: ''
  });

  useEffect(() => {
    loadFarms();
  }, []);

  useEffect(() => {
    loadOps();
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

  const loadOps = async () => {
    setLoading(true);
    try {
      const res = await api.getOperationalRecords(selectedFarm || undefined);
      setRecords(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createOperationalRecord({
        ...form,
        farm_id: selectedFarm || form.farm_id,
        actor: currentRole
      });
      setIsAddOpen(false);
      loadOps();
    } catch (err: any) {
      alert(`Error saving operational record: ${err.message}`);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Farm Operations & Milking Hygiene Protocols</h2>
          <p className="text-xs text-slate-500">Track teat disinfection, CIP machine washing, and bedding sanitisation</p>
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
            <span>Log Hygiene Shift</span>
          </button>
        </div>
      </div>

      {/* Operational Protocol Standards Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-semibold text-slate-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
            <span>Pre-Milking Teat Preparation</span>
          </div>
          <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
            Fore-stripping strip cup inspection followed by individual dry cloth wipe reduces contagious transmission of <em>S. agalactiae</em> and environmental coliforms.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-semibold text-slate-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
            <span>Post-Milking Barrier Teat Dip</span>
          </div>
          <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
            Applying 0.5% Iodine or Chlorhexidine immediately seals the open teat sphincter for 30 minutes while cow stands at the feed bunk.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-semibold text-slate-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
            <span>Clean-in-Place (CIP) Pipeline Wash</span>
          </div>
          <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
            Hot alkaline circulation wash (&gt; 65°C) followed by acid rinse prevents milk fat biofilm and mineral milkstone accumulation.
          </p>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 text-sm">Milking Shift Hygiene Records</h3>
          <span className="text-xs font-mono text-slate-500">{records.length} shifts logged</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
              <tr>
                <th className="px-4 py-3">Recorded Shift</th>
                <th className="px-4 py-3">Shift Type</th>
                <th className="px-4 py-3">Milker Hygiene</th>
                <th className="px-4 py-3">Teat Pre-Cleaning</th>
                <th className="px-4 py-3">Post-Milking Dip</th>
                <th className="px-4 py-3">Equipment Wash</th>
                <th className="px-4 py-3">Bedding Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((r) => {
                const isDeficient = r.milking_hygiene_status.includes('Deficient') || r.post_milking_disinfection_status.includes('Omitted');
                return (
                  <tr key={r.operation_id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono text-slate-500">{r.recorded_at}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{r.milking_shift}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        isDeficient ? 'bg-rose-100 text-rose-800' : 'bg-emerald-50 text-emerald-800'
                      }`}>
                        {r.milking_hygiene_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{r.teat_cleaning_status}</td>
                    <td className="px-4 py-3 text-slate-700">{r.post_milking_disinfection_status}</td>
                    <td className="px-4 py-3 text-slate-700">{r.equipment_cleaning_status}</td>
                    <td className="px-4 py-3 text-slate-700">{r.bedding_cleaning_status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4 text-xs">
            <h3 className="font-semibold text-slate-900 text-sm">Log Shift Hygiene Compliance</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Milking Shift</label>
                <select
                  value={form.milking_shift}
                  onChange={(e) => setForm({ ...form, milking_shift: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                >
                  <option value="Morning (05:00)">Morning (05:00)</option>
                  <option value="Evening (17:00)">Evening (17:00)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Pre-Milking Teat Cleaning</label>
                <select
                  value={form.teat_cleaning_status}
                  onChange={(e) => setForm({ ...form, teat_cleaning_status: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                >
                  <option value="Individual Clean Cloth Dry Wipe">Individual Clean Cloth Dry Wipe</option>
                  <option value="Water Wash & Complete Dry">Water Wash & Complete Dry</option>
                  <option value="Wet Wash Without Complete Drying">Wet Wash Without Complete Drying (High Risk)</option>
                  <option value="No Pre-Wipe">No Pre-Wipe</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Post-Milking Teat Dip</label>
                <select
                  value={form.post_milking_disinfection_status}
                  onChange={(e) => setForm({ ...form, post_milking_disinfection_status: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                >
                  <option value="Immediate Barrier Dip (0.5% Iodine)">Immediate Barrier Dip (0.5% Iodine)</option>
                  <option value="Standard Dip (Chlorhexidine)">Standard Dip (Chlorhexidine)</option>
                  <option value="Spray Applied Unevenly">Spray Applied Unevenly</option>
                  <option value="Omitted/No Dip">Omitted/No Dip</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Equipment CIP Cleaning</label>
                <select
                  value={form.equipment_cleaning_status}
                  onChange={(e) => setForm({ ...form, equipment_cleaning_status: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                >
                  <option value="Full CIP Hot Alkaline Wash">Full CIP Hot Alkaline Wash</option>
                  <option value="Cold Water Flush Only">Cold Water Flush Only</option>
                  <option value="Scale Build-Up Detected">Scale Build-Up Detected</option>
                  <option value="Manual Bucket Wash">Manual Bucket Wash</option>
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
                  Record Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
