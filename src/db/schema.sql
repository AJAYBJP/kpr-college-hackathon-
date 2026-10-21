-- UdderWatch AI SQLite Schema
-- Database: udderwatch.db

PRAGMA foreign_keys = ON;

-- 1. Farms
CREATE TABLE IF NOT EXISTS farms (
  farm_id TEXT PRIMARY KEY,
  farm_name TEXT NOT NULL,
  village TEXT NOT NULL,
  district TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'Tamil Nadu',
  latitude REAL,
  longitude REAL,
  farm_type TEXT NOT NULL CHECK(farm_type IN ('Smallholder Peri-Urban', 'Commercial Dairy', 'Cooperative Member', 'Mixed Crop-Livestock')),
  herd_size INTEGER NOT NULL CHECK(herd_size > 0),
  housing_type TEXT NOT NULL CHECK(housing_type IN ('Loose Housing with Shed', 'Tied Stall (Stanchion)', 'Free Stall Cubicles', 'Open Paddock with Tree Cover')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  is_demo INTEGER NOT NULL DEFAULT 1
);

-- 2. Cows
CREATE TABLE IF NOT EXISTS cows (
  cow_id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL REFERENCES farms(farm_id) ON DELETE CASCADE,
  tag_number TEXT NOT NULL,
  breed TEXT NOT NULL,
  date_of_birth TEXT NOT NULL,
  parity INTEGER NOT NULL CHECK(parity >= 0),
  lactation_stage TEXT NOT NULL CHECK(lactation_stage IN ('Early (0-60d)', 'Mid (61-180d)', 'Late (181-305d)', 'Dry Period (>305d)')),
  calving_date TEXT NOT NULL,
  previous_mastitis_history INTEGER NOT NULL DEFAULT 0 CHECK(previous_mastitis_history IN (0, 1)),
  baseline_milk_yield_litres REAL NOT NULL CHECK(baseline_milk_yield_litres > 0),
  active_status TEXT NOT NULL DEFAULT 'Active' CHECK(active_status IN ('Active', 'Quarantined', 'Dry Off', 'Culled', 'Sold')),
  is_demo INTEGER NOT NULL DEFAULT 1,
  UNIQUE(farm_id, tag_number)
);

-- 3. Monitoring Records
CREATE TABLE IF NOT EXISTS monitoring_records (
  record_id TEXT PRIMARY KEY,
  cow_id TEXT NOT NULL REFERENCES cows(cow_id) ON DELETE CASCADE,
  observed_at TEXT NOT NULL,
  morning_milk_yield_litres REAL,
  evening_milk_yield_litres REAL,
  total_milk_yield_litres REAL,
  SCC_cells_per_ml INTEGER,
  CMT_result TEXT CHECK(CMT_result IS NULL OR CMT_result IN ('Negative (0)', 'Trace (T)', 'Weak Positive (1)', 'Distinct Positive (2)', 'Strong Positive (3)')),
  electrical_conductivity REAL,
  milk_appearance TEXT CHECK(milk_appearance IS NULL OR milk_appearance IN ('Normal', 'Watery', 'Flakes/Clots Present', 'Blood Tinged', 'Discolored/Yellowish')),
  udder_swelling TEXT CHECK(udder_swelling IS NULL OR udder_swelling IN ('None', 'Mild Quarter Swelling', 'Moderate Swelling', 'Severe Hardness')),
  udder_warmth TEXT CHECK(udder_warmth IS NULL OR udder_warmth IN ('Normal', 'Slight Heat', 'Marked Warmth/Pain')),
  teat_condition TEXT CHECK(teat_condition IS NULL OR teat_condition IN ('Normal/Intact', 'Hyperkeratosis (Rough Ring)', 'Lesions/Cracks', 'Congested/Edematous')),
  body_temperature_celsius REAL,
  appetite_status TEXT CHECK(appetite_status IS NULL OR appetite_status IN ('Normal', 'Reduced Feed Intake', 'Inappetence/Off-Feed')),
  rumination_status TEXT CHECK(rumination_status IS NULL OR rumination_status IN ('Normal (400-500 min/day)', 'Slightly Reduced', 'Significantly Reduced')),
  body_condition_score REAL,
  water_intake_status TEXT CHECK(water_intake_status IS NULL OR water_intake_status IN ('Normal', 'Decreased', 'Excessive/Polydipsia')),
  notes TEXT,
  data_source TEXT NOT NULL DEFAULT 'Manual Milker Entry',
  is_demo INTEGER NOT NULL DEFAULT 1
);

-- 4. Environmental Records
CREATE TABLE IF NOT EXISTS environmental_records (
  environment_id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL REFERENCES farms(farm_id) ON DELETE CASCADE,
  recorded_at TEXT NOT NULL,
  temperature_celsius REAL NOT NULL,
  relative_humidity_percent REAL NOT NULL,
  rainfall_mm REAL NOT NULL DEFAULT 0.0,
  heat_stress_observation TEXT NOT NULL CHECK(heat_stress_observation IN ('Normal (THI < 72)', 'Mild Stress (THI 72-78)', 'Moderate Stress (THI 79-88)', 'Severe Stress (THI > 88)')),
  bedding_condition TEXT NOT NULL CHECK(bedding_condition IN ('Clean & Dry Paddy Straw', 'Damp/Moist Bedding', 'Soiled/Wet Manure-Mixed', 'Bare Concrete Floor')),
  ventilation_status TEXT NOT NULL CHECK(ventilation_status IN ('Good Cross-Ventilation', 'Adequate Fan Circulation', 'Stagnant Air/Poor Flow')),
  water_availability TEXT NOT NULL CHECK(water_availability IN ('Continuous Clean Fresh Water', 'Restricted Supply/Trough Dirty', 'Intermittent Supply')),
  source_type TEXT NOT NULL DEFAULT 'On-Farm IoT Station',
  is_demo INTEGER NOT NULL DEFAULT 1
);

-- 5. Operational Records
CREATE TABLE IF NOT EXISTS operational_records (
  operation_id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL REFERENCES farms(farm_id) ON DELETE CASCADE,
  cow_id TEXT REFERENCES cows(cow_id) ON DELETE SET NULL,
  recorded_at TEXT NOT NULL,
  milking_shift TEXT NOT NULL CHECK(milking_shift IN ('Morning (05:00)', 'Evening (17:00)')),
  milking_hygiene_status TEXT NOT NULL CHECK(milking_hygiene_status IN ('Excellent Protocol', 'Satisfactory', 'Deficient Pre-Dip', 'Poor Milker Hand Hygiene')),
  teat_cleaning_status TEXT NOT NULL CHECK(teat_cleaning_status IN ('Individual Clean Cloth Dry Wipe', 'Water Wash & Complete Dry', 'Wet Wash Without Complete Drying', 'No Pre-Wipe')),
  post_milking_disinfection_status TEXT NOT NULL CHECK(post_milking_disinfection_status IN ('Immediate Barrier Dip (0.5% Iodine)', 'Standard Dip (Chlorhexidine)', 'Spray Applied Unevenly', 'Omitted/No Dip')),
  equipment_cleaning_status TEXT NOT NULL CHECK(equipment_cleaning_status IN ('Full CIP Hot Alkaline Wash', 'Cold Water Flush Only', 'Scale Build-Up Detected', 'Manual Bucket Wash')),
  bedding_cleaning_status TEXT NOT NULL CHECK(bedding_cleaning_status IN ('Daily Removal & Fresh Bedding', 'Partial Scraping', 'Overdue Bedding Change')),
  recent_cow_movement TEXT,
  dry_period_management TEXT,
  feed_change TEXT,
  water_supply_issue TEXT,
  staff_or_equipment_issue TEXT,
  notes TEXT,
  is_demo INTEGER NOT NULL DEFAULT 1
);

-- 6. User Reported Events
CREATE TABLE IF NOT EXISTS user_reported_events (
  event_id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL REFERENCES farms(farm_id) ON DELETE CASCADE,
  cow_id TEXT REFERENCES cows(cow_id) ON DELETE SET NULL,
  reported_at TEXT NOT NULL,
  reporter_role TEXT NOT NULL CHECK(reporter_role IN ('Farmer', 'Milker/Herdsman', 'Farm Manager', 'Field Para-Vet', 'Veterinarian')),
  event_type TEXT NOT NULL CHECK(event_type IN ('Drop in Milk Yield', 'Abnormal Milk (Clots/Watery)', 'Udder Swelling or Heat', 'Kicking Milking Machine/Pain', 'Off-Feed/Lethargy', 'Hygiene Protocol Breach', 'Screening Delayed')),
  severity TEXT NOT NULL CHECK(severity IN ('Low Concern', 'Moderate Attention', 'High Urgent Priority')),
  description TEXT NOT NULL,
  onset_time TEXT,
  evidence_reference TEXT,
  review_status TEXT NOT NULL DEFAULT 'Pending Review' CHECK(review_status IN ('Pending Review', 'Reviewed & Actioned', 'Dismissed as Normal')),
  reviewed_by TEXT,
  is_demo INTEGER NOT NULL DEFAULT 1
);

-- 7. Diagnostic Results (Separated from risk screening predictions)
CREATE TABLE IF NOT EXISTS diagnostic_results (
  diagnostic_id TEXT PRIMARY KEY,
  cow_id TEXT NOT NULL REFERENCES cows(cow_id) ON DELETE CASCADE,
  sample_date TEXT NOT NULL,
  test_type TEXT NOT NULL CHECK(test_type IN ('Bacterial Culture & Isolation', 'Multiplex Real-Time PCR', 'Microscopic Somatic Cell Count (DMSCC)', 'Quarter California Mastitis Test (Lab Confirmed)', 'Antimicrobial Sensitivity Testing (AST)')),
  test_result TEXT NOT NULL CHECK(test_result IN ('Positive', 'Negative', 'Inconclusive/Contaminated')),
  reference_range_or_criteria TEXT NOT NULL,
  veterinarian_diagnosis TEXT NOT NULL CHECK(veterinarian_diagnosis IN ('Subclinical Mastitis Confirmed', 'Clinical Mastitis Confirmed', 'Healthy Udder - No Mastitis', 'Non-Specific Inflammation', 'Pending Further Workup')),
  laboratory_confirmation TEXT NOT NULL CHECK(laboratory_confirmation IN ('State Veterinary Diagnostic Lab (Chennai)', 'TANUVAS Referral Laboratory', 'District Polyclinic Lab (Coimbatore)', 'On-Farm Verified Rapid PCR', 'External Independent Lab')),
  pathogen_identification TEXT,
  verified_by TEXT NOT NULL,
  verification_date TEXT NOT NULL,
  is_demo INTEGER NOT NULL DEFAULT 1
);

-- 8. Alerts
CREATE TABLE IF NOT EXISTS alerts (
  alert_id TEXT PRIMARY KEY,
  cow_id TEXT NOT NULL REFERENCES cows(cow_id) ON DELETE CASCADE,
  farm_id TEXT NOT NULL REFERENCES farms(farm_id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  risk_category TEXT NOT NULL CHECK(risk_category IN ('Urgent veterinary review', 'High screening priority', 'Monitor and recheck', 'Insufficient data')),
  score_or_indicator REAL NOT NULL,
  reasons_json TEXT NOT NULL,
  recommended_action TEXT NOT NULL,
  assigned_to TEXT,
  status TEXT NOT NULL DEFAULT 'New' CHECK(status IN ('New', 'Acknowledged', 'Screening Scheduled', 'Veterinarian Referred', 'Monitoring', 'Resolved', 'Closed')),
  acknowledged_at TEXT,
  closed_at TEXT,
  outcome TEXT,
  model_version TEXT NOT NULL DEFAULT 'UdderWatch-RulesEngine-v1.2',
  is_demo INTEGER NOT NULL DEFAULT 1
);

-- 9. Follow Ups
CREATE TABLE IF NOT EXISTS follow_ups (
  followup_id TEXT PRIMARY KEY,
  alert_id TEXT NOT NULL REFERENCES alerts(alert_id) ON DELETE CASCADE,
  cow_id TEXT NOT NULL REFERENCES cows(cow_id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  due_at TEXT NOT NULL,
  completed_at TEXT,
  screening_action TEXT NOT NULL,
  followup_result TEXT,
  veterinarian_referral INTEGER NOT NULL DEFAULT 0 CHECK(veterinarian_referral IN (0, 1)),
  delay_reason TEXT,
  coordination_gap TEXT,
  outcome_notes TEXT,
  is_demo INTEGER NOT NULL DEFAULT 1
);

-- 10. Treatment Records (Veterinary-supervised, with withdrawal periods)
CREATE TABLE IF NOT EXISTS treatment_records (
  treatment_id TEXT PRIMARY KEY,
  cow_id TEXT NOT NULL REFERENCES cows(cow_id) ON DELETE CASCADE,
  diagnostic_id TEXT REFERENCES diagnostic_results(diagnostic_id) ON DELETE SET NULL,
  prescribed_by TEXT NOT NULL,
  treatment_name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  milk_withdrawal_start TEXT NOT NULL,
  milk_withdrawal_end TEXT NOT NULL,
  treatment_cost REAL NOT NULL CHECK(treatment_cost >= 0),
  outcome TEXT NOT NULL CHECK(outcome IN ('Clinical Cure Documented', 'Bacteriological Cure Verified', 'Partial Improvement', 'Chronic Unresponsive', 'Ongoing Course')),
  recurrence_observed INTEGER NOT NULL DEFAULT 0 CHECK(recurrence_observed IN (0, 1)),
  is_demo INTEGER NOT NULL DEFAULT 1
);

-- 11. Financial Records
CREATE TABLE IF NOT EXISTS financial_records (
  financial_id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL REFERENCES farms(farm_id) ON DELETE CASCADE,
  cow_id TEXT REFERENCES cows(cow_id) ON DELETE SET NULL,
  record_date TEXT NOT NULL,
  milk_price_per_litre REAL NOT NULL CHECK(milk_price_per_litre > 0),
  expected_yield_litres REAL NOT NULL CHECK(expected_yield_litres >= 0),
  actual_yield_litres REAL NOT NULL CHECK(actual_yield_litres >= 0),
  discarded_milk_litres REAL NOT NULL DEFAULT 0.0 CHECK(discarded_milk_litres >= 0),
  screening_cost REAL NOT NULL DEFAULT 0.0 CHECK(screening_cost >= 0),
  veterinary_cost REAL NOT NULL DEFAULT 0.0 CHECK(veterinary_cost >= 0),
  other_recorded_costs REAL NOT NULL DEFAULT 0.0 CHECK(other_recorded_costs >= 0),
  is_demo INTEGER NOT NULL DEFAULT 1
);

-- 12. Model Runs
CREATE TABLE IF NOT EXISTS model_runs (
  run_id TEXT PRIMARY KEY,
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,
  training_timestamp TEXT NOT NULL,
  dataset_version TEXT NOT NULL,
  number_of_training_records INTEGER NOT NULL,
  number_of_verified_labels INTEGER NOT NULL,
  evaluation_method TEXT NOT NULL,
  metrics_json TEXT NOT NULL,
  limitations TEXT NOT NULL,
  is_demo INTEGER NOT NULL DEFAULT 1
);

-- 13. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  audit_id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details TEXT
);

-- Indexes for high-performance querying
CREATE INDEX IF NOT EXISTS idx_cows_farm_id ON cows(farm_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_cow_date ON monitoring_records(cow_id, observed_at);
CREATE INDEX IF NOT EXISTS idx_environmental_farm_date ON environmental_records(farm_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_operational_farm_date ON operational_records(farm_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_events_farm_cow ON user_reported_events(farm_id, cow_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_cow_date ON diagnostic_results(cow_id, sample_date);
CREATE INDEX IF NOT EXISTS idx_alerts_cow_status ON alerts(cow_id, status);
CREATE INDEX IF NOT EXISTS idx_alerts_farm_created ON alerts(farm_id, created_at);
CREATE INDEX IF NOT EXISTS idx_followups_alert_id ON follow_ups(alert_id);
CREATE INDEX IF NOT EXISTS idx_financial_farm_date ON financial_records(farm_id, record_date);
