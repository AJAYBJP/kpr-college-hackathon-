import React from 'react';
import {
  LayoutDashboard, Building2, Binary, CalendarPlus, CloudSun,
  Sparkles, AlertCircle, FileSpreadsheet, ShieldAlert, CheckSquare,
  Stethoscope, IndianRupee, LineChart, FileText
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  openAlertsCount?: number;
  overdueCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  openAlertsCount = 0,
  overdueCount = 0
}) => {
  const navSections = [
    {
      heading: 'Herd & Core Health',
      items: [
        { id: 'dashboard', label: 'Overview Dashboard', icon: LayoutDashboard },
        { id: 'farms', label: 'Farm Registry', icon: Building2 },
        { id: 'cows', label: 'Cow Profiles & History', icon: Binary },
        { id: 'daily-monitoring', label: 'Daily Monitoring Entry', icon: CalendarPlus }
      ]
    },
    {
      heading: 'Context & Operations',
      items: [
        { id: 'environmental', label: 'Environmental & THI', icon: CloudSun },
        { id: 'operations', label: 'Milking Hygiene & Ops', icon: Sparkles },
        { id: 'user-events', label: 'User-Reported Events', icon: AlertCircle },
        { id: 'csv-import', label: 'CSV Import & Validation', icon: FileSpreadsheet }
      ]
    },
    {
      heading: 'Screening & Coordination',
      items: [
        { id: 'screening-engine', label: 'Risk Screening Engine', icon: ShieldAlert },
        {
          id: 'alerts-coordination',
          label: 'Alerts & Follow-ups',
          icon: CheckSquare,
          badge: openAlertsCount > 0 ? `${openAlertsCount}` : undefined,
          badgeAlert: overdueCount > 0
        },
        { id: 'diagnostics-treatment', label: 'Diagnostics & Treatments', icon: Stethoscope }
      ]
    },
    {
      heading: 'Analytics & Compliance',
      items: [
        { id: 'revenue-analysis', label: 'Milk-Loss & Revenue', icon: IndianRupee },
        { id: 'model-evaluation', label: 'Model & Performance', icon: LineChart },
        { id: 'reports-export', label: 'Reports & Exports', icon: FileText }
      ]
    }
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-800">
        <div className="w-7 h-7 rounded-md bg-emerald-500 text-slate-900 flex items-center justify-center font-bold text-xs">
          UW
        </div>
        <div>
          <div className="font-semibold text-white text-sm tracking-tight">UdderWatch AI</div>
          <div className="text-[10px] text-emerald-400 font-medium">Early Warning System</div>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {navSections.map((sec, idx) => (
          <div key={idx}>
            <div className="px-3 pb-1.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
              {sec.heading}
            </div>
            <div className="space-y-0.5">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-emerald-600/90 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                        item.badgeAlert ? 'bg-rose-500 text-white font-bold' : 'bg-slate-700 text-slate-200'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Provenance Note */}
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center justify-between">
          <span>Peri-Urban Tamil Nadu</span>
          <span className="font-mono text-[10px]">v1.2.0</span>
        </div>
        <div className="text-[10px] text-slate-400 mt-1">
          Decision support tool · Not a diagnosis
        </div>
      </div>
    </aside>
  );
};
