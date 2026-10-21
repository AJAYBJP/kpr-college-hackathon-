# UdderWatch AI — Early Warning for Healthier Herds

**UdderWatch AI** is a data-driven clinical decision-support and early-screening system designed to combat silent subclinical mastitis outbreaks in peri-urban dairy herds (demonstrated with herds across Tamil Nadu, India).

The system integrates longitudinal cow milk yield deviations, somatic cell counts (SCC), California Mastitis Test (CMT) findings, in-line electrical conductivity, ambient Temperature-Humidity Index (THI) heat stress, and operational milking hygiene logs into an explainable screening priority pipeline.

> **Clinical Disclaimer:** UdderWatch AI is a screening and triage decision-support tool. It does **not** claim to definitively diagnose mastitis or automatically prescribe antimicrobial medicines. All medical interventions and drug withdrawal decisions remain under certified veterinary supervision.

---

## 1. System Architecture & Technical Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS, Recharts, Lucide Icons.
- **Backend:** Node.js Express server running REST endpoints (`/api/*`).
- **Database:** SQLite file-backed storage (`udderwatch.db`) initialized with full referential integrity (`PRAGMA foreign_keys = ON;`) and verified via `sql.js` WebAssembly engine.
- **Independent Verification:** Python 3.10 CLI verification tool (`scripts/verify_sqlite.py`) using Python's standard library `sqlite3` to independently audit schemas, foreign keys, and record counts.
- **Testing:** Comprehensive automated test suite (`tests/app.test.ts`) covering all 13 database tables, referential foreign keys, screening logic, ML evaluation metrics, and CSV validation rules.

---

## 2. SQLite Database Schema (13 Relational Tables)

All tables are created in `udderwatch.db` with constraints, primary keys, foreign keys, and indexes:

1. `farms` — Dairy location, GPS coordinates, housing type (stanchion, loose, cubicles), herd size.
2. `cows` — Unique tag within farm, breed (HF Cross, Jersey Cross, Murrah Buffalo), parity, lactation stage, personal baseline yield (L/day), previous mastitis history.
3. `monitoring_records` — Daily morning & evening yield, somatic cell count (SCC), CMT score, electrical conductivity, milk appearance, udder swelling/warmth, teat condition, body temperature.
4. `environmental_records` — Temperature (°C), relative humidity (%), rainfall (mm), THI heat stress index, bedding moisture, ventilation.
5. `operational_records` — Milking shift protocol, pre-dip dry wipe, post-dip barrier disinfection (0.5% iodine), CIP pipeline hot wash, bedding cleaning.
6. `user_reported_events` — Farmer/milker qualitative reports: sudden yield drop, abnormal clots, kicking unit, off-feed.
7. `diagnostic_results` — Verified reference laboratory bacteriological culture & PCR (separated from screening predictions to avoid data leakage).
8. `alerts` — Early screening flags, priority categories, transparent reason arrays, recommended clinical actions, status.
9. `follow_ups` — On-farm screening tasks, due dates, completion timestamps, delay tracking, coordination gap detection.
10. `treatment_records` — Veterinarian prescriptions with mandatory milk withdrawal start/clearance dates (MRL food safety) and costs.
11. `financial_records` — Economic ledger tracking yield gap, discarded milk, screening costs, veterinary fees.
12. `model_runs` — Audit log of model versions, training dataset splits, and validation metrics.
13. `audit_logs` — Immutable event log of system actions and clinical entries.

---

## 3. Installation & Getting Started

### Prerequisites
- Node.js (v18+)
- Python 3 (3.8+)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start Full-Stack Application
```bash
npm run dev
```
The server will start at `http://localhost:3000`. On first boot, `udderwatch.db` is automatically created and populated with the canonical demonstration dataset.

### Step 3: Run Automated Test Suite
```bash
npx tsx tests/app.test.ts
```
Expected output:
```
RESULTS: 27 PASSED, 0 FAILED
```

### Step 4: Run Independent Python SQLite Inspector
```bash
python3 scripts/verify_sqlite.py
```
Output:
```
============================================================
 UdderWatch AI — SQLite Database Independent Verification
 File: /app/applet/udderwatch.db (938.00 KB)
 Python SQLite version: 3.37.2
============================================================
PRAGMA foreign_keys: ENABLED
PRAGMA integrity_check: ok
------------------------------------------------------------
 [PASS] Table 'farms': 12 columns, 3 records
 [PASS] Table 'cows': 12 columns, 60 records
 [PASS] Table 'monitoring_records': 21 columns, 1800 records
 [PASS] Table 'environmental_records': 12 columns, 90 records
 [PASS] Table 'operational_records': 17 columns, 90 records
 [PASS] Table 'user_reported_events': 13 columns, 7 records
 [PASS] Table 'diagnostic_results': 12 columns, 10 records
 [PASS] Table 'alerts': 15 columns, 8 records
 [PASS] Table 'follow_ups': 13 columns, 5 records
 [PASS] Table 'treatment_records': 13 columns, 3 records
 [PASS] Table 'financial_records': 12 columns, 5 records
 [PASS] Table 'model_runs': 11 columns, 1 records
 [PASS] Table 'audit_logs': 7 columns, 1 records
============================================================
ALL 13 TABLES VERIFIED IN SQLITE WITH REFERENTIAL INTEGRITY!
============================================================
```

---

## 4. Resetting & Purging Demo Data

- **Reset to Canonical Seed 42:**
  ```bash
  curl -X POST http://localhost:3000/api/demo/reset
  ```
  *(Or click "Reset to Seed 42" in the UI Runtime Modal)*

- **Purge Synthetic Data Only (Preserving Real Farm Records):**
  ```bash
  curl -X POST http://localhost:3000/api/demo/purge-demo-only
  ```

---

## 5. CSV Data Import & Testing

Sample CSV templates are included in `/data`:
1. `data/sample_valid_monitoring.csv` — Valid records to verify clean imports.
2. `data/sample_invalid_with_errors.csv` — Edge-case records with boundary violations, invalid dates, and non-existent cow IDs to verify validation error reporting and downloadable error CSV generation.
