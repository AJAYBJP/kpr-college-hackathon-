export type UserRole = 'Farmer' | 'Farm Manager' | 'Veterinarian' | 'Administrator';

export type RiskCategory =
  | 'Urgent veterinary review'
  | 'High screening priority'
  | 'Monitor and recheck'
  | 'Insufficient data';

export type AlertStatus =
  | 'New'
  | 'Acknowledged'
  | 'Screening Scheduled'
  | 'Veterinarian Referred'
  | 'Monitoring'
  | 'Resolved'
  | 'Closed';

export interface Farm {
  farm_id: string;
  farm_name: string;
  village: string;
  district: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  farm_type: string;
  herd_size: number;
  housing_type: string;
  created_at: string;
  active_cows_count?: number;
  open_alerts_count?: number;
  is_demo?: number;
}

export interface Cow {
  cow_id: string;
  farm_id: string;
  tag_number: string;
  breed: string;
  date_of_birth: string;
  parity: number;
  lactation_stage: string;
  calving_date: string;
  previous_mastitis_history: number;
  baseline_milk_yield_litres: number;
  active_status: string;
  farm_name?: string;
  district?: string;
  active_alert_priority?: RiskCategory | null;
  latest_yield?: number | null;
  latest_scc?: number | null;
  is_demo?: number;
}

export interface MonitoringRecord {
  record_id: string;
  cow_id: string;
  observed_at: string;
  morning_milk_yield_litres: number | null;
  evening_milk_yield_litres: number | null;
  total_milk_yield_litres: number | null;
  SCC_cells_per_ml: number | null;
  CMT_result: string | null;
  electrical_conductivity: number | null;
  milk_appearance: string | null;
  udder_swelling: string | null;
  udder_warmth: string | null;
  teat_condition: string | null;
  body_temperature_celsius: number | null;
  appetite_status: string | null;
  rumination_status: string | null;
  body_condition_score: number | null;
  water_intake_status: string | null;
  notes: string | null;
  data_source: string;
  tag_number?: string;
  breed?: string;
  farm_name?: string;
  is_demo?: number;
}

export interface EnvironmentalRecord {
  environment_id: string;
  farm_id: string;
  recorded_at: string;
  temperature_celsius: number;
  relative_humidity_percent: number;
  rainfall_mm: number;
  heat_stress_observation: string;
  bedding_condition: string;
  ventilation_status: string;
  water_availability: string;
  source_type: string;
  farm_name?: string;
  district?: string;
  is_demo?: number;
}

export interface OperationalRecord {
  operation_id: string;
  farm_id: string;
  cow_id: string | null;
  recorded_at: string;
  milking_shift: string;
  milking_hygiene_status: string;
  teat_cleaning_status: string;
  post_milking_disinfection_status: string;
  equipment_cleaning_status: string;
  bedding_cleaning_status: string;
  notes: string | null;
  farm_name?: string;
  tag_number?: string;
  is_demo?: number;
}

export interface UserReportedEvent {
  event_id: string;
  farm_id: string;
  cow_id: string | null;
  reported_at: string;
  reporter_role: string;
  event_type: string;
  severity: string;
  description: string;
  onset_time: string | null;
  evidence_reference: string | null;
  review_status: string;
  reviewed_by: string | null;
  farm_name?: string;
  tag_number?: string;
  is_demo?: number;
}

export interface DiagnosticResult {
  diagnostic_id: string;
  cow_id: string;
  sample_date: string;
  test_type: string;
  test_result: string;
  reference_range_or_criteria: string;
  veterinarian_diagnosis: string;
  laboratory_confirmation: string;
  pathogen_identification: string | null;
  verified_by: string;
  verification_date: string;
  tag_number?: string;
  breed?: string;
  farm_name?: string;
  is_demo?: number;
}

export interface Alert {
  alert_id: string;
  cow_id: string;
  farm_id: string;
  created_at: string;
  risk_category: RiskCategory;
  score_or_indicator: number;
  reasons_json: string;
  recommended_action: string;
  assigned_to: string | null;
  status: AlertStatus;
  acknowledged_at: string | null;
  closed_at: string | null;
  outcome: string | null;
  model_version: string;
  tag_number?: string;
  breed?: string;
  baseline_milk_yield_litres?: number;
  farm_name?: string;
  district?: string;
  is_demo?: number;
}

export interface FollowUp {
  followup_id: string;
  alert_id: string;
  cow_id: string;
  created_at: string;
  due_at: string;
  completed_at: string | null;
  screening_action: string;
  followup_result: string | null;
  veterinarian_referral: number;
  delay_reason: string | null;
  coordination_gap: string | null;
  outcome_notes: string | null;
  risk_category?: string;
  alert_status?: string;
  tag_number?: string;
  farm_name?: string;
  is_demo?: number;
}

export interface TreatmentRecord {
  treatment_id: string;
  cow_id: string;
  diagnostic_id: string | null;
  prescribed_by: string;
  treatment_name: string;
  start_date: string;
  end_date: string;
  milk_withdrawal_start: string;
  milk_withdrawal_end: string;
  treatment_cost: number;
  outcome: string;
  recurrence_observed: number;
  tag_number?: string;
  breed?: string;
  farm_name?: string;
  is_demo?: number;
}

export interface FinancialRecord {
  financial_id: string;
  farm_id: string;
  cow_id: string | null;
  record_date: string;
  milk_price_per_litre: number;
  expected_yield_litres: number;
  actual_yield_litres: number;
  discarded_milk_litres: number;
  screening_cost: number;
  veterinary_cost: number;
  other_recorded_costs: number;
  farm_name?: string;
  tag_number?: string;
  is_demo?: number;
}

export interface AuditLog {
  audit_id: string;
  timestamp: string;
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
}
