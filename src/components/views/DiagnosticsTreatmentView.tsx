import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { DiagnosticResult, TreatmentRecord, Cow, UserRole } from '../../types/index.ts';
import { Stethoscope, ShieldCheck, AlertCircle, Plus, Check, Clock, Calendar } from 'lucide-react';

interface DiagnosticsTreatmentViewProps {
  currentRole: UserRole;
}

export const DiagnosticsTreatmentView: React.FC<DiagnosticsTreatmentViewProps> = ({ currentRole }) => {
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'treatments'>('diagnostics');
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [treatments, setTreatments] = useState<TreatmentRecord[]>([]);
  const [cows, setCows] = useState<Cow[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isDiagModalOpen, setIsDiagModalOpen] = useState(false);
  const [isTreatModalOpen, setIsTreatModalOpen] = useState(false);

  const [diagForm, setDiagForm] = useState({
    cow_id: '',
    sample_date: new Date().toISOString().substring(0, 10),
    test_type: 'Bacterial Culture & Isolation',
    test_result: 'Positive',
    reference_range_or_criteria: 'Standard IDF blood agar culture at 37°C for 48h (>1000 CFU/mL)',
    veterinarian_diagnosis: 'Subclinical Mastitis Confirmed',
    laboratory_confirmation: 'TANUVAS Referral Laboratory',
    pathogen_identification: 'Streptococcus uberis',
    verified_by: 'Dr. S. Ramesh (TANUVAS Microbiologist)'
  });

  const [treatForm, setTreatForm] = useState({
    cow_id: '',
    prescribed_by: 'Dr. S. Ramesh (Field Veterinarian)',
    treatment_name: 'Intramammary Cloxacillin Infusion (3 doses q24h) + Flunixin Meglumine',
    start_date: new Date().toISOString().substring(0, 10) + ' 08:00:00',
    end_date: new Date(Date.now() + 3 * 86400000).toISOString().substring(0, 10) + ' 08:00:00',
    milk_withdrawal_start: new Date().toISOString().substring(0, 10) + ' 08:00:00',
    milk_withdrawal_end: new Date(Date.now() + 7 * 86400000).toISOString().substring(0, 10) + ' 08:00:00',
    treatment_cost: 1450.0,
    outcome: 'Clinical Cure Documented',
    recurrence_observed: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [d, t, c] = await Promise.all([
        api.getDiagnosticResults(),
        api.getTreatments(),
        api.getCows()
      ]);
      setDiagnostics(d);
      setTreatments(t);
      setCows(c);
      if (c.length > 0 && !diagForm.cow_id) {
        setDiagForm(prev => ({ ...prev, cow_id: c[0].cow_id }));
        setTreatForm(prev => ({ ...prev, cow_id: c[0].cow_id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDiag = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createDiagnosticResult({
        ...diagForm,
        verification_date: diagForm.sample_date,
        actor: currentRole
      });
      setIsDiagModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(`Error saving diagnostic: ${err.message}`);
    }
  };

  const handleCreateTreat = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createTreatment({
        ...treatForm,
        treatment_cost: parseFloat(treatForm.treatment_cost.toString()),
        actor: currentRole
      });
      setIsTreatModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(`Error saving treatment: ${err.message}`);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Verified Diagnostics & Veterinary Treatments</h2>
          <p className="text-xs text-slate-500">Separation of reference microbiology labels and food-safety milk withdrawal tracking</p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'diagnostics' ? (
            (currentRole === 'Veterinarian' || currentRole === 'Administrator') && (
              <button
                onClick={() => setIsDiagModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Lab Confirmation</span>
              </button>
            )
          ) : (
            (currentRole === 'Veterinarian' || currentRole === 'Administrator') && (
              <button
                onClick={() => setIsTreatModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-purple-700 hover:bg-purple-800 rounded-lg shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Prescribe Treatment</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Mandatory Data Governance Policy Banner */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3 text-xs text-slate-700">
        <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
        <div>
          <strong>Data Integrity & Antimicrobial Stewardship:</strong> Confirmed laboratory bacteriology (culture & PCR) is stored in a separate table from statistical screening indicators to prevent data leakage. Antibiotic treatments require mandatory milk withdrawal tracking to prevent antibiotic residues in bulk tank milk.
        </div>
      </div>

      {/* Segmented Tab Navigation */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit text-xs">
        <button
          onClick={() => setActiveTab('diagnostics')}
          className={`px-4 py-1.5 rounded-md font-medium transition-colors ${
            activeTab === 'diagnostics' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Reference Lab Diagnostics ({diagnostics.length})
        </button>
        <button
          onClick={() => setActiveTab('treatments')}
          className={`px-4 py-1.5 rounded-md font-medium transition-colors ${
            activeTab === 'treatments' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Veterinary Treatments & Withdrawal ({treatments.length})
        </button>
      </div>

      {/* Tab 1: Diagnostics Table */}
      {activeTab === 'diagnostics' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                <tr>
                  <th className="px-4 py-3">Sample Date</th>
                  <th className="px-4 py-3">Cow / Breed</th>
                  <th className="px-4 py-3">Test Method</th>
                  <th className="px-4 py-3">Test Result</th>
                  <th className="px-4 py-3">Pathogen Identified</th>
                  <th className="px-4 py-3">Veterinarian Diagnosis</th>
                  <th className="px-4 py-3">Reference Lab</th>
                  <th className="px-4 py-3">Verified By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {diagnostics.map((d) => (
                  <tr key={d.diagnostic_id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono text-slate-500">{d.sample_date}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 font-mono">{d.tag_number || d.cow_id}</div>
                      <div className="text-[10px] text-slate-400">{d.breed}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-800 font-medium">{d.test_type}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        d.test_result === 'Positive' ? 'bg-rose-100 text-rose-800' :
                        d.test_result === 'Negative' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {d.test_result}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">{d.pathogen_identification || 'None isolated'}</td>
                    <td className="px-4 py-3 text-slate-800">{d.veterinarian_diagnosis}</td>
                    <td className="px-4 py-3 text-slate-600">{d.laboratory_confirmation}</td>
                    <td className="px-4 py-3 text-slate-500">{d.verified_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Treatments Table */}
      {activeTab === 'treatments' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                <tr>
                  <th className="px-4 py-3">Start Date</th>
                  <th className="px-4 py-3">Cow / Tag</th>
                  <th className="px-4 py-3">Prescribed Treatment</th>
                  <th className="px-4 py-3">Mandatory Milk Withdrawal Period</th>
                  <th className="px-4 py-3 text-right">Cost (INR)</th>
                  <th className="px-4 py-3">Observed Outcome</th>
                  <th className="px-4 py-3">Prescribed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {treatments.map((t) => (
                  <tr key={t.treatment_id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono text-slate-500">{t.start_date.substring(0, 10)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900 font-mono">{t.tag_number || t.cow_id}</td>
                    <td className="px-4 py-3 text-slate-800 font-medium max-w-xs">{t.treatment_name}</td>
                    <td className="px-4 py-3">
                      <div className="p-1.5 bg-amber-50 text-amber-900 border border-amber-200 rounded text-[11px] font-mono leading-tight">
                        Withhold: {t.milk_withdrawal_start.substring(0, 10)} → {t.milk_withdrawal_end.substring(0, 10)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      ₹{t.treatment_cost.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {t.outcome}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{t.prescribed_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Diagnostic Modal */}
      {isDiagModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-5 space-y-4 text-xs">
            <h3 className="font-semibold text-slate-900 text-sm">Record Verified Laboratory Diagnostic</h3>
            <form onSubmit={handleCreateDiag} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Cow</label>
                <select
                  value={diagForm.cow_id}
                  onChange={(e) => setDiagForm({ ...diagForm, cow_id: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                >
                  {cows.map((c) => (
                    <option key={c.cow_id} value={c.cow_id}>{c.tag_number} ({c.breed})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Test Type</label>
                  <select
                    value={diagForm.test_type}
                    onChange={(e) => setDiagForm({ ...diagForm, test_type: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  >
                    <option value="Bacterial Culture & Isolation">Bacterial Culture & Isolation</option>
                    <option value="Multiplex Real-Time PCR">Multiplex Real-Time PCR</option>
                    <option value="Microscopic Somatic Cell Count (DMSCC)">Microscopic Somatic Cell Count</option>
                    <option value="Quarter California Mastitis Test (Lab Confirmed)">Quarter CMT (Lab Confirmed)</option>
                    <option value="Antimicrobial Sensitivity Testing (AST)">Antimicrobial Sensitivity (AST)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Test Result</label>
                  <select
                    value={diagForm.test_result}
                    onChange={(e) => setDiagForm({ ...diagForm, test_result: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  >
                    <option value="Positive">Positive</option>
                    <option value="Negative">Negative</option>
                    <option value="Inconclusive/Contaminated">Inconclusive/Contaminated</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Pathogen Identification</label>
                <input
                  type="text"
                  placeholder="e.g. Streptococcus agalactiae, Staphylococcus aureus"
                  value={diagForm.pathogen_identification}
                  onChange={(e) => setDiagForm({ ...diagForm, pathogen_identification: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Veterinarian Clinical Diagnosis</label>
                <select
                  value={diagForm.veterinarian_diagnosis}
                  onChange={(e) => setDiagForm({ ...diagForm, veterinarian_diagnosis: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                >
                  <option value="Subclinical Mastitis Confirmed">Subclinical Mastitis Confirmed</option>
                  <option value="Clinical Mastitis Confirmed">Clinical Mastitis Confirmed</option>
                  <option value="Healthy Udder - No Mastitis">Healthy Udder - No Mastitis</option>
                  <option value="Non-Specific Inflammation">Non-Specific Inflammation</option>
                  <option value="Pending Further Workup">Pending Further Workup</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Confirming Laboratory</label>
                  <select
                    value={diagForm.laboratory_confirmation}
                    onChange={(e) => setDiagForm({ ...diagForm, laboratory_confirmation: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  >
                    <option value="State Veterinary Diagnostic Lab (Chennai)">State Vet Diagnostic Lab (Chennai)</option>
                    <option value="TANUVAS Referral Laboratory">TANUVAS Referral Laboratory</option>
                    <option value="District Polyclinic Lab (Coimbatore)">District Polyclinic Lab</option>
                    <option value="On-Farm Verified Rapid PCR">On-Farm Verified Rapid PCR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Verified By (Clinician)</label>
                  <input
                    type="text"
                    required
                    value={diagForm.verified_by}
                    onChange={(e) => setDiagForm({ ...diagForm, verified_by: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button type="button" onClick={() => setIsDiagModalOpen(false)} className="px-3 py-1.5 text-slate-600 bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-1.5 font-medium text-white bg-emerald-700 rounded-lg">Save Diagnostic Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Treatment Modal */}
      {isTreatModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-5 space-y-4 text-xs">
            <h3 className="font-semibold text-slate-900 text-sm">Prescribe Veterinary Treatment & Milk Withdrawal</h3>
            <form onSubmit={handleCreateTreat} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Treated Cow</label>
                <select
                  value={treatForm.cow_id}
                  onChange={(e) => setTreatForm({ ...treatForm, cow_id: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                >
                  {cows.map((c) => (
                    <option key={c.cow_id} value={c.cow_id}>{c.tag_number} ({c.breed})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Prescription & Protocol</label>
                <input
                  type="text"
                  required
                  value={treatForm.treatment_name}
                  onChange={(e) => setTreatForm({ ...treatForm, treatment_name: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Treatment Start Date</label>
                  <input
                    type="date"
                    required
                    value={treatForm.start_date.substring(0, 10)}
                    onChange={(e) => setTreatForm({ ...treatForm, start_date: e.target.value + ' 08:00:00' })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Treatment End Date</label>
                  <input
                    type="date"
                    required
                    value={treatForm.end_date.substring(0, 10)}
                    onChange={(e) => setTreatForm({ ...treatForm, end_date: e.target.value + ' 08:00:00' })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                <div className="font-semibold text-amber-900 text-[11px]">
                  MANDATORY MILK WITHDRAWAL (Food Safety & Residue Compliance)
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-amber-950 font-medium mb-1">Withdrawal Start</label>
                    <input
                      type="date"
                      required
                      value={treatForm.milk_withdrawal_start.substring(0, 10)}
                      onChange={(e) => setTreatForm({ ...treatForm, milk_withdrawal_start: e.target.value + ' 08:00:00' })}
                      className="w-full px-3 py-1.5 border border-amber-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-amber-950 font-medium mb-1">Withdrawal Clearance Date</label>
                    <input
                      type="date"
                      required
                      value={treatForm.milk_withdrawal_end.substring(0, 10)}
                      onChange={(e) => setTreatForm({ ...treatForm, milk_withdrawal_end: e.target.value + ' 08:00:00' })}
                      className="w-full px-3 py-1.5 border border-amber-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Treatment Cost (INR ₹)</label>
                  <input
                    type="number"
                    step="50"
                    min="0"
                    required
                    value={treatForm.treatment_cost}
                    onChange={(e) => setTreatForm({ ...treatForm, treatment_cost: parseFloat(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Expected / Initial Outcome</label>
                  <select
                    value={treatForm.outcome}
                    onChange={(e) => setTreatForm({ ...treatForm, outcome: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  >
                    <option value="Clinical Cure Documented">Clinical Cure Documented</option>
                    <option value="Ongoing Course">Ongoing Course</option>
                    <option value="Partial Improvement">Partial Improvement</option>
                    <option value="Chronic Unresponsive">Chronic Unresponsive</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button type="button" onClick={() => setIsTreatModalOpen(false)} className="px-3 py-1.5 text-slate-600 bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-1.5 font-medium text-white bg-purple-700 rounded-lg">Prescribe & Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
