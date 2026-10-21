import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { Alert, FollowUp, UserRole } from '../../types/index.ts';
import { CheckSquare, AlertTriangle, Clock, UserCheck, ShieldAlert, Check, X, ArrowRight, AlertCircle } from 'lucide-react';

interface AlertsCoordinationViewProps {
  currentRole: UserRole;
  initialAlertId?: string;
  onRefreshData?: () => void;
}

export const AlertsCoordinationView: React.FC<AlertsCoordinationViewProps> = ({
  currentRole,
  initialAlertId,
  onRefreshData
}) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Coordination gaps state
  const [coordinationGaps, setCoordinationGaps] = useState<any[]>([]);

  // Action Modals State
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [actionType, setActionType] = useState<'acknowledge' | 'assign' | 'close' | 'followup' | null>(null);
  const [assigneeName, setAssigneeName] = useState('Dr. S. Ramesh (Field Vet)');
  const [closeOutcome, setCloseOutcome] = useState('');
  const [followupResultText, setFollowupResultText] = useState('CMT Score 2 confirmed in left quarter. Veterinary referral initiated.');

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [alts, flws, evals] = await Promise.all([
        api.getAlerts({ status: filterStatus || undefined }),
        api.getFollowUps(),
        api.getEvaluation()
      ]);
      setAlerts(alts);
      setFollowups(flws);
      setCoordinationGaps(evals.service_effectiveness?.coordination_gaps_list || []);

      if (initialAlertId) {
        const target = alts.find(a => a.alert_id === initialAlertId);
        if (target) setSelectedAlert(target);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      await api.updateAlert(alertId, {
        status: 'Acknowledged',
        actor: currentRole
      });
      loadData();
      onRefreshData?.();
    } catch (err: any) {
      alert(`Error acknowledging: ${err.message}`);
    }
  };

  const handleAssign = async () => {
    if (!selectedAlert) return;
    try {
      await api.updateAlert(selectedAlert.alert_id, {
        status: 'Screening Scheduled',
        assigned_to: assigneeName,
        actor: currentRole
      });
      setActionType(null);
      loadData();
      onRefreshData?.();
    } catch (err: any) {
      alert(`Error assigning: ${err.message}`);
    }
  };

  const handleCloseAlert = async () => {
    if (!selectedAlert) return;
    if (!closeOutcome.trim()) {
      alert('A documented clinical or operational outcome is required to close an alert (prevents coordination gaps).');
      return;
    }
    try {
      await api.updateAlert(selectedAlert.alert_id, {
        status: 'Closed',
        outcome: closeOutcome,
        actor: currentRole
      });
      setActionType(null);
      setCloseOutcome('');
      loadData();
      onRefreshData?.();
    } catch (err: any) {
      alert(`Error closing: ${err.message}`);
    }
  };

  const handleCompleteFollowup = async (followupId: string) => {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    try {
      await api.updateFollowUp(followupId, {
        completed_at: now,
        followup_result: followupResultText,
        outcome_notes: 'Completed quarter CMT and milk visual exam',
        actor: currentRole
      });
      setActionType(null);
      loadData();
      onRefreshData?.();
    } catch (err: any) {
      alert(`Error completing follow-up: ${err.message}`);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Alerts & Operational Coordination Queue</h2>
        <p className="text-xs text-slate-500">Track screening progress, assign responsible staff, and eliminate care delivery gaps</p>
      </div>

      {/* Coordination Gaps Active Detector Banner */}
      {coordinationGaps.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-900">
            <AlertTriangle className="w-4 h-4 text-rose-700" />
            <span>Active Coordination & Service Delivery Gaps Detected ({coordinationGaps.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {coordinationGaps.map((g, idx) => (
              <div key={idx} className="p-2.5 bg-white border border-rose-200 rounded-lg text-rose-950 flex items-start gap-2">
                <span className="font-bold text-rose-700 text-[10px] uppercase shrink-0 mt-0.5">• {g.type}:</span>
                <span className="text-[11px] leading-tight">{g.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters Segmented Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setFilterStatus('')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
            filterStatus === '' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All Alerts ({alerts.length})
        </button>
        <button
          onClick={() => setFilterStatus('New')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
            filterStatus === 'New' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          New
        </button>
        <button
          onClick={() => setFilterStatus('Acknowledged')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
            filterStatus === 'Acknowledged' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Acknowledged
        </button>
        <button
          onClick={() => setFilterStatus('Veterinarian Referred')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
            filterStatus === 'Veterinarian Referred' ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Veterinarian Referred
        </button>
        <button
          onClick={() => setFilterStatus('Closed')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
            filterStatus === 'Closed' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Closed / Resolved
        </button>
      </div>

      {/* Alerts Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 text-sm">Alert Action Queue</h3>
          <span className="text-xs font-mono text-slate-500">{alerts.length} records</span>
        </div>

        <div className="divide-y divide-slate-100">
          {alerts.map((a) => {
            const reasons: string[] = JSON.parse(a.reasons_json || '[]');
            const isUrgent = a.risk_category === 'Urgent veterinary review';
            const isClosed = a.status === 'Closed' || a.status === 'Resolved';
            const matchedFollowup = followups.find(f => f.alert_id === a.alert_id);

            return (
              <div key={a.alert_id} className="p-5 hover:bg-slate-50/70 transition-colors space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                      isUrgent ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {a.risk_category}
                    </span>
                    <strong className="text-sm text-slate-900">Cow {a.tag_number} ({a.breed})</strong>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs text-slate-600">{a.farm_name}</span>
                    <span className="text-slate-300">·</span>
                    <span className="font-mono text-xs text-slate-400">Created: {a.created_at}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold">
                      {a.status}
                    </span>
                    {a.assigned_to && (
                      <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                        <span>{a.assigned_to}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-xs text-slate-700 space-y-1">
                  <div className="font-medium text-slate-900">Recommended Action: {a.recommended_action}</div>
                  <div className="text-slate-500 text-[11px] space-y-0.5">
                    {reasons.slice(0, 3).map((r, i) => (
                      <div key={i}>• {r}</div>
                    ))}
                  </div>
                </div>

                {a.outcome && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">
                    <strong>Documented Outcome:</strong> {a.outcome}
                  </div>
                )}

                {/* Follow-up Status Strip */}
                {matchedFollowup && (
                  <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
                    <div>
                      <span>Follow-up Due: <strong className="font-mono text-slate-800">{matchedFollowup.due_at}</strong></span>
                      {matchedFollowup.completed_at ? (
                        <span className="text-emerald-700 ml-2 font-medium">✓ Completed on {matchedFollowup.completed_at}</span>
                      ) : (
                        <span className="text-amber-700 ml-2 font-medium">Pending Screening</span>
                      )}
                    </div>

                    {!matchedFollowup.completed_at && (
                      <button
                        onClick={() => { setSelectedAlert(a); setActionType('followup'); }}
                        className="text-emerald-700 hover:text-emerald-800 font-semibold"
                      >
                        Record Follow-up Screening Result
                      </button>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  {a.status === 'New' && (
                    <button
                      onClick={() => handleAcknowledge(a.alert_id)}
                      className="px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                    >
                      Acknowledge Alert
                    </button>
                  )}

                  {!isClosed && (
                    <>
                      <button
                        onClick={() => { setSelectedAlert(a); setActionType('assign'); }}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        Assign Responsibility
                      </button>

                      <button
                        onClick={() => { setSelectedAlert(a); setActionType('close'); }}
                        className="px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        Close Alert with Outcome
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Assign Modal */}
      {actionType === 'assign' && selectedAlert && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-5 space-y-4 text-xs">
            <h3 className="font-semibold text-slate-900 text-sm">Assign Alert Responsibility</h3>
            <p className="text-slate-500">Alert for Cow {selectedAlert.tag_number}</p>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Select Responsible Clinician or Lead</label>
              <select
                value={assigneeName}
                onChange={(e) => setAssigneeName(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
              >
                <option value="Dr. S. Ramesh (Field Vet)">Dr. S. Ramesh (Field Veterinarian)</option>
                <option value="Dr. V. Meenakshi (Consulting Vet)">Dr. V. Meenakshi (Consulting Vet)</option>
                <option value="K. Rajendran (Farm Manager)">K. Rajendran (Farm Manager)</option>
                <option value="Field Para-Vet Selvam">Field Para-Vet Selvam</option>
              </select>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button onClick={() => setActionType(null)} className="px-3 py-1.5 text-slate-600 bg-slate-100 rounded-lg">Cancel</button>
              <button onClick={handleAssign} className="px-4 py-1.5 font-medium text-white bg-emerald-700 rounded-lg">Save Assignment</button>
            </div>
          </div>
        </div>
      )}

      {/* Close Alert Modal */}
      {actionType === 'close' && selectedAlert && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4 text-xs">
            <h3 className="font-semibold text-slate-900 text-sm">Close Screening Alert with Documented Outcome</h3>
            <p className="text-slate-500 leading-relaxed">
              To prevent coordination gaps, every closed alert must include documented clinical resolution or verified testing findings.
            </p>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Documented Clinical Outcome</label>
              <textarea
                rows={3}
                required
                placeholder="e.g. CMT repeated next shift with negative score; milk yield recovered to 21.0L; cow returned to standard milking group."
                value={closeOutcome}
                onChange={(e) => setCloseOutcome(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button onClick={() => setActionType(null)} className="px-3 py-1.5 text-slate-600 bg-slate-100 rounded-lg">Cancel</button>
              <button onClick={handleCloseAlert} className="px-4 py-1.5 font-medium text-white bg-emerald-700 rounded-lg">Close Alert</button>
            </div>
          </div>
        </div>
      )}

      {/* Follow-up Screen Modal */}
      {actionType === 'followup' && selectedAlert && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4 text-xs">
            <h3 className="font-semibold text-slate-900 text-sm">Record Screening Follow-up</h3>
            <p className="text-slate-500">Document on-farm test findings for Cow {selectedAlert.tag_number}</p>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Screening Action Result</label>
              <textarea
                rows={3}
                value={followupResultText}
                onChange={(e) => setFollowupResultText(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button onClick={() => setActionType(null)} className="px-3 py-1.5 text-slate-600 bg-slate-100 rounded-lg">Cancel</button>
              <button
                onClick={() => {
                  const m = followups.find(f => f.alert_id === selectedAlert.alert_id);
                  if (m) handleCompleteFollowup(m.followup_id);
                }}
                className="px-4 py-1.5 font-medium text-white bg-emerald-700 rounded-lg"
              >
                Mark Follow-up Completed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
