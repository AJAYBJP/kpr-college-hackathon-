import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { Farm, AuditLog, UserRole } from '../../types/index.ts';
import { FileText, Download, Printer, Shield, Check, Clock } from 'lucide-react';

interface ReportsViewProps {
  currentRole: UserRole;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ currentRole }) => {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<string>('');
  const [reportData, setReportData] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitial();
  }, [selectedFarm]);

  const loadInitial = async () => {
    setLoading(true);
    try {
      const [f, rep, logs] = await Promise.all([
        api.getFarms(),
        api.getReports(selectedFarm || undefined),
        api.getAuditLogs()
      ]);
      setFarms(f);
      setReportData(rep);
      setAuditLogs(logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const exportCsv = async (type: 'cows' | 'monitoring' | 'alerts' | 'financial') => {
    let filename = `udderwatch_${type}_${Date.now()}.csv`;
    let content = '';

    if (type === 'cows') {
      const cows = await api.getCows();
      const headers = ['cow_id', 'farm_id', 'tag_number', 'breed', 'parity', 'lactation_stage', 'baseline_yield'];
      const rows = cows.map(c => `"${c.cow_id}","${c.farm_id}","${c.tag_number}","${c.breed}",${c.parity},"${c.lactation_stage}",${c.baseline_milk_yield_litres}`);
      content = [headers.join(','), ...rows].join('\n');
    } else if (type === 'alerts') {
      const alerts = await api.getAlerts();
      const headers = ['alert_id', 'cow_id', 'risk_category', 'score_or_indicator', 'status', 'created_at'];
      const rows = alerts.map(a => `"${a.alert_id}","${a.cow_id}","${a.risk_category}",${a.score_or_indicator},"${a.status}","${a.created_at}"`);
      content = [headers.join(','), ...rows].join('\n');
    } else if (type === 'financial') {
      const fin = await api.getFinancialRecords();
      const headers = ['financial_id', 'farm_id', 'cow_id', 'record_date', 'expected_yield', 'actual_yield', 'discarded', 'vet_cost'];
      const rows = fin.map(f => `"${f.financial_id}","${f.farm_id}","${f.cow_id || ''}","${f.record_date}",${f.expected_yield_litres},${f.actual_yield_litres},${f.discarded_milk_litres},${f.veterinary_cost}`);
      content = [headers.join(','), ...rows].join('\n');
    }

    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Clinical Reports & Audit Compliance</h2>
          <p className="text-xs text-slate-500">Official herd health summary, provenance certifications, and database audit trail</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Official Report</span>
          </button>
        </div>
      </div>

      {/* Printable Clinical Report Paper */}
      <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-xs space-y-6 print:border-none print:shadow-none">
        {/* Formal Report Header */}
        <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-emerald-700 font-bold text-base tracking-tight uppercase">UdderWatch AI</div>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">Herd Mastitis Early Screening & Health Audit Report</h1>
            <p className="text-xs text-slate-500 mt-1">Tamil Nadu Peri-Urban Dairy Sector Decision Support System</p>
          </div>
          <div className="text-right text-xs font-mono text-slate-500">
            <div>Generated: {reportData?.report_generated_at ? new Date(reportData.report_generated_at).toLocaleString() : '--'}</div>
            <div>Pipeline: {reportData?.provenance}</div>
            <div className="text-emerald-700 font-semibold mt-1">Status: Genuine SQLite Database Persistence</div>
          </div>
        </div>

        {/* Scope and Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-slate-50 p-4 rounded-lg">
          <div>
            <span className="text-slate-500">Selected Dairy Scope:</span>
            <div className="font-semibold text-slate-900 mt-0.5">{reportData?.scope?.farm_selected}</div>
          </div>
          <div>
            <span className="text-slate-500">Observation Window:</span>
            <div className="font-semibold text-slate-900 mt-0.5">{reportData?.scope?.period}</div>
          </div>
          <div>
            <span className="text-slate-500">Cows Monitored:</span>
            <div className="font-semibold text-slate-900 font-mono mt-0.5">{reportData?.scope?.total_cows_monitored} active cows</div>
          </div>
        </div>

        {/* Mandatory Regulatory & Clinical Disclaimer */}
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-950 leading-relaxed">
          <strong>Official Clinical Disclaimer:</strong> {reportData?.disclaimer}
        </div>

        {/* Executive Summary */}
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-900 text-sm">Herd Screening Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {reportData?.alert_summary?.map((a: any, i: number) => (
              <div key={i} className="p-3 border border-slate-200 rounded-lg">
                <div className="text-slate-500 text-[11px] font-medium">{a.risk_category}</div>
                <div className="text-xl font-bold font-mono text-slate-900 mt-1">{a.cnt}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Veterinary Supervision & Financial Impact */}
        <div className="space-y-2 text-xs">
          <h3 className="font-semibold text-slate-900 text-sm">Veterinary Supervision & Expenditure</h3>
          <p className="text-slate-600">
            Total of <strong className="font-mono text-slate-900">{reportData?.treatment_summary?.courses_prescribed}</strong> veterinary treatment courses prescribed with mandatory milk withdrawal tracking. Total recorded clinical and medicinal expenditure: <strong className="font-mono text-slate-900">₹{reportData?.treatment_summary?.total_veterinary_expenditure_inr?.toLocaleString()}</strong>.
          </p>
        </div>
      </div>

      {/* CSV Export Quick Center */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
        <h3 className="font-semibold text-slate-900 text-sm">Download Verified Data Tables</h3>
        <p className="text-xs text-slate-500">Export structured CSV files for statutory dairy cooperatives or academic research</p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={() => exportCsv('cows')}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Cow Registry (.csv)</span>
          </button>
          <button
            onClick={() => exportCsv('alerts')}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Alerts Queue (.csv)</span>
          </button>
          <button
            onClick={() => exportCsv('financial')}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Financial Ledger (.csv)</span>
          </button>
        </div>
      </div>

      {/* SQLite Audit Trail */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">System & Clinical Audit Logs</h3>
            <p className="text-xs text-slate-500">Immutable ledger of screening runs, alert actions, and clinical entries</p>
          </div>
          <span className="text-xs font-mono text-slate-500">{auditLogs.length} events</span>
        </div>

        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium sticky top-0">
              <tr>
                <th className="px-4 py-2.5">Timestamp</th>
                <th className="px-4 py-2.5">Actor</th>
                <th className="px-4 py-2.5">Action</th>
                <th className="px-4 py-2.5">Target Entity</th>
                <th className="px-4 py-2.5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {auditLogs.map((log) => (
                <tr key={log.audit_id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-2 text-slate-500">{log.timestamp}</td>
                  <td className="px-4 py-2 font-sans font-medium text-slate-800">{log.actor}</td>
                  <td className="px-4 py-2 font-semibold text-emerald-800">{log.action}</td>
                  <td className="px-4 py-2 text-slate-600 font-sans">{log.entity_type} ({log.entity_id})</td>
                  <td className="px-4 py-2 text-slate-700 font-sans truncate max-w-xs">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
