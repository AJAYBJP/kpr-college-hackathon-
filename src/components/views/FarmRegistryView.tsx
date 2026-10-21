import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { Farm, UserRole } from '../../types/index.ts';
import { Building2, Plus, MapPin, Users, Home, Activity, Check, X } from 'lucide-react';

interface FarmRegistryViewProps {
  currentRole: UserRole;
  onNavigateToCows: (farmId: string) => void;
  onNavigateToEnv: (farmId: string) => void;
}

export const FarmRegistryView: React.FC<FarmRegistryViewProps> = ({
  currentRole,
  onNavigateToCows,
  onNavigateToEnv
}) => {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    farm_name: '',
    village: '',
    district: 'Chengalpattu',
    state: 'Tamil Nadu',
    farm_type: 'Smallholder Peri-Urban',
    herd_size: 15,
    housing_type: 'Loose Housing with Shed',
    latitude: 12.86,
    longitude: 80.12
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadFarms();
  }, []);

  const loadFarms = async () => {
    setLoading(true);
    try {
      const data = await api.getFarms();
      setFarms(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createFarm(formData);
      setIsModalOpen(false);
      loadFarms();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Registered Dairy Farms</h2>
          <p className="text-xs text-slate-500">Peri-urban dairy producers in Tamil Nadu milk shed</p>
        </div>

        {(currentRole === 'Administrator' || currentRole === 'Farm Manager') && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register New Farm</span>
          </button>
        )}
      </div>

      {/* Farms Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {farms.map((f) => (
          <div key={f.farm_id} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">{f.farm_name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{f.village}, {f.district}, {f.state}</span>
                  </div>
                </div>
                {f.is_demo === 1 && (
                  <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                    DEMO
                  </span>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Farm Type:</span>
                  <span className="font-medium text-slate-800">{f.farm_type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Housing Structure:</span>
                  <span className="font-medium text-slate-800">{f.housing_type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Active Monitored Cows:</span>
                  <span className="font-mono font-semibold text-slate-900">{f.active_cows_count ?? f.herd_size} cows</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Active Screening Flags:</span>
                  <span className={`font-mono font-semibold ${
                    (f.open_alerts_count || 0) > 0 ? 'text-amber-700' : 'text-slate-600'
                  }`}>
                    {f.open_alerts_count ?? 0} alerts
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                onClick={() => onNavigateToCows(f.farm_id)}
                className="flex-1 py-1.5 px-3 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors text-center"
              >
                View Cow Registry
              </button>
              <button
                onClick={() => onNavigateToEnv(f.farm_id)}
                className="py-1.5 px-3 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Weather & THI
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Register Farm Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-semibold text-slate-900 text-sm">Register New Dairy Farm</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Farm Name</label>
                <input
                  type="text"
                  required
                  value={formData.farm_name}
                  onChange={(e) => setFormData({ ...formData, farm_name: e.target.value })}
                  placeholder="e.g. Thiruvallur Sunrise Dairy"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Village</label>
                  <input
                    type="text"
                    required
                    value={formData.village}
                    onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                    placeholder="e.g. Poonamallee"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">District (TN)</label>
                  <select
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Chengalpattu">Chengalpattu</option>
                    <option value="Tiruchirappalli">Tiruchirappalli</option>
                    <option value="Coimbatore">Coimbatore</option>
                    <option value="Vellore">Vellore</option>
                    <option value="Thanjavur">Thanjavur</option>
                    <option value="Erode">Erode</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Farm Type</label>
                  <select
                    value={formData.farm_type}
                    onChange={(e) => setFormData({ ...formData, farm_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Smallholder Peri-Urban">Smallholder Peri-Urban</option>
                    <option value="Commercial Dairy">Commercial Dairy</option>
                    <option value="Cooperative Member">Cooperative Member</option>
                    <option value="Mixed Crop-Livestock">Mixed Crop-Livestock</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Herd Size</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    required
                    value={formData.herd_size}
                    onChange={(e) => setFormData({ ...formData, herd_size: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Housing Structure</label>
                <select
                  value={formData.housing_type}
                  onChange={(e) => setFormData({ ...formData, housing_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="Loose Housing with Shed">Loose Housing with Shed</option>
                  <option value="Tied Stall (Stanchion)">Tied Stall (Stanchion)</option>
                  <option value="Free Stall Cubicles">Free Stall Cubicles</option>
                  <option value="Open Paddock with Tree Cover">Open Paddock with Tree Cover</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
                >
                  Register Farm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
