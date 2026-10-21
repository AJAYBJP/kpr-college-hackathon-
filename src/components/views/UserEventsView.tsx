import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { UserReportedEvent, Farm, Cow, UserRole } from '../../types/index.ts';
import { AlertCircle, Plus, Check, Clock, ShieldCheck, X } from 'lucide-react';

interface UserEventsViewProps {
  currentRole: UserRole;
}

export const UserEventsView: React.FC<UserEventsViewProps> = ({ currentRole }) => {
  const [events, setEvents] = useState<UserReportedEvent[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [cows, setCows] = useState<Cow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [form, setForm] = useState({
    farm_id: '',
    cow_id: '',
    reporter_role: currentRole,
    event_type: 'Abnormal Milk (Clots/Watery)',
    severity: 'Moderate Attention',
    description: '',
    onset_time: 'During morning milking shift',
    evidence_reference: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [evts, f, c] = await Promise.all([
        api.getUserEvents(),
        api.getFarms(),
        api.getCows()
      ]);
      setEvents(evts);
      setFarms(f);
      setCows(c);
      if (f.length > 0 && !form.farm_id) {
        setForm(prev => ({ ...prev, farm_id: f[0].farm_id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createUserEvent({
        ...form,
        reporter_role: currentRole,
        actor: currentRole
      });
      setIsModalOpen(false);
      setForm(prev => ({ ...prev, description: '', evidence_reference: '' }));
      loadData();
    } catch (err: any) {
      alert(`Error submitting event: ${err.message}`);
    }
  };

  const handleUpdateStatus = async (eventId: string, status: string) => {
    try {
      await api.reviewUserEvent(eventId, {
        review_status: status,
        reviewed_by: `${currentRole} Reviewer`
      });
      loadData();
    } catch (err: any) {
      alert(`Error updating review: ${err.message}`);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">User-Reported Clinical & Operational Events</h2>
          <p className="text-xs text-slate-500">Real-time alerts submitted by milkers, farmers, and consulting veterinarians</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Report Herd Incident</span>
        </button>
      </div>

      {/* Events List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 text-sm">Incident Reports Log</h3>
          <span className="text-xs font-mono text-slate-500">{events.length} reports</span>
        </div>

        <div className="divide-y divide-slate-100">
          {events.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No reported incidents on record.
            </div>
          ) : (
            events.map((evt) => {
              const isHigh = evt.severity === 'High Urgent Priority';
              return (
                <div key={evt.event_id} className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        isHigh ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {evt.severity}
                      </span>
                      <strong className="text-slate-900 text-sm">{evt.event_type}</strong>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-600 font-medium">{evt.farm_name}</span>
                      {evt.tag_number && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="font-mono font-semibold text-slate-800">Cow {evt.tag_number}</span>
                        </>
                      )}
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-400 font-mono text-[11px]">{evt.reported_at}</span>
                    </div>

                    <p className="text-slate-700 leading-relaxed max-w-3xl">
                      {evt.description}
                    </p>

                    <div className="text-[11px] text-slate-400 flex items-center gap-3">
                      <span>Reported by: <strong className="text-slate-600 font-medium">{evt.reporter_role}</strong></span>
                      {evt.evidence_reference && <span>Evidence: {evt.evidence_reference}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                    <span className={`px-2 py-1 rounded text-[11px] font-medium ${
                      evt.review_status === 'Reviewed & Actioned'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {evt.review_status}
                    </span>

                    {(currentRole === 'Veterinarian' || currentRole === 'Farm Manager' || currentRole === 'Administrator') && evt.review_status === 'Pending Review' && (
                      <button
                        onClick={() => handleUpdateStatus(evt.event_id, 'Reviewed & Actioned')}
                        className="px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200"
                      >
                        Action Incident
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Report Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900 text-sm">Report Cow or Milking Incident</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Farm</label>
                  <select
                    value={form.farm_id}
                    onChange={(e) => setForm({ ...form, farm_id: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  >
                    {farms.map((f) => (
                      <option key={f.farm_id} value={f.farm_id}>{f.farm_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Associated Cow (Optional)</label>
                  <select
                    value={form.cow_id}
                    onChange={(e) => setForm({ ...form, cow_id: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  >
                    <option value="">Farm-level / General</option>
                    {cows.filter(c => !form.farm_id || c.farm_id === form.farm_id).map((c) => (
                      <option key={c.cow_id} value={c.cow_id}>{c.tag_number} ({c.breed})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Event Category</label>
                  <select
                    value={form.event_type}
                    onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  >
                    <option value="Drop in Milk Yield">Drop in Milk Yield</option>
                    <option value="Abnormal Milk (Clots/Watery)">Abnormal Milk (Clots/Watery)</option>
                    <option value="Udder Swelling or Heat">Udder Swelling or Heat</option>
                    <option value="Kicking Milking Machine/Pain">Kicking Milking Machine/Pain</option>
                    <option value="Off-Feed/Lethargy">Off-Feed/Lethargy</option>
                    <option value="Hygiene Protocol Breach">Hygiene Protocol Breach</option>
                    <option value="Screening Delayed">Screening Delayed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Severity Level</label>
                  <select
                    value={form.severity}
                    onChange={(e) => setForm({ ...form, severity: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  >
                    <option value="Low Concern">Low Concern</option>
                    <option value="Moderate Attention">Moderate Attention</option>
                    <option value="High Urgent Priority">High Urgent Priority</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Incident Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detail visible milk changes (clots, flakes, watery), affected quarter, milker observation..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Evidence / Logbook Reference</label>
                <input
                  type="text"
                  placeholder="e.g. Strip cup log #32, milker Murugan observation"
                  value={form.evidence_reference}
                  onChange={(e) => setForm({ ...form, evidence_reference: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium text-white bg-emerald-700 rounded-lg"
                >
                  Submit Incident Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
