import React, { useState, useEffect } from 'react';
import { UserRole } from './types/index.ts';
import { api } from './services/api.ts';
import { Header } from './components/Header.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { RuntimeModal } from './components/RuntimeModal.tsx';

// Views
import { OverviewDashboard } from './components/views/OverviewDashboard.tsx';
import { FarmRegistryView } from './components/views/FarmRegistryView.tsx';
import { CowRegistryView } from './components/views/CowRegistryView.tsx';
import { DailyMonitoringView } from './components/views/DailyMonitoringView.tsx';
import { EnvironmentalView } from './components/views/EnvironmentalView.tsx';
import { OperationsView } from './components/views/OperationsView.tsx';
import { UserEventsView } from './components/views/UserEventsView.tsx';
import { CsvImportView } from './components/views/CsvImportView.tsx';
import { ScreeningEngineView } from './components/views/ScreeningEngineView.tsx';
import { AlertsCoordinationView } from './components/views/AlertsCoordinationView.tsx';
import { DiagnosticsTreatmentView } from './components/views/DiagnosticsTreatmentView.tsx';
import { MilkLossRevenueView } from './components/views/MilkLossRevenueView.tsx';
import { ModelEvaluationView } from './components/views/ModelEvaluationView.tsx';
import { ReportsView } from './components/views/ReportsView.tsx';

export default function App() {
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [currentRole, setCurrentRole] = useState<UserRole>('Farm Manager');
  const [isRuntimeModalOpen, setIsRuntimeModalOpen] = useState<boolean>(false);

  // App-level stats for badges
  const [openAlertsCount, setOpenAlertsCount] = useState<number>(0);
  const [overdueCount, setOverdueCount] = useState<number>(0);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Cross-view navigation context
  const [navParams, setNavParams] = useState<any>({});

  useEffect(() => {
    loadGlobalStats();
  }, [refreshKey]);

  const loadGlobalStats = async () => {
    try {
      const data = await api.getDashboard();
      const open = data?.recent_alerts?.filter((a: any) => a.status !== 'Closed' && a.status !== 'Resolved').length || 0;
      setOpenAlertsCount(open);
      setOverdueCount(data?.overdue_followups || 0);
    } catch (err) {
      console.error('Failed to load global stats:', err);
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleNavigate = (view: string, params?: any) => {
    setActiveView(view);
    if (params) {
      setNavParams(params);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        activeView={activeView}
        setActiveView={(v) => {
          setActiveView(v);
          setNavParams({});
        }}
        openAlertsCount={openAlertsCount}
        overdueCount={overdueCount}
      />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <Header
          currentRole={currentRole}
          setCurrentRole={setCurrentRole}
          activeView={activeView}
          onOpenRuntimeModal={() => setIsRuntimeModalOpen(true)}
          onRefreshData={handleRefresh}
        />

        <main className="flex-1 overflow-y-auto">
          {activeView === 'dashboard' && (
            <OverviewDashboard onNavigate={handleNavigate} />
          )}

          {activeView === 'farms' && (
            <FarmRegistryView
              currentRole={currentRole}
              onNavigateToCows={(farmId) => handleNavigate('cows', { farmId })}
              onNavigateToEnv={(farmId) => handleNavigate('environmental', { farmId })}
            />
          )}

          {activeView === 'cows' && (
            <CowRegistryView
              currentRole={currentRole}
              initialFarmFilter={navParams.farmId}
              onNavigateToScreening={() => handleNavigate('screening-engine')}
            />
          )}

          {activeView === 'daily-monitoring' && (
            <DailyMonitoringView
              currentRole={currentRole}
              onRecordSaved={handleRefresh}
            />
          )}

          {activeView === 'environmental' && (
            <EnvironmentalView
              currentRole={currentRole}
              initialFarmId={navParams.farmId}
            />
          )}

          {activeView === 'operations' && (
            <OperationsView currentRole={currentRole} />
          )}

          {activeView === 'user-events' && (
            <UserEventsView currentRole={currentRole} />
          )}

          {activeView === 'csv-import' && (
            <CsvImportView
              currentRole={currentRole}
              onImportCompleted={handleRefresh}
            />
          )}

          {activeView === 'screening-engine' && (
            <ScreeningEngineView
              currentRole={currentRole}
              onAlertsUpdated={handleRefresh}
            />
          )}

          {activeView === 'alerts-coordination' && (
            <AlertsCoordinationView
              currentRole={currentRole}
              initialAlertId={navParams.alert_id}
              onRefreshData={handleRefresh}
            />
          )}

          {activeView === 'diagnostics-treatment' && (
            <DiagnosticsTreatmentView currentRole={currentRole} />
          )}

          {activeView === 'revenue-analysis' && (
            <MilkLossRevenueView currentRole={currentRole} />
          )}

          {activeView === 'model-evaluation' && (
            <ModelEvaluationView currentRole={currentRole} />
          )}

          {activeView === 'reports-export' && (
            <ReportsView currentRole={currentRole} />
          )}
        </main>
      </div>

      {/* Runtime Architecture & Database Inspection Modal */}
      <RuntimeModal
        isOpen={isRuntimeModalOpen}
        onClose={() => setIsRuntimeModalOpen(false)}
        onDataReset={handleRefresh}
      />
    </div>
  );
}
