import express from 'express';
import path from 'path';
import { createServer as createNetServer } from 'node:net';
import { createServer as createViteServer } from 'vite';
import { getDatabase, dbQuery, dbQueryOne, dbRun, logAudit } from './src/db/database.ts';
import { seedDemoData, purgeDemoDataOnly } from './src/db/seed.ts';
import { runScreeningEngine } from './src/services/screeningEngine.ts';
import { computeEvaluationMetrics } from './src/services/mlEvaluation.ts';
import { validateCsvData, commitImportedRows } from './src/services/validator.ts';

const app = express();

async function findAvailablePort(startPort: number): Promise<number> {
  for (let port = startPort; port < 65536; port += 1) {
    const available = await new Promise<boolean>((resolve, reject) => {
      const server = createNetServer();
      server.once('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') resolve(false);
        else reject(error);
      });
      server.listen(port, '0.0.0.0', () => {
        server.close(error => error ? reject(error) : resolve(true));
      });
    });

    if (available) return port;
  }

  throw new Error(`No available port found starting at ${startPort}`);
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- API Endpoints ---

// 1. Health & System Status
app.get('/api/health', async (req, res) => {
  try {
    const db = await getDatabase();
    const tables = await dbQuery<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    res.json({
      status: 'healthy',
      system: 'UdderWatch AI Engine',
      sqlite_database: 'udderwatch.db',
      persisted: true,
      tables_count: tables.length,
      environment: {
        node_runtime: process.version,
        framework: 'Express + React 19 + TypeScript',
        sqlite_driver: 'sql.js WebAssembly SQLite (Binary File Persisted)',
        python_tool: 'python3 /scripts/verify_sqlite.py'
      },
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 2. Dashboard Aggregations (Live from SQLite)
app.get('/api/dashboard', async (req, res) => {
  try {
    const farmFilter = req.query.farm_id as string | undefined;

    // Active farms & cows
    const farmWhere = farmFilter ? `WHERE farm_id = '${farmFilter}'` : '';
    const cowWhere = farmFilter ? `WHERE farm_id = '${farmFilter}' AND active_status = 'Active'` : `WHERE active_status = 'Active'`;

    const totalFarms = await dbQueryOne<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM farms ${farmWhere}`);
    const totalCows = await dbQueryOne<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM cows ${cowWhere}`);
    
    // Monitoring records received
    const cowIdsInFarm = farmFilter 
      ? `WHERE cow_id IN (SELECT cow_id FROM cows WHERE farm_id = '${farmFilter}')` 
      : '';
    const totalMonRecords = await dbQueryOne<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM monitoring_records ${cowIdsInFarm}`);

    // Alerts breakdown
    const alertWhere = farmFilter ? `WHERE farm_id = '${farmFilter}'` : '';
    const alertCounts = await dbQuery(`
      SELECT risk_category, status, COUNT(*) as cnt
      FROM alerts
      ${alertWhere}
      GROUP BY risk_category, status
    `);

    // Overdue follow-ups
    const overdueFollowups = await dbQueryOne<{ cnt: number }>(`
      SELECT COUNT(*) as cnt FROM follow_ups
      WHERE completed_at IS NULL AND datetime(due_at) < datetime('now')
    `);

    // Pending diagnostics
    const pendingDiagnostics = await dbQueryOne<{ cnt: number }>(`
      SELECT COUNT(*) as cnt FROM diagnostic_results
      WHERE test_result = 'Inconclusive/Contaminated' OR veterinarian_diagnosis = 'Pending Further Workup'
    `);

    // Missing data rates (percentage of monitoring records with null SCC or EC)
    const missingStats = await dbQueryOne<{ total: number; null_scc: number; null_ec: number; null_cmt: number }>(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN SCC_cells_per_ml IS NULL THEN 1 ELSE 0 END) as null_scc,
        SUM(CASE WHEN electrical_conductivity IS NULL THEN 1 ELSE 0 END) as null_ec,
        SUM(CASE WHEN CMT_result IS NULL THEN 1 ELSE 0 END) as null_cmt
      FROM monitoring_records ${cowIdsInFarm}
    `);

    // Recent 14-day Milk Yield & Loss Trends
    const yieldTrends = await dbQuery(`
      SELECT 
        substr(observed_at, 1, 10) as day,
        ROUND(AVG(total_milk_yield_litres), 1) as avg_yield,
        ROUND(SUM(total_milk_yield_litres), 1) as total_yield,
        COUNT(DISTINCT cow_id) as cows_milked
      FROM monitoring_records
      ${cowIdsInFarm}
      GROUP BY substr(observed_at, 1, 10)
      ORDER BY day DESC
      LIMIT 14
    `);

    // Financial revenue summary
    const finSummary = await dbQueryOne<{
      expected_litres: number;
      actual_litres: number;
      discarded_litres: number;
      total_screen_cost: number;
      total_vet_cost: number;
      total_other_cost: number;
    }>(`
      SELECT 
        COALESCE(SUM(expected_yield_litres), 0) as expected_litres,
        COALESCE(SUM(actual_yield_litres), 0) as actual_litres,
        COALESCE(SUM(discarded_milk_litres), 0) as discarded_litres,
        COALESCE(SUM(screening_cost), 0) as total_screen_cost,
        COALESCE(SUM(veterinary_cost), 0) as total_vet_cost,
        COALESCE(SUM(other_recorded_costs), 0) as total_other_cost
      FROM financial_records
      ${farmFilter ? `WHERE farm_id = '${farmFilter}'` : ''}
    `);

    // Recent alerts
    const recentAlerts = await dbQuery(`
      SELECT a.*, c.tag_number, c.breed, f.farm_name
      FROM alerts a
      JOIN cows c ON a.cow_id = c.cow_id
      JOIN farms f ON a.farm_id = f.farm_id
      ${farmFilter ? `WHERE a.farm_id = '${farmFilter}'` : ''}
      ORDER BY a.created_at DESC
      LIMIT 6
    `);

    res.json({
      active_farms: totalFarms?.cnt || 0,
      active_cows: totalCows?.cnt || 0,
      monitoring_records_count: totalMonRecords?.cnt || 0,
      alerts_by_status_and_priority: alertCounts,
      overdue_followups: overdueFollowups?.cnt || 0,
      pending_diagnostics: pendingDiagnostics?.cnt || 0,
      missing_data_summary: {
        total_records: missingStats?.total || 0,
        missing_scc_percent: missingStats && missingStats.total > 0 ? Math.round((missingStats.null_scc / missingStats.total) * 100) : 0,
        missing_ec_percent: missingStats && missingStats.total > 0 ? Math.round((missingStats.null_ec / missingStats.total) * 100) : 0,
        missing_cmt_percent: missingStats && missingStats.total > 0 ? Math.round((missingStats.null_cmt / missingStats.total) * 100) : 0
      },
      yield_trends: yieldTrends.reverse(),
      financial_impact: {
        avg_milk_price_inr: 42.0,
        estimated_yield_loss_litres: Math.max(0, (finSummary?.expected_litres || 0) - (finSummary?.actual_litres || 0)),
        discarded_milk_litres: finSummary?.discarded_litres || 0,
        total_screening_costs: finSummary?.total_screen_cost || 0,
        total_vet_costs: finSummary?.total_vet_cost || 0,
        total_treatment_costs: finSummary?.total_other_cost || 0,
        estimated_total_economic_impact_inr: Math.round(
          ((Math.max(0, (finSummary?.expected_litres || 0) - (finSummary?.actual_litres || 0)) + (finSummary?.discarded_litres || 0)) * 42.0) +
          (finSummary?.total_screen_cost || 0) + (finSummary?.total_vet_cost || 0) + (finSummary?.total_other_cost || 0)
        )
      },
      recent_alerts: recentAlerts
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Farms
app.get('/api/farms', async (req, res) => {
  try {
    const farms = await dbQuery(`
      SELECT f.*,
        (SELECT COUNT(*) FROM cows WHERE farm_id = f.farm_id AND active_status = 'Active') as active_cows_count,
        (SELECT COUNT(*) FROM alerts WHERE farm_id = f.farm_id AND status NOT IN ('Resolved', 'Closed')) as open_alerts_count
      FROM farms f
      ORDER BY f.created_at ASC
    `);
    res.json(farms);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/farms', async (req, res) => {
  try {
    const { farm_name, village, district, state, latitude, longitude, farm_type, herd_size, housing_type } = req.body;
    if (!farm_name || !village || !district || !farm_type || !herd_size || !housing_type) {
      return res.status(400).json({ error: 'Missing required farm fields' });
    }
    const farm_id = 'farm_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await dbRun(`
      INSERT INTO farms (farm_id, farm_name, village, district, state, latitude, longitude, farm_type, herd_size, housing_type, created_at, is_demo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `, [farm_id, farm_name, village, district, state || 'Tamil Nadu', latitude || null, longitude || null, farm_type, herd_size, housing_type, now]);

    await logAudit(req.body.actor || 'User', 'CREATE_FARM', 'farms', farm_id, `Created farm ${farm_name} in ${district}`);
    res.status(201).json({ farm_id, message: 'Farm registered successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Cows
app.get('/api/cows', async (req, res) => {
  try {
    const { farm_id, lactation_stage, search } = req.query;
    let sql = `
      SELECT c.*, f.farm_name, f.district,
        (SELECT risk_category FROM alerts WHERE cow_id = c.cow_id AND status NOT IN ('Resolved', 'Closed') ORDER BY created_at DESC LIMIT 1) as active_alert_priority,
        (SELECT ROUND(total_milk_yield_litres, 1) FROM monitoring_records WHERE cow_id = c.cow_id ORDER BY observed_at DESC LIMIT 1) as latest_yield,
        (SELECT SCC_cells_per_ml FROM monitoring_records WHERE cow_id = c.cow_id AND SCC_cells_per_ml IS NOT NULL ORDER BY observed_at DESC LIMIT 1) as latest_scc
      FROM cows c
      JOIN farms f ON c.farm_id = f.farm_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (farm_id) {
      sql += ' AND c.farm_id = ?';
      params.push(farm_id);
    }
    if (lactation_stage) {
      sql += ' AND c.lactation_stage = ?';
      params.push(lactation_stage);
    }
    if (search) {
      sql += ' AND (c.tag_number LIKE ? OR c.breed LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY c.tag_number ASC';

    const cows = await dbQuery(sql, params);
    res.json(cows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/cows/:cow_id', async (req, res) => {
  try {
    const cow = await dbQueryOne(`
      SELECT c.*, f.farm_name, f.district, f.village
      FROM cows c
      JOIN farms f ON c.farm_id = f.farm_id
      WHERE c.cow_id = ?
    `, [req.params.cow_id]);

    if (!cow) return res.status(404).json({ error: 'Cow not found' });

    // Recent 30 monitoring records
    const records = await dbQuery(`
      SELECT * FROM monitoring_records
      WHERE cow_id = ?
      ORDER BY observed_at ASC
    `, [req.params.cow_id]);

    // Diagnostic history
    const diagnostics = await dbQuery(`
      SELECT * FROM diagnostic_results
      WHERE cow_id = ?
      ORDER BY sample_date DESC
    `, [req.params.cow_id]);

    // Alerts history
    const alerts = await dbQuery(`
      SELECT * FROM alerts
      WHERE cow_id = ?
      ORDER BY created_at DESC
    `, [req.params.cow_id]);

    // Treatments
    const treatments = await dbQuery(`
      SELECT * FROM treatment_records
      WHERE cow_id = ?
      ORDER BY start_date DESC
    `, [req.params.cow_id]);

    // User reported events
    const events = await dbQuery(`
      SELECT * FROM user_reported_events
      WHERE cow_id = ?
      ORDER BY reported_at DESC
    `, [req.params.cow_id]);

    res.json({
      cow,
      monitoring_records: records,
      diagnostics,
      alerts,
      treatments,
      user_events: events
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cows', async (req, res) => {
  try {
    const { farm_id, tag_number, breed, date_of_birth, parity, lactation_stage, calving_date, previous_mastitis_history, baseline_milk_yield_litres } = req.body;
    if (!farm_id || !tag_number || !breed || !date_of_birth || parity == null || !lactation_stage || !calving_date || !baseline_milk_yield_litres) {
      return res.status(400).json({ error: 'Missing required cow registration fields' });
    }

    // Check duplicate tag within farm
    const dup = await dbQueryOne('SELECT cow_id FROM cows WHERE farm_id = ? AND tag_number = ?', [farm_id, tag_number]);
    if (dup) {
      return res.status(409).json({ error: `Tag number '${tag_number}' already registered in this farm` });
    }

    const cow_id = 'cow_' + Math.random().toString(36).substring(2, 9);
    await dbRun(`
      INSERT INTO cows (cow_id, farm_id, tag_number, breed, date_of_birth, parity, lactation_stage, calving_date, previous_mastitis_history, baseline_milk_yield_litres, active_status, is_demo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', 0)
    `, [cow_id, farm_id, tag_number, breed, date_of_birth, parity, lactation_stage, calving_date, previous_mastitis_history ? 1 : 0, baseline_milk_yield_litres]);

    await logAudit(req.body.actor || 'User', 'REGISTER_COW', 'cows', cow_id, `Registered tag ${tag_number}`);
    res.status(201).json({ cow_id, message: 'Cow registered successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/cows/:cow_id', async (req, res) => {
  try {
    const { baseline_milk_yield_litres, lactation_stage, active_status, previous_mastitis_history } = req.body;
    await dbRun(`
      UPDATE cows
      SET baseline_milk_yield_litres = COALESCE(?, baseline_milk_yield_litres),
          lactation_stage = COALESCE(?, lactation_stage),
          active_status = COALESCE(?, active_status),
          previous_mastitis_history = COALESCE(?, previous_mastitis_history)
      WHERE cow_id = ?
    `, [baseline_milk_yield_litres, lactation_stage, active_status, previous_mastitis_history, req.params.cow_id]);

    await logAudit(req.body.actor || 'User', 'UPDATE_COW', 'cows', req.params.cow_id, 'Updated cow profile parameters');
    res.json({ message: 'Cow updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/cows/:cow_id', async (req, res) => {
  try {
    await dbRun('DELETE FROM cows WHERE cow_id = ?', [req.params.cow_id]);
    await logAudit(req.body.actor || 'User', 'DELETE_COW', 'cows', req.params.cow_id, 'Deleted cow');
    res.json({ message: 'Cow deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Monitoring Records
app.get('/api/monitoring-records', async (req, res) => {
  try {
    const { cow_id, farm_id, limit = 50 } = req.query;
    let sql = `
      SELECT m.*, c.tag_number, c.breed, f.farm_name
      FROM monitoring_records m
      JOIN cows c ON m.cow_id = c.cow_id
      JOIN farms f ON c.farm_id = f.farm_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (cow_id) {
      sql += ' AND m.cow_id = ?';
      params.push(cow_id);
    }
    if (farm_id) {
      sql += ' AND c.farm_id = ?';
      params.push(farm_id);
    }
    sql += ' ORDER BY m.observed_at DESC LIMIT ?';
    params.push(Number(limit));

    const records = await dbQuery(sql, params);
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/monitoring-records', async (req, res) => {
  try {
    const {
      cow_id, observed_at, morning_milk_yield_litres, evening_milk_yield_litres,
      SCC_cells_per_ml, CMT_result, electrical_conductivity, milk_appearance,
      udder_swelling, udder_warmth, teat_condition, body_temperature_celsius,
      appetite_status, rumination_status, body_condition_score, water_intake_status, notes
    } = req.body;

    if (!cow_id || !observed_at) {
      return res.status(400).json({ error: 'cow_id and observed_at are required' });
    }

    const m = morning_milk_yield_litres != null ? parseFloat(morning_milk_yield_litres) : null;
    const e = evening_milk_yield_litres != null ? parseFloat(evening_milk_yield_litres) : null;
    const tot = (m != null && e != null) ? m + e : (m || e || null);

    const record_id = 'mon_' + Math.random().toString(36).substring(2, 9);
    await dbRun(`
      INSERT INTO monitoring_records (
        record_id, cow_id, observed_at, morning_milk_yield_litres, evening_milk_yield_litres,
        total_milk_yield_litres, SCC_cells_per_ml, CMT_result, electrical_conductivity,
        milk_appearance, udder_swelling, udder_warmth, teat_condition, body_temperature_celsius,
        appetite_status, rumination_status, body_condition_score, water_intake_status, notes, data_source, is_demo
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Manual Milker Entry', 0)
    `, [
      record_id, cow_id, observed_at, m, e, tot,
      SCC_cells_per_ml || null, CMT_result || null, electrical_conductivity || null,
      milk_appearance || 'Normal', udder_swelling || 'None', udder_warmth || 'Normal',
      teat_condition || 'Normal/Intact', body_temperature_celsius || null,
      appetite_status || 'Normal', rumination_status || 'Normal (400-500 min/day)',
      body_condition_score || null, water_intake_status || 'Normal', notes || null
    ]);

    await logAudit(req.body.actor || 'Milker', 'ADD_MONITORING_RECORD', 'monitoring_records', record_id, `Logged reading for Cow ${cow_id}`);
    res.status(201).json({ record_id, message: 'Monitoring record logged' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Environmental Records
app.get('/api/environmental-records', async (req, res) => {
  try {
    const { farm_id } = req.query;
    let sql = `
      SELECT e.*, f.farm_name, f.district
      FROM environmental_records e
      JOIN farms f ON e.farm_id = f.farm_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (farm_id) {
      sql += ' AND e.farm_id = ?';
      params.push(farm_id);
    }
    sql += ' ORDER BY e.recorded_at DESC LIMIT 50';

    const records = await dbQuery(sql, params);
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/environmental-records', async (req, res) => {
  try {
    const { farm_id, recorded_at, temperature_celsius, relative_humidity_percent, rainfall_mm, bedding_condition, ventilation_status, water_availability, source_type } = req.body;
    if (!farm_id || !recorded_at || temperature_celsius == null || relative_humidity_percent == null) {
      return res.status(400).json({ error: 'Missing required environmental observation fields' });
    }

    const temp = parseFloat(temperature_celsius);
    const rh = parseFloat(relative_humidity_percent);
    const thi = 0.8 * temp + (rh / 100) * (temp - 14.4) + 46.4;
    let heatStress = 'Normal (THI < 72)';
    if (thi >= 88) heatStress = 'Severe Stress (THI > 88)';
    else if (thi >= 79) heatStress = 'Moderate Stress (THI 79-88)';
    else if (thi >= 72) heatStress = 'Mild Stress (THI 72-78)';

    const env_id = 'env_' + Math.random().toString(36).substring(2, 9);
    await dbRun(`
      INSERT INTO environmental_records (
        environment_id, farm_id, recorded_at, temperature_celsius, relative_humidity_percent,
        rainfall_mm, heat_stress_observation, bedding_condition, ventilation_status,
        water_availability, source_type, is_demo
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `, [
      env_id, farm_id, recorded_at, temp, rh,
      rainfall_mm != null ? parseFloat(rainfall_mm) : 0.0,
      heatStress, bedding_condition || 'Clean & Dry Paddy Straw',
      ventilation_status || 'Good Cross-Ventilation',
      water_availability || 'Continuous Clean Fresh Water',
      source_type || 'Manual Farm Weather Log'
    ]);

    await logAudit(req.body.actor || 'User', 'ADD_ENVIRONMENTAL_RECORD', 'environmental_records', env_id, `THI: ${thi.toFixed(1)}`);
    res.status(201).json({ env_id, message: 'Environmental record saved' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Operational & Hygiene Records
app.get('/api/operational-records', async (req, res) => {
  try {
    const { farm_id } = req.query;
    let sql = `
      SELECT o.*, f.farm_name, c.tag_number
      FROM operational_records o
      JOIN farms f ON o.farm_id = f.farm_id
      LEFT JOIN cows c ON o.cow_id = c.cow_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (farm_id) {
      sql += ' AND o.farm_id = ?';
      params.push(farm_id);
    }
    sql += ' ORDER BY o.recorded_at DESC LIMIT 50';

    const records = await dbQuery(sql, params);
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/operational-records', async (req, res) => {
  try {
    const { farm_id, cow_id, recorded_at, milking_shift, milking_hygiene_status, teat_cleaning_status, post_milking_disinfection_status, equipment_cleaning_status, bedding_cleaning_status, notes } = req.body;
    const op_id = 'op_' + Math.random().toString(36).substring(2, 9);
    await dbRun(`
      INSERT INTO operational_records (
        operation_id, farm_id, cow_id, recorded_at, milking_shift, milking_hygiene_status,
        teat_cleaning_status, post_milking_disinfection_status, equipment_cleaning_status,
        bedding_cleaning_status, notes, is_demo
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `, [
      op_id, farm_id, cow_id || null, recorded_at, milking_shift || 'Morning (05:00)',
      milking_hygiene_status || 'Satisfactory', teat_cleaning_status || 'Individual Clean Cloth Dry Wipe',
      post_milking_disinfection_status || 'Immediate Barrier Dip (0.5% Iodine)',
      equipment_cleaning_status || 'Full CIP Hot Alkaline Wash', bedding_cleaning_status || 'Daily Removal & Fresh Bedding',
      notes || null
    ]);

    res.status(201).json({ op_id, message: 'Operational hygiene record logged' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. User Reported Events
app.get('/api/user-reported-events', async (req, res) => {
  try {
    const { farm_id, review_status } = req.query;
    let sql = `
      SELECT e.*, f.farm_name, c.tag_number
      FROM user_reported_events e
      JOIN farms f ON e.farm_id = f.farm_id
      LEFT JOIN cows c ON e.cow_id = c.cow_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (farm_id) {
      sql += ' AND e.farm_id = ?';
      params.push(farm_id);
    }
    if (review_status) {
      sql += ' AND e.review_status = ?';
      params.push(review_status);
    }
    sql += ' ORDER BY e.reported_at DESC';

    const events = await dbQuery(sql, params);
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/user-reported-events', async (req, res) => {
  try {
    const { farm_id, cow_id, reporter_role, event_type, severity, description, onset_time, evidence_reference } = req.body;
    if (!farm_id || !reporter_role || !event_type || !severity || !description) {
      return res.status(400).json({ error: 'Missing required event fields' });
    }

    const event_id = 'evt_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await dbRun(`
      INSERT INTO user_reported_events (
        event_id, farm_id, cow_id, reported_at, reporter_role, event_type, severity,
        description, onset_time, evidence_reference, review_status, is_demo
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending Review', 0)
    `, [event_id, farm_id, cow_id || null, now, reporter_role, event_type, severity, description, onset_time || null, evidence_reference || null]);

    await logAudit(req.body.actor || reporter_role, 'REPORT_EVENT', 'user_reported_events', event_id, `${event_type} (${severity})`);
    res.status(201).json({ event_id, message: 'Event reported successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/user-reported-events/:event_id', async (req, res) => {
  try {
    const { review_status, reviewed_by } = req.body;
    await dbRun(`
      UPDATE user_reported_events
      SET review_status = ?, reviewed_by = ?
      WHERE event_id = ?
    `, [review_status, reviewed_by || 'Veterinarian / Farm Manager', req.params.event_id]);

    await logAudit(req.body.actor || 'Reviewer', 'REVIEW_EVENT', 'user_reported_events', req.params.event_id, `Status: ${review_status}`);
    res.json({ message: 'Event status updated' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Diagnostic Results (Separated verified reference tests)
app.get('/api/diagnostic-results', async (req, res) => {
  try {
    const { cow_id } = req.query;
    let sql = `
      SELECT d.*, c.tag_number, c.breed, f.farm_name
      FROM diagnostic_results d
      JOIN cows c ON d.cow_id = c.cow_id
      JOIN farms f ON c.farm_id = f.farm_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (cow_id) {
      sql += ' AND d.cow_id = ?';
      params.push(cow_id);
    }
    sql += ' ORDER BY d.sample_date DESC';

    const results = await dbQuery(sql, params);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/diagnostic-results', async (req, res) => {
  try {
    const { cow_id, sample_date, test_type, test_result, reference_range_or_criteria, veterinarian_diagnosis, laboratory_confirmation, pathogen_identification, verified_by, verification_date } = req.body;
    if (!cow_id || !sample_date || !test_type || !test_result || !veterinarian_diagnosis || !laboratory_confirmation || !verified_by) {
      return res.status(400).json({ error: 'Missing required diagnostic result fields' });
    }

    const diag_id = 'diag_' + Math.random().toString(36).substring(2, 9);
    await dbRun(`
      INSERT INTO diagnostic_results (
        diagnostic_id, cow_id, sample_date, test_type, test_result, reference_range_or_criteria,
        veterinarian_diagnosis, laboratory_confirmation, pathogen_identification, verified_by, verification_date, is_demo
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `, [
      diag_id, cow_id, sample_date, test_type, test_result, reference_range_or_criteria || 'Laboratory standard',
      veterinarian_diagnosis, laboratory_confirmation, pathogen_identification || null, verified_by, verification_date || sample_date
    ]);

    await logAudit(req.body.actor || verified_by, 'RECORD_DIAGNOSTIC', 'diagnostic_results', diag_id, `${test_type}: ${test_result}`);
    res.status(201).json({ diag_id, message: 'Diagnostic result recorded' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Alerts & Coordination
app.get('/api/alerts', async (req, res) => {
  try {
    const { farm_id, status, risk_category } = req.query;
    let sql = `
      SELECT a.*, c.tag_number, c.breed, c.baseline_milk_yield_litres, f.farm_name, f.district
      FROM alerts a
      JOIN cows c ON a.cow_id = c.cow_id
      JOIN farms f ON a.farm_id = f.farm_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (farm_id) {
      sql += ' AND a.farm_id = ?';
      params.push(farm_id);
    }
    if (status) {
      sql += ' AND a.status = ?';
      params.push(status);
    }
    if (risk_category) {
      sql += ' AND a.risk_category = ?';
      params.push(risk_category);
    }
    sql += ' ORDER BY a.created_at DESC';

    const alerts = await dbQuery(sql, params);
    res.json(alerts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/alerts/:alert_id', async (req, res) => {
  try {
    const { status, assigned_to, outcome, actor = 'User' } = req.body;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    let ackUpdate = '';
    let closeUpdate = '';
    const params: any[] = [status];

    if (assigned_to !== undefined) {
      params.push(assigned_to);
    }
    if (outcome !== undefined) {
      params.push(outcome);
    }

    let sql = 'UPDATE alerts SET status = ?';
    if (assigned_to !== undefined) sql += ', assigned_to = ?';
    if (outcome !== undefined) sql += ', outcome = ?';

    if (status === 'Acknowledged') {
      sql += `, acknowledged_at = COALESCE(acknowledged_at, '${now}')`;
    } else if (status === 'Resolved' || status === 'Closed') {
      sql += `, closed_at = COALESCE(closed_at, '${now}')`;
    }

    sql += ' WHERE alert_id = ?';
    params.push(req.params.alert_id);

    await dbRun(sql, params);
    await logAudit(actor, 'UPDATE_ALERT', 'alerts', req.params.alert_id, `Status changed to ${status}`);
    res.json({ message: 'Alert updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Follow-ups
app.get('/api/follow-ups', async (req, res) => {
  try {
    const { alert_id, cow_id } = req.query;
    let sql = `
      SELECT flw.*, a.risk_category, a.status as alert_status, c.tag_number, f.farm_name
      FROM follow_ups flw
      JOIN alerts a ON flw.alert_id = a.alert_id
      JOIN cows c ON flw.cow_id = c.cow_id
      JOIN farms f ON a.farm_id = f.farm_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (alert_id) {
      sql += ' AND flw.alert_id = ?';
      params.push(alert_id);
    }
    if (cow_id) {
      sql += ' AND flw.cow_id = ?';
      params.push(cow_id);
    }
    sql += ' ORDER BY flw.due_at ASC';

    const followups = await dbQuery(sql, params);
    res.json(followups);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/follow-ups/:followup_id', async (req, res) => {
  try {
    const { completed_at, followup_result, delay_reason, coordination_gap, outcome_notes, veterinarian_referral, actor = 'User' } = req.body;
    await dbRun(`
      UPDATE follow_ups
      SET completed_at = COALESCE(?, completed_at),
          followup_result = COALESCE(?, followup_result),
          delay_reason = COALESCE(?, delay_reason),
          coordination_gap = COALESCE(?, coordination_gap),
          outcome_notes = COALESCE(?, outcome_notes),
          veterinarian_referral = COALESCE(?, veterinarian_referral)
      WHERE followup_id = ?
    `, [completed_at, followup_result, delay_reason, coordination_gap, outcome_notes, veterinarian_referral, req.params.followup_id]);

    await logAudit(actor, 'UPDATE_FOLLOWUP', 'follow_ups', req.params.followup_id, 'Updated follow up screening progress');
    res.json({ message: 'Follow up updated' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Treatments (Veterinary Supervision)
app.get('/api/treatments', async (req, res) => {
  try {
    const { cow_id } = req.query;
    let sql = `
      SELECT t.*, c.tag_number, c.breed, f.farm_name
      FROM treatment_records t
      JOIN cows c ON t.cow_id = c.cow_id
      JOIN farms f ON c.farm_id = f.farm_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (cow_id) {
      sql += ' AND t.cow_id = ?';
      params.push(cow_id);
    }
    sql += ' ORDER BY t.start_date DESC';

    const treatments = await dbQuery(sql, params);
    res.json(treatments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/treatments', async (req, res) => {
  try {
    const { cow_id, diagnostic_id, prescribed_by, treatment_name, start_date, end_date, milk_withdrawal_start, milk_withdrawal_end, treatment_cost, outcome, recurrence_observed } = req.body;
    if (!cow_id || !prescribed_by || !treatment_name || !start_date || !end_date || !milk_withdrawal_start || !milk_withdrawal_end || treatment_cost == null || !outcome) {
      return res.status(400).json({ error: 'Missing required treatment or mandatory withdrawal period fields' });
    }

    const trt_id = 'trt_' + Math.random().toString(36).substring(2, 9);
    await dbRun(`
      INSERT INTO treatment_records (
        treatment_id, cow_id, diagnostic_id, prescribed_by, treatment_name, start_date, end_date,
        milk_withdrawal_start, milk_withdrawal_end, treatment_cost, outcome, recurrence_observed, is_demo
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `, [
      trt_id, cow_id, diagnostic_id || null, prescribed_by, treatment_name, start_date, end_date,
      milk_withdrawal_start, milk_withdrawal_end, parseFloat(treatment_cost), outcome, recurrence_observed ? 1 : 0
    ]);

    await logAudit(req.body.actor || prescribed_by, 'PRESCRIBE_TREATMENT', 'treatment_records', trt_id, `Prescribed ${treatment_name}`);
    res.status(201).json({ trt_id, message: 'Treatment record logged with milk withdrawal requirements' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 13. Financial Records & Revenue Estimator
app.get('/api/financial-records', async (req, res) => {
  try {
    const { farm_id } = req.query;
    let sql = `
      SELECT fn.*, f.farm_name, c.tag_number
      FROM financial_records fn
      JOIN farms f ON fn.farm_id = f.farm_id
      LEFT JOIN cows c ON fn.cow_id = c.cow_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (farm_id) {
      sql += ' AND fn.farm_id = ?';
      params.push(farm_id);
    }
    sql += ' ORDER BY fn.record_date DESC';

    const records = await dbQuery(sql, params);
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/financial-records', async (req, res) => {
  try {
    const { farm_id, cow_id, record_date, milk_price_per_litre, expected_yield_litres, actual_yield_litres, discarded_milk_litres, screening_cost, veterinary_cost, other_recorded_costs } = req.body;
    const fin_id = 'fin_' + Math.random().toString(36).substring(2, 9);

    await dbRun(`
      INSERT INTO financial_records (
        financial_id, farm_id, cow_id, record_date, milk_price_per_litre, expected_yield_litres,
        actual_yield_litres, discarded_milk_litres, screening_cost, veterinary_cost, other_recorded_costs, is_demo
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `, [
      fin_id, farm_id, cow_id || null, record_date, parseFloat(milk_price_per_litre),
      parseFloat(expected_yield_litres), parseFloat(actual_yield_litres),
      discarded_milk_litres != null ? parseFloat(discarded_milk_litres) : 0,
      screening_cost != null ? parseFloat(screening_cost) : 0,
      veterinary_cost != null ? parseFloat(veterinary_cost) : 0,
      other_recorded_costs != null ? parseFloat(other_recorded_costs) : 0
    ]);

    res.status(201).json({ fin_id, message: 'Financial ledger entry recorded' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 14. CSV Import Preview & Commit
app.post('/api/import/preview', async (req, res) => {
  try {
    const { csv_text } = req.body;
    if (!csv_text) return res.status(400).json({ error: 'csv_text is required' });
    const summary = await validateCsvData(csv_text);
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/import/commit', async (req, res) => {
  try {
    const { csv_text, actor = 'User' } = req.body;
    if (!csv_text) return res.status(400).json({ error: 'csv_text is required' });
    const result = await commitImportedRows(csv_text, actor);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 15. Screening Execution Engine
app.post('/api/screening/run', async (req, res) => {
  try {
    const { thresholds, actor = 'User' } = req.body;
    const result = await runScreeningEngine(actor, thresholds);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 16. Model & Service Evaluation
app.get('/api/model/evaluation', async (req, res) => {
  try {
    const evalData = await computeEvaluationMetrics();
    res.json(evalData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 17. Reports & Summary Export
app.get('/api/reports', async (req, res) => {
  try {
    const { farm_id, start_date, end_date } = req.query;

    const farmInfo = farm_id ? await dbQueryOne('SELECT * FROM farms WHERE farm_id = ?', [farm_id]) : null;
    const cowsCount = await dbQueryOne<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM cows ${farm_id ? `WHERE farm_id = '${farm_id}'` : ''}`);
    const alertsCount = await dbQuery(`
      SELECT risk_category, COUNT(*) as cnt
      FROM alerts
      ${farm_id ? `WHERE farm_id = '${farm_id}'` : ''}
      GROUP BY risk_category
    `);
    const treatmentsCount = await dbQueryOne<{ cnt: number; total_cost: number }>(`
      SELECT COUNT(*) as cnt, COALESCE(SUM(treatment_cost), 0) as total_cost
      FROM treatment_records t
      JOIN cows c ON t.cow_id = c.cow_id
      ${farm_id ? `WHERE c.farm_id = '${farm_id}'` : ''}
    `);

    res.json({
      report_generated_at: new Date().toISOString(),
      provenance: 'UdderWatch AI Analytics Pipeline v1.2',
      disclaimer: 'DECISION-SUPPORT & EARLY SCREENING TOOL ONLY. Not a definitive veterinary diagnosis. Medical treatments require veterinary examination.',
      scope: {
        farm_selected: farmInfo ? farmInfo.farm_name : 'All Registered Farms',
        period: start_date && end_date ? `${start_date} to ${end_date}` : 'Complete Historical Registry',
        total_cows_monitored: cowsCount?.cnt || 0
      },
      alert_summary: alertsCount,
      treatment_summary: {
        courses_prescribed: treatmentsCount?.cnt || 0,
        total_veterinary_expenditure_inr: treatmentsCount?.total_cost || 0
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 18. Demo Seed & Reset
app.post('/api/demo/seed', async (req, res) => {
  try {
    const { seed = 42 } = req.body;
    const counts = await seedDemoData(Number(seed));
    res.json({ message: 'Demonstration dataset seeded successfully', counts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/demo/reset', async (req, res) => {
  try {
    const counts = await seedDemoData(42);
    res.json({ message: 'Database reset to canonical seed data (seed=42)', counts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/demo/purge-demo-only', async (req, res) => {
  try {
    const result = await purgeDemoDataOnly();
    res.json({ message: 'Synthetic demo data purged. Non-demo user records preserved.', result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 19. Audit Logs
app.get('/api/audit-logs', async (req, res) => {
  try {
    const logs = await dbQuery('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100');
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Server Startup with Vite Middleware Integration ---
async function startServer() {
  console.log('[INIT] Bootstrapping UdderWatch AI database...');
  await getDatabase();

  const port = await findAvailablePort(Number(process.env.PORT) || 3000);

  // If no farms exist, auto-seed with seed=42
  const existingFarms = await dbQuery('SELECT COUNT(*) as cnt FROM farms');
  if (existingFarms[0].cnt === 0) {
    console.log('[INIT] Empty database detected. Populating canonical demonstration dataset...');
    await seedDemoData(42);
  }

  // Vite development middleware or static production serving
  if (process.env.NODE_ENV !== 'production') {
    const hmrPort = process.env.DISABLE_HMR === 'true'
      ? undefined
      : await findAvailablePort(Number(process.env.HMR_PORT) || 24678);
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ...(hmrPort ? { hmr: { port: hmrPort } } : {}),
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => res.sendFile(path.resolve('dist/index.html')));
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[UdderWatch AI] Server running on http://localhost:${port}`);
  });
}

startServer().catch(err => {
  console.error('[FATAL] Failed to start server:', err);
  process.exit(1);
});
