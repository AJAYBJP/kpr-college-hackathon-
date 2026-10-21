import React, { useState } from 'react';
import { api } from '../../services/api.ts';
import { UserRole } from '../../types/index.ts';
import { FileSpreadsheet, Upload, CheckCircle2, AlertTriangle, AlertCircle, Download, Database, Check } from 'lucide-react';

interface CsvImportViewProps {
  currentRole: UserRole;
  onImportCompleted?: () => void;
}

export const CsvImportView: React.FC<CsvImportViewProps> = ({ currentRole, onImportCompleted }) => {
  const [csvText, setCsvText] = useState('');
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitMessage, setCommitMessage] = useState<string | null>(null);

  const sampleValidCsv = `cow_id,observed_at,morning_milk_yield_litres,evening_milk_yield_litres,SCC_cells_per_ml,CMT_result,electrical_conductivity,milk_appearance
cow_tn_che_01,2026-10-15 06:00:00,10.2,7.8,110000,Negative (0),4.8,Normal
cow_tn_che_02,2026-10-15 06:00:00,9.5,7.0,140000,Negative (0),5.0,Normal
cow_tn_che_03,2026-10-15 06:00:00,8.0,6.0,480000,Weak Positive (1),6.2,Normal
cow_tn_che_04,2026-10-15 06:00:00,11.0,8.2,95000,Negative (0),4.9,Normal
cow_tn_che_05,2026-10-15 06:00:00,6.0,4.5,1850000,Distinct Positive (2),7.2,Flakes/Clots Present`;

  const sampleInvalidCsv = `cow_id,observed_at,morning_milk_yield_litres,evening_milk_yield_litres,SCC_cells_per_ml,CMT_result,electrical_conductivity,milk_appearance
non_existent_cow_99,2026-10-15 06:00:00,10.2,7.8,110000,Negative (0),4.8,Normal
cow_tn_che_01,not-a-valid-date,10.2,7.8,110000,Negative (0),4.8,Normal
cow_tn_che_02,2026-10-15 06:00:00,85.0,7.0,140000,Negative (0),5.0,Normal
cow_tn_che_03,2026-10-15 06:00:00,8.0,6.0,480000,InvalidCMTCategory,6.2,Normal
cow_tn_che_04,2026-10-15 06:00:00,11.0,8.2,95000,Negative (0),99.5,Normal`;

  const handleValidate = async () => {
    if (!csvText.trim()) {
      alert('Please enter or upload CSV data first.');
      return;
    }
    setIsValidating(true);
    setCommitMessage(null);
    try {
      const res = await api.previewCsv(csvText);
      setValidationResult(res);
    } catch (err: any) {
      alert(`Validation error: ${err.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  const handleCommit = async () => {
    if (!csvText.trim()) return;
    setIsCommitting(true);
    try {
      const res = await api.commitCsv(csvText, currentRole);
      setCommitMessage(`Successfully committed ${res.inserted_records} valid records to SQLite udderwatch.db. (${res.skipped_records} skipped)`);
      onImportCompleted?.();
    } catch (err: any) {
      alert(`Commit error: ${err.message}`);
    } finally {
      setIsCommitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setCsvText(text);
      setValidationResult(null);
      setCommitMessage(null);
    };
    reader.readAsText(file);
  };

  const downloadErrorReport = () => {
    if (!validationResult || !validationResult.errors || validationResult.errors.length === 0) return;
    const headers = ['row_number', 'column', 'value', 'error_type', 'message'];
    const rows = validationResult.errors.map((e: any) =>
      `"${e.row_number}","${e.column}","${e.value || ''}","${e.error_type}","${e.message.replace(/"/g, '""')}"`
    );
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `udderwatch_validation_errors_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">CSV Batch Import & Verification Pipeline</h2>
          <p className="text-xs text-slate-500">Rigorous schema mapping, boundary constraints, foreign key verification, and duplicate detection</p>
        </div>

        {/* Sample Quick Loaders */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setCsvText(sampleValidCsv); setValidationResult(null); setCommitMessage(null); }}
            className="px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
          >
            Load Valid Sample CSV
          </button>
          <button
            onClick={() => { setCsvText(sampleInvalidCsv); setValidationResult(null); setCommitMessage(null); }}
            className="px-2.5 py-1 text-xs font-medium text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
          >
            Load Error-Stress Sample CSV
          </button>
        </div>
      </div>

      {/* Input Box & File Drop */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="text-xs font-semibold text-slate-900">
            Paste CSV Content or Upload File
          </label>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileUpload}
            className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
          />
        </div>

        <textarea
          rows={6}
          value={csvText}
          onChange={(e) => { setCsvText(e.target.value); setValidationResult(null); }}
          placeholder="Paste comma-separated rows with header: cow_id,observed_at,morning_milk_yield_litres,evening_milk_yield_litres,SCC_cells_per_ml,CMT_result,electrical_conductivity,milk_appearance"
          className="w-full p-3 font-mono text-xs border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-emerald-600 leading-relaxed"
        />

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Supported models: Daily milk monitoring, environmental records, cow registry, financial costs.
          </span>
          <button
            onClick={handleValidate}
            disabled={isValidating || !csvText.trim()}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
          >
            {isValidating ? 'Validating Boundaries...' : 'Validate CSV Rows'}
          </button>
        </div>
      </div>

      {/* Validation Results Report */}
      {validationResult && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5 animate-fadeIn">
          {/* Summary Metric Counters */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Validation Summary</h3>
                <p className="text-xs text-slate-500">Detected Schema: <strong className="text-slate-800 font-mono">{validationResult.detected_schema_type.toUpperCase()}</strong></p>
              </div>

              {validationResult.errors.length > 0 && (
                <button
                  onClick={downloadErrorReport}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Error Report (.csv)</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-[11px] text-slate-500 font-medium">Total Rows</div>
                <div className="text-xl font-bold font-mono text-slate-900 mt-1 tabular-nums">{validationResult.total_rows}</div>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="text-[11px] text-emerald-800 font-medium">Accepted Rows</div>
                <div className="text-xl font-bold font-mono text-emerald-700 mt-1 tabular-nums">{validationResult.accepted_rows_count}</div>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <div className="text-[11px] text-rose-800 font-medium">Rejected Rows</div>
                <div className="text-xl font-bold font-mono text-rose-700 mt-1 tabular-nums">{validationResult.rejected_rows_count}</div>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="text-[11px] text-amber-800 font-medium">Duplicate Rows</div>
                <div className="text-xl font-bold font-mono text-amber-700 mt-1 tabular-nums">{validationResult.duplicate_rows_count}</div>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-[11px] text-blue-800 font-medium">Requires Review</div>
                <div className="text-xl font-bold font-mono text-blue-700 mt-1 tabular-nums">{validationResult.review_required_count}</div>
              </div>
            </div>
          </div>

          {/* Validation Errors Table */}
          {validationResult.errors.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 bg-rose-50/80 border-b border-rose-100 flex items-center gap-2 text-xs font-semibold text-rose-900">
                <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                <span>Identified Validation & Referential Violations ({validationResult.errors.length})</span>
              </div>
              <div className="max-h-52 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium sticky top-0">
                    <tr>
                      <th className="px-3.5 py-2">Row #</th>
                      <th className="px-3.5 py-2">Column</th>
                      <th className="px-3.5 py-2">Recorded Value</th>
                      <th className="px-3.5 py-2">Violation Type</th>
                      <th className="px-3.5 py-2">Explanation & Rule</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {validationResult.errors.map((err: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="px-3.5 py-2 font-bold text-slate-800">{err.row_number}</td>
                        <td className="px-3.5 py-2 text-slate-700 font-sans">{err.column}</td>
                        <td className="px-3.5 py-2 text-slate-600 truncate max-w-[120px]">{err.value != null ? String(err.value) : 'NULL'}</td>
                        <td className="px-3.5 py-2">
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-100 text-rose-800 font-semibold">
                            {err.error_type}
                          </span>
                        </td>
                        <td className="px-3.5 py-2 text-slate-800 font-sans">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Commit Action */}
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Only rows passing foreign-key and range constraints will be inserted into SQLite.
            </div>

            <button
              onClick={handleCommit}
              disabled={isCommitting || validationResult.accepted_rows_count === 0}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg shadow-sm transition-colors whitespace-nowrap"
            >
              <Database className="w-4 h-4" />
              <span>{isCommitting ? 'Committing to SQLite...' : `Commit ${validationResult.accepted_rows_count} Accepted Records`}</span>
            </button>
          </div>

          {commitMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{commitMessage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
