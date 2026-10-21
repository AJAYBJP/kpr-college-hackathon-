import {
  Farm, Cow, MonitoringRecord, EnvironmentalRecord, OperationalRecord,
  UserReportedEvent, DiagnosticResult, Alert, FollowUp, TreatmentRecord,
  FinancialRecord, AuditLog
} from '../types/index.ts';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    }
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorData.error || `HTTP error ${res.status}`);
  }
  return res.json();
}

export const api = {
  getHealth: () => request<any>('/api/health'),
  getDashboard: (farmId?: string) => request<any>(farmId ? `/api/dashboard?farm_id=${farmId}` : '/api/dashboard'),
  
  // Farms
  getFarms: () => request<Farm[]>('/api/farms'),
  createFarm: (data: Partial<Farm>) => request<{ farm_id: string; message: string }>('/api/farms', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Cows
  getCows: (params?: { farm_id?: string; lactation_stage?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.farm_id) q.set('farm_id', params.farm_id);
    if (params?.lactation_stage) q.set('lactation_stage', params.lactation_stage);
    if (params?.search) q.set('search', params.search);
    return request<Cow[]>(`/api/cows?${q.toString()}`);
  },
  getCowDetail: (cowId: string) => request<{
    cow: Cow;
    monitoring_records: MonitoringRecord[];
    diagnostics: DiagnosticResult[];
    alerts: Alert[];
    treatments: TreatmentRecord[];
    user_events: UserReportedEvent[];
  }>(`/api/cows/${cowId}`),
  createCow: (data: Partial<Cow>) => request<{ cow_id: string; message: string }>('/api/cows', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateCow: (cowId: string, data: Partial<Cow>) => request<{ message: string }>(`/api/cows/${cowId}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  deleteCow: (cowId: string) => request<{ message: string }>(`/api/cows/${cowId}`, { method: 'DELETE' }),

  // Monitoring
  getMonitoringRecords: (params?: { cow_id?: string; farm_id?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.cow_id) q.set('cow_id', params.cow_id);
    if (params?.farm_id) q.set('farm_id', params.farm_id);
    if (params?.limit) q.set('limit', params.limit.toString());
    return request<MonitoringRecord[]>(`/api/monitoring-records?${q.toString()}`);
  },
  createMonitoringRecord: (data: any) => request<{ record_id: string; message: string }>('/api/monitoring-records', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Environmental
  getEnvironmentalRecords: (farmId?: string) => request<EnvironmentalRecord[]>(
    farmId ? `/api/environmental-records?farm_id=${farmId}` : '/api/environmental-records'
  ),
  createEnvironmentalRecord: (data: any) => request<{ env_id: string; message: string }>('/api/environmental-records', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Operations
  getOperationalRecords: (farmId?: string) => request<OperationalRecord[]>(
    farmId ? `/api/operational-records?farm_id=${farmId}` : '/api/operational-records'
  ),
  createOperationalRecord: (data: any) => request<{ op_id: string; message: string }>('/api/operational-records', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Events
  getUserEvents: (farmId?: string) => request<UserReportedEvent[]>(
    farmId ? `/api/user-reported-events?farm_id=${farmId}` : '/api/user-reported-events'
  ),
  createUserEvent: (data: any) => request<{ event_id: string; message: string }>('/api/user-reported-events', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  reviewUserEvent: (eventId: string, data: { review_status: string; reviewed_by?: string }) => request<{ message: string }>(
    `/api/user-reported-events/${eventId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }
  ),

  // Diagnostics
  getDiagnosticResults: (cowId?: string) => request<DiagnosticResult[]>(
    cowId ? `/api/diagnostic-results?cow_id=${cowId}` : '/api/diagnostic-results'
  ),
  createDiagnosticResult: (data: any) => request<{ diag_id: string; message: string }>('/api/diagnostic-results', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Alerts
  getAlerts: (params?: { farm_id?: string; status?: string; risk_category?: string }) => {
    const q = new URLSearchParams();
    if (params?.farm_id) q.set('farm_id', params.farm_id);
    if (params?.status) q.set('status', params.status);
    if (params?.risk_category) q.set('risk_category', params.risk_category);
    return request<Alert[]>(`/api/alerts?${q.toString()}`);
  },
  updateAlert: (alertId: string, data: { status: string; assigned_to?: string; outcome?: string; actor?: string }) => request<{ message: string }>(
    `/api/alerts/${alertId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }
  ),

  // Follow-ups
  getFollowUps: (alertId?: string) => request<FollowUp[]>(
    alertId ? `/api/follow-ups?alert_id=${alertId}` : '/api/follow-ups'
  ),
  updateFollowUp: (followupId: string, data: Partial<FollowUp> & { actor?: string }) => request<{ message: string }>(
    `/api/follow-ups/${followupId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }
  ),

  // Treatments
  getTreatments: (cowId?: string) => request<TreatmentRecord[]>(
    cowId ? `/api/treatments?cow_id=${cowId}` : '/api/treatments'
  ),
  createTreatment: (data: any) => request<{ trt_id: string; message: string }>('/api/treatments', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Financials
  getFinancialRecords: (farmId?: string) => request<FinancialRecord[]>(
    farmId ? `/api/financial-records?farm_id=${farmId}` : '/api/financial-records'
  ),
  createFinancialRecord: (data: any) => request<{ fin_id: string; message: string }>('/api/financial-records', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // CSV Import
  previewCsv: (csv_text: string) => request<any>('/api/import/preview', {
    method: 'POST',
    body: JSON.stringify({ csv_text })
  }),
  commitCsv: (csv_text: string, actor?: string) => request<any>('/api/import/commit', {
    method: 'POST',
    body: JSON.stringify({ csv_text, actor })
  }),

  // Screening Engine
  runScreening: (thresholds?: any, actor?: string) => request<any>('/api/screening/run', {
    method: 'POST',
    body: JSON.stringify({ thresholds, actor })
  }),

  // Evaluation
  getEvaluation: () => request<any>('/api/model/evaluation'),

  // Reports
  getReports: (farmId?: string, startDate?: string, endDate?: string) => {
    const q = new URLSearchParams();
    if (farmId) q.set('farm_id', farmId);
    if (startDate) q.set('start_date', startDate);
    if (endDate) q.set('end_date', endDate);
    return request<any>(`/api/reports?${q.toString()}`);
  },

  // Demo Controls
  seedDemo: (seed: number = 42) => request<any>('/api/demo/seed', {
    method: 'POST',
    body: JSON.stringify({ seed })
  }),
  resetDemo: () => request<any>('/api/demo/reset', { method: 'POST' }),
  purgeDemoOnly: () => request<any>('/api/demo/purge-demo-only', { method: 'POST' }),

  // Audit Logs
  getAuditLogs: () => request<AuditLog[]>('/api/audit-logs')
};
