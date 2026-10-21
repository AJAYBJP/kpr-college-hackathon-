# UdderWatch AI — Hackathon Presentation & Live Demo Script

**Pitch Title:** UdderWatch AI — Early Warning for Healthier Herds  
**Duration:** 4–5 Minutes  
**Target Audience:** Hackathon Judges, Dairy Veterinarians, Agricultural Data Engineers

---

## Act 1: The Problem (45 Seconds)
- "Good morning, judges. In peri-urban dairy belts like Tamil Nadu, smallholder farmers lose up to 30% of their milk revenue from **silent mastitis**."
- "By the time milk visibly curdles in the bucket or a cow's quarter turns hard, the cow has already lost days of peak lactation yield, and bacteria have established deep biofilms."
- "Current screening is manual, intermittent, and uncoordinated. UdderWatch AI transforms routine milking telemetry into an early screening priority queue before clinical deterioration strikes."

---

## Act 2: Live Architecture & Database Integrity (60 Seconds)
- **Click the "udderwatch.db (SQLite)" badge in the top header:**
  - Show the **Runtime Modal**: Show the real SQLite file size, 13 relational tables, referential integrity (`PRAGMA foreign_keys = ON`), and deterministic seed 42.
  - Mention: *"We didn't mock this in local storage. This is a real SQLite database on disk with parameterized SQL transactions."*
  - Point to the command: `python3 scripts/verify_sqlite.py`, which judges can run in their own terminal to independently verify table schemas and row counts.

---

## Act 3: Overview Dashboard & Explainable Screening (90 Seconds)
- **Show the Overview Dashboard:**
  - 3 peri-urban farms (Chengalpattu, Trichy, Coimbatore) with 60 crossbred cows.
  - Point out the 14-day production trend curve.
  - Emphasize the **Telemetry Completeness** panel: *"We never fill missing somatic cell counts with fake zeros or pretend missing data is a healthy diagnosis. Missingness is tracked explicitly."*
- **Navigate to "Risk Screening Engine":**
  - Show the configurable veterinary thresholds (SCC subclinical cutoff: 200,000 cells/mL; personal yield drop: 15%; electrical conductivity: 5.8 mS/cm).
  - Click **"Run Screening Analysis Across Herd"**:
  - Show how Cow TN-CHE-03 is flagged for **High Screening Priority** despite having visually *Normal* milk appearance because her yield dropped 24% and SCC reached 580,000 cells/mL.
  - Point to the banner: `SCREENING PRIORITY — NOT A DIAGNOSIS`.

---

## Act 4: Operational Coordination & Antimicrobial Stewardship (60 Seconds)
- **Navigate to "Alerts & Follow-ups":**
  - Highlight the **Active Coordination Gaps** detector:
    1. High-priority alert unacknowledged for > 24 hours.
    2. Overdue screening follow-up.
    3. Missing diagnostic culture for a vet-referred cow.
  - Click **"Acknowledge Alert"** or **"Assign Responsibility"** to Dr. Ramesh.
  - Show that closing an alert requires a documented clinical outcome.
- **Navigate to "Diagnostics & Treatments":**
  - Point out that **reference microbiology results** (Culture & PCR) are strictly separated from screening predictions to avoid data leakage.
  - Show veterinary treatment records with **mandatory milk withdrawal periods** (e.g., 96 hours post-infusion) to prevent drug residues in the human food supply.

---

## Act 5: Milk Loss & Performance Evaluation (45 Seconds)
- **Navigate to "Milk-Loss & Revenue":**
  - Show the interactive milk price slider (₹42/L).
  - Disclose the formula: yield depression gap + discarded withdrawal milk + screening & veterinary costs.
- **Navigate to "Model & Performance":**
  - Show the holdout evaluation metrics: Sensitivity (85.7%), Specificity (66.7%), Precision (85.7%), F1 (0.857), and the 2x2 empirical confusion matrix.
  - Emphasize the transparency note: *"We explicitly state that these metrics are computed from verified reference samples and not claimed as real-world clinical field trials."*

---

## Act 6: Wrap-up & Q&A
- "UdderWatch AI is built, tested (27 automated tests passing), and ready to empower dairy farmers with early detection, coordinated care, and financial resilience. Thank you!"
