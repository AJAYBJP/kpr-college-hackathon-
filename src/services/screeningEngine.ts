import { dbQuery, dbRun, logAudit } from '../db/database.ts';

export interface ScreeningThresholds {
  scc_subclinical_threshold: number; // default 200,000
  scc_urgent_threshold: number; // default 1,000,000
  yield_drop_percent_threshold: number; // default 15%
  yield_drop_urgent_percent: number; // default 30%
  electrical_conductivity_threshold: number; // default 5.8 mS/cm
  body_temp_fever_threshold: number; // default 39.2 C
}

export const DEFAULT_THRESHOLDS: ScreeningThresholds = {
  scc_subclinical_threshold: 200000,
  scc_urgent_threshold: 1000000,
  yield_drop_percent_threshold: 15.0,
  yield_drop_urgent_percent: 30.0,
  electrical_conductivity_threshold: 5.8,
  body_temp_fever_threshold: 39.2
};

export async function runScreeningEngine(
  actor: string = 'Screening Algorithm',
  customThresholds?: Partial<ScreeningThresholds>
): Promise<{
  scanned_cows: number;
  new_alerts_created: number;
  existing_alerts_updated: number;
  categories_count: Record<string, number>;
}> {
  const cfg: ScreeningThresholds = { ...DEFAULT_THRESHOLDS, ...customThresholds };

  // Fetch active cows with their farm details and baseline
  const cows = await dbQuery(`
    SELECT c.cow_id, c.farm_id, c.tag_number, c.breed, c.baseline_milk_yield_litres,
           c.previous_mastitis_history, c.lactation_stage, f.farm_name
    FROM cows c
    JOIN farms f ON c.farm_id = f.farm_id
    WHERE c.active_status = 'Active'
  `);

  let newAlerts = 0;
  let updatedAlerts = 0;
  const categoriesCount: Record<string, number> = {
    'Urgent veterinary review': 0,
    'High screening priority': 0,
    'Monitor and recheck': 0,
    'Insufficient data': 0
  };

  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

  for (const cow of cows) {
    // Get recent 5 monitoring records for this cow
    const recentRecords = await dbQuery(`
      SELECT * FROM monitoring_records
      WHERE cow_id = ?
      ORDER BY observed_at DESC
      LIMIT 5
    `, [cow.cow_id]);

    if (recentRecords.length < 2) {
      // Insufficient data
      categoriesCount['Insufficient data']++;
      await handleAlertUpsert(
        cow.cow_id,
        cow.farm_id,
        'Insufficient data',
        30.0,
        [
          `Fewer than 2 monitoring records found for Cow ${cow.tag_number}`,
          'Historical trend cannot be reliably constructed without sequential yield logs'
        ],
        'Log consecutive daily milking yields (morning and evening) and perform basic strip cup screening',
        'K. Rajendran (Farm Manager)'
      );
      continue;
    }

    const latest = recentRecords[0];
    const prev = recentRecords[1];

    // Compute yield deviation from baseline
    const baseline = cow.baseline_milk_yield_litres || 18.0;
    const currentYield = latest.total_milk_yield_litres;
    let yieldDropPct = 0;
    if (currentYield != null && currentYield > 0) {
      yieldDropPct = ((baseline - currentYield) / baseline) * 100;
    }

    // Check recent farm environmental risk
    const recentEnv = await dbQuery(`
      SELECT * FROM environmental_records
      WHERE farm_id = ?
      ORDER BY recorded_at DESC
      LIMIT 1
    `, [cow.farm_id]);
    const env = recentEnv.length > 0 ? recentEnv[0] : null;

    // Check user-reported events for this cow in past 7 days
    const recentEvents = await dbQuery(`
      SELECT * FROM user_reported_events
      WHERE cow_id = ? AND review_status != 'Dismissed as Normal'
      ORDER BY reported_at DESC
      LIMIT 2
    `, [cow.cow_id]);

    // Rule & Indicator Evaluation
    const reasons: string[] = [];
    const missingEvidence: string[] = [];
    let score = 0;
    let isUrgent = false;

    // 1. Yield Analysis
    if (currentYield == null) {
      missingEvidence.push('Latest milk yield measurement is unrecorded');
    } else if (yieldDropPct >= cfg.yield_drop_urgent_percent) {
      score += 35;
      isUrgent = true;
      reasons.push(`Severe yield reduction of ${yieldDropPct.toFixed(1)}% compared to historical baseline (${currentYield.toFixed(1)}L vs ${baseline.toFixed(1)}L baseline)`);
    } else if (yieldDropPct >= cfg.yield_drop_percent_threshold) {
      score += 25;
      reasons.push(`Yield reduction of ${yieldDropPct.toFixed(1)}% exceeds early warning threshold (${cfg.yield_drop_percent_threshold}%)`);
    }

    // 2. Physical & Milk Appearance Signs
    if (latest.milk_appearance && latest.milk_appearance !== 'Normal') {
      score += 30;
      isUrgent = true;
      reasons.push(`Abnormal milk appearance noted: ${latest.milk_appearance}`);
    }
    if (latest.udder_swelling && latest.udder_swelling !== 'None') {
      score += 25;
      if (latest.udder_swelling.includes('Severe') || latest.udder_swelling.includes('Moderate')) isUrgent = true;
      reasons.push(`Udder inflammation detected: ${latest.udder_swelling}`);
    }
    if (latest.udder_warmth && latest.udder_warmth.includes('Warmth')) {
      score += 15;
      reasons.push(`Udder warmth/pain palpated: ${latest.udder_warmth}`);
    }
    if (latest.body_temperature_celsius && latest.body_temperature_celsius >= cfg.body_temp_fever_threshold) {
      score += 20;
      isUrgent = true;
      reasons.push(`Systemic fever recorded: ${latest.body_temperature_celsius}°C (threshold ≥ ${cfg.body_temp_fever_threshold}°C)`);
    }

    // 3. Somatic Cell Count (SCC)
    if (latest.SCC_cells_per_ml != null) {
      if (latest.SCC_cells_per_ml >= cfg.scc_urgent_threshold) {
        score += 30;
        isUrgent = true;
        reasons.push(`Very high Somatic Cell Count: ${latest.SCC_cells_per_ml.toLocaleString()} cells/mL (acute infection marker)`);
      } else if (latest.SCC_cells_per_ml >= cfg.scc_subclinical_threshold) {
        score += 20;
        reasons.push(`Elevated Somatic Cell Count: ${latest.SCC_cells_per_ml.toLocaleString()} cells/mL (subclinical mastitis threshold: ${cfg.scc_subclinical_threshold.toLocaleString()})`);
      }
    } else {
      missingEvidence.push('Somatic Cell Count (SCC) not tested in recent observation');
    }

    // 4. California Mastitis Test (CMT)
    if (latest.CMT_result) {
      if (latest.CMT_result.includes('Strong Positive') || latest.CMT_result.includes('Distinct Positive')) {
        score += 25;
        reasons.push(`Positive California Mastitis Test (CMT): ${latest.CMT_result}`);
      } else if (latest.CMT_result.includes('Weak Positive')) {
        score += 15;
        reasons.push(`Weak Positive CMT finding: ${latest.CMT_result}`);
      }
    } else {
      missingEvidence.push('Quarter CMT screening pending');
    }

    // 5. Electrical Conductivity
    if (latest.electrical_conductivity != null) {
      if (latest.electrical_conductivity >= cfg.electrical_conductivity_threshold) {
        score += 15;
        reasons.push(`Elevated electrical conductivity: ${latest.electrical_conductivity.toFixed(1)} mS/cm (normal range ≤ 5.5 mS/cm)`);
      }
    }

    // 6. Mastitis History & Environmental Context
    if (cow.previous_mastitis_history === 1) {
      score += 10;
      reasons.push('Cow has documented history of previous mastitis in earlier lactation');
    }
    if (env && (env.heat_stress_observation.includes('Severe') || env.heat_stress_observation.includes('Moderate'))) {
      score += 5;
      reasons.push(`Contextual environmental stress: ${env.heat_stress_observation} (ambient temp ${env.temperature_celsius}°C, RH ${env.relative_humidity_percent}%)`);
    }

    // 7. Recent User-Reported Events
    if (recentEvents.length > 0) {
      score += 15;
      reasons.push(`Active user-reported event: ${recentEvents[0].event_type} (${recentEvents[0].severity})`);
    }

    // Determine category based on transparent criteria
    let category: 'Urgent veterinary review' | 'High screening priority' | 'Monitor and recheck' | 'Insufficient data';
    let action = '';

    if (isUrgent || score >= 85) {
      category = 'Urgent veterinary review';
      action = 'Isolate milk immediately from bulk tank; withhold from sale; arrange clinical veterinary evaluation and supportive care';
    } else if (score >= 65) {
      category = 'High screening priority';
      action = 'Perform 4-quarter California Mastitis Test (CMT); check teat end condition; submit aseptic sample for lab confirmation';
    } else if (score >= 40) {
      category = 'Monitor and recheck';
      action = 'Monitor morning and evening yield closely; verify pre-milking teat hygiene dip; recheck strip cup in 24 hours';
    } else {
      // Normal healthy cow - no new alert needed unless there is already an open alert to resolve
      continue;
    }

    categoriesCount[category]++;

    // Add note on missing evidence to explainability
    if (missingEvidence.length > 0) {
      reasons.push(`Missing telemetry: ${missingEvidence.join('; ')}`);
    }

    const assigned = category === 'Urgent veterinary review' ? 'Dr. S. Ramesh (Field Vet)' : 'K. Rajendran (Farm Manager)';

    const res = await handleAlertUpsert(
      cow.cow_id,
      cow.farm_id,
      category,
      Math.min(99.0, Math.round(score * 10) / 10),
      reasons,
      action,
      assigned
    );

    if (res.isNew) newAlerts++;
    else updatedAlerts++;
  }

  await logAudit(
    actor,
    'RUN_SCREENING_ENGINE',
    'system',
    'alerts',
    `Scanned ${cows.length} cows. Created ${newAlerts} new alerts, updated ${updatedAlerts}. Categories: ${JSON.stringify(categoriesCount)}`
  );

  return {
    scanned_cows: cows.length,
    new_alerts_created: newAlerts,
    existing_alerts_updated: updatedAlerts,
    categories_count: categoriesCount
  };
}

async function handleAlertUpsert(
  cow_id: string,
  farm_id: string,
  category: string,
  score: number,
  reasons: string[],
  action: string,
  assigned: string
): Promise<{ isNew: boolean }> {
  // Check if open alert already exists
  const existing = await dbQuery(`
    SELECT alert_id, status FROM alerts
    WHERE cow_id = ? AND status NOT IN ('Resolved', 'Closed')
    LIMIT 1
  `, [cow_id]);

  const reasonsJson = JSON.stringify(reasons);
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  if (existing.length > 0) {
    const alertId = existing[0].alert_id;
    await dbRun(`
      UPDATE alerts
      SET risk_category = ?, score_or_indicator = ?, reasons_json = ?, recommended_action = ?
      WHERE alert_id = ?
    `, [category, score, reasonsJson, action, alertId]);
    return { isNew: false };
  } else {
    const alertId = 'alt_' + Math.random().toString(36).substring(2, 9);
    await dbRun(`
      INSERT INTO alerts (
        alert_id, cow_id, farm_id, created_at, risk_category, score_or_indicator,
        reasons_json, recommended_action, assigned_to, status, outcome, model_version, is_demo
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'New', NULL, 'UdderWatch-RulesEngine-v1.2', 1)
    `, [alertId, cow_id, farm_id, now, category, score, reasonsJson, action, assigned]);

    // Create corresponding pending follow-up record
    const followupId = 'flw_' + Math.random().toString(36).substring(2, 9);
    const dueDate = new Date(Date.now() + 24 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 19);
    await dbRun(`
      INSERT INTO follow_ups (
        followup_id, alert_id, cow_id, created_at, due_at, completed_at, screening_action,
        veterinarian_referral, delay_reason, coordination_gap, outcome_notes, is_demo
      )
      VALUES (?, ?, ?, ?, ?, NULL, ?, ?, NULL, NULL, NULL, 1)
    `, [followupId, alertId, cow_id, now, dueDate, action, category === 'Urgent veterinary review' ? 1 : 0]);

    return { isNew: true };
  }
}
