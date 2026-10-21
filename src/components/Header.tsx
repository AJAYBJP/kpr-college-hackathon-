import React, { useState } from 'react';
import { UserRole } from '../types/index.ts';
import { Shield, Database, RefreshCw, Play, Check, AlertTriangle } from 'lucide-react';
import { api } from '../services/api.ts';

interface HeaderProps {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  activeView: string;
  onOpenRuntimeModal: () => void;
  onRefreshData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  setCurrentRole,
  activeView,
  onOpenRuntimeModal,
  onRefreshData
}) => {
  const [isRunningScreening, setIsRunningScreening] = useState(false);
  const [screeningStatus, setScreeningStatus] = useState<string | null>(null);

  const handleQuickScreening = async () => {
    setIsRunningScreening(true);
    setScreeningStatus(null);
    try {
      const res = await api.runScreening(undefined, `${currentRole} (Quick Screen)`);
      setScreeningStatus(`Scanned ${res.scanned_cows} cows: ${res.new_alerts_created} new alerts`);
      onRefreshData();
      setTimeout(() => setScreeningStatus(null), 4000);
    } catch (err: any) {
      setScreeningStatus(`Error: ${err.message}`);
    } finally {
      setIsRunningScreening(false);
    }
  };

  const roleColors: Record<UserRole, string> = {
    'Farmer': 'text-amber-800 bg-amber-50 border-amber-200',
    'Farm Manager': 'text-blue-800 bg-blue-50 border-blue-200',
    'Veterinarian': 'text-emerald-800 bg-emerald-50 border-emerald-200',
    'Administrator': 'text-purple-800 bg-purple-50 border-purple-200'
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-6 shrink-0 z-10 sticky top-0">
      {/* Zone 1: Brand & View Context */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-sm">
            UW
          </div>
          <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
            UdderWatch AI
          </span>
        </div>
        <span className="text-slate-300 font-light" aria-hidden="true">/</span>
        <span className="text-sm font-medium text-slate-700 capitalize truncate">
          {activeView.replace(/-/g, ' ')}
        </span>
      </div>

      {/* Zone 2: System Status & Screening Trigger */}
      <div className="hidden lg:flex items-center gap-3">
        <button
          onClick={onOpenRuntimeModal}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
          title="Inspect SQLite Database & Runtime Status"
        >
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-mono text-[11px]">udderwatch.db (SQLite)</span>
          <span className="text-[10px] text-emerald-700 bg-emerald-100/80 px-1 py-0.2 rounded font-sans">Active</span>
        </button>

        {screeningStatus && (
          <div className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 flex items-center gap-1.5 animate-fadeIn">
            <Check className="w-3.5 h-3.5" />
            <span>{screeningStatus}</span>
          </div>
        )}

        <button
          onClick={handleQuickScreening}
          disabled={isRunningScreening}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg shadow-sm transition-colors whitespace-nowrap"
        >
          {isRunningScreening ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          <span>Run Screening Pipeline</span>
        </button>
      </div>

      {/* Zone 3: Role Switcher & User Profile */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <label htmlFor="role-select" className="text-xs text-slate-500 hidden sm:inline">Role:</label>
          <select
            id="role-select"
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value as UserRole)}
            className={`text-xs font-medium px-2.5 py-1.5 rounded-md border cursor-pointer transition-colors ${roleColors[currentRole]}`}
          >
            <option value="Farmer">Farmer (Read & Event Report)</option>
            <option value="Farm Manager">Farm Manager (Operations & Allocations)</option>
            <option value="Veterinarian">Veterinarian (Clinical Sign-off)</option>
            <option value="Administrator">Administrator (Full Control)</option>
          </select>
        </div>

        <button
          onClick={onRefreshData}
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
          title="Refresh All Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
