/**
 * UdderWatch AI - Automated Test Suite
 * Tests Database, Referential Integrity, Screening Engine, ML Evaluation, and CSV Validation.
 */

import { getDatabase, dbQuery, dbQueryOne, logAudit } from '../src/db/database.ts';
import { seedDemoData } from '../src/db/seed.ts';
import { runScreeningEngine, DEFAULT_THRESHOLDS } from '../src/services/screeningEngine.ts';
import { computeEvaluationMetrics } from '../src/services/mlEvaluation.ts';
import { validateCsvData } from '../src/services/validator.ts';

async function runTests() {
  console.log('====================================================');
  console.log(' UdderWatch AI — Automated Test Suite Execution');
  console.log('====================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // Test 1: Database Initialization & Table Existence
    const db = await getDatabase();
    assert(db !== null, 'SQLite database initialized via sql.js');

    const tables = await dbQuery<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );
    const tableNames = tables.map(t => t.name);
    assert(tableNames.includes('farms'), 'Table farms exists');
    assert(tableNames.includes('cows'), 'Table cows exists');
    assert(tableNames.includes('monitoring_records'), 'Table monitoring_records exists');
    assert(tableNames.includes('alerts'), 'Table alerts exists');
    assert(tableNames.includes('diagnostic_results'), 'Table diagnostic_results exists');
    assert(tableNames.includes('financial_records'), 'Table financial_records exists');
    assert(tableNames.includes('model_runs'), 'Table model_runs exists');

    // Test 2: Seed Data Integrity
    const seedRes = await seedDemoData(42);
    assert(seedRes.farms === 3, 'Seed created exactly 3 demonstration farms');
    assert(seedRes.cows === 60, 'Seed created exactly 60 cows (20 per farm)');
    assert(seedRes.monitoring_records === 1800, 'Seed created 1,800 monitoring records (30 days x 60 cows)');
    assert(seedRes.alerts >= 6, 'Seed created initial alerts with diverse statuses');

    // Test 3: Referential Integrity
    const cow = await dbQueryOne('SELECT * FROM cows LIMIT 1');
    assert(cow !== null && cow.farm_id.startsWith('farm_'), 'Cow references valid farm_id');
    const farm = await dbQueryOne('SELECT * FROM farms WHERE farm_id = ?', [cow.farm_id]);
    assert(farm !== null, 'Referential foreign key resolves to existing farm');

    // Test 4: Screening Engine Logic
    const screeningRes = await runScreeningEngine('Automated Test', DEFAULT_THRESHOLDS);
    assert(screeningRes.scanned_cows === 60, 'Screening engine scanned all 60 active cows');
    assert(
      screeningRes.categories_count['Urgent veterinary review'] > 0,
      'Identified urgent veterinary review cases (acute clinical signs / severe yield drop)'
    );
    assert(
      screeningRes.categories_count['High screening priority'] > 0,
      'Identified high screening priority cases (silent subclinical mastitis)'
    );

    // Test 5: ML Evaluation Pipeline
    const evalRes = await computeEvaluationMetrics();
    assert(evalRes.detection.evaluable === true, 'Detection metrics evaluable with verified lab labels');
    assert(evalRes.detection.confusion_matrix.tp > 0, 'Confusion matrix contains true positives');
    assert(evalRes.detection.sensitivity_recall !== null, 'Sensitivity/recall computed successfully');
    assert(evalRes.response_time.total_alerts > 0, 'Response time metrics computed from alerts');
    assert(evalRes.service_effectiveness.coordination_gaps_count >= 1, 'Coordination gaps detected');

    // Test 6: CSV Validation Logic - Valid CSV
    const validCsv = `cow_id,observed_at,morning_milk_yield_litres,evening_milk_yield_litres,SCC_cells_per_ml,CMT_result,electrical_conductivity
cow_tn_che_01,2026-10-15 06:00:00,10.2,7.8,110000,Negative (0),4.8`;
    const valSummary = await validateCsvData(validCsv);
    assert(valSummary.accepted_rows_count === 1, 'Valid CSV row accepted');
    assert(valSummary.rejected_rows_count === 0, 'Valid CSV row has 0 rejections');

    // Test 7: CSV Validation Logic - Invalid Row with Boundary Violations
    const invalidCsv = `cow_id,observed_at,morning_milk_yield_litres,evening_milk_yield_litres,SCC_cells_per_ml,CMT_result,electrical_conductivity
unknown_cow_999,not-a-date,999.0,7.8,100,InvalidCMT,99.9`;
    const invalidSummary = await validateCsvData(invalidCsv);
    assert(invalidSummary.rejected_rows_count === 1, 'Invalid CSV row rejected');
    assert(invalidSummary.errors.length >= 3, 'Multiple validation errors flagged for invalid row');

    // Test 8: Audit Logging
    await logAudit('TestRunner', 'EXECUTE_UNIT_TEST', 'system', 'test_suite', 'All tests completed');
    const recentAudit = await dbQueryOne("SELECT * FROM audit_logs WHERE action = 'EXECUTE_UNIT_TEST'");
    assert(recentAudit !== null, 'Audit log created and verified in database');

  } catch (err) {
    console.error('[EXCEPTION] Test failed with error:', err);
    failed++;
  }

  console.log('====================================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
