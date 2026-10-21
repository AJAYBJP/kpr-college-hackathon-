import Papa from 'papaparse';
import { dbQuery, dbRun, logAudit } from '../db/database.ts';

export interface ValidationError {
  row_number: number;
  column: string;
  value: any;
  error_type: 'REQUIRED' | 'RANGE' | 'FORMAT' | 'FOREIGN_KEY' | 'DUPLICATE' | 'CATEGORY';
  message: string;
}

export interface ValidationSummary {
  total_rows: number;
  accepted_rows_count: number;
  rejected_rows_count: number;
  duplicate_rows_count: number;
  review_required_count: number;
  detected_schema_type: 'monitoring' | 'environmental' | 'cows' | 'financial' | 'unknown';
  column_mappings: Record<string, string>;
  errors: ValidationError[];
  preview_rows: any[];
}

export async function validateCsvData(csvText: string): Promise<ValidationSummary> {
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false
  });

  const rows = parsed.data as Record<string, string>[];
  const errors: ValidationError[] = [];

  if (!rows || rows.length === 0) {
    return {
      total_rows: 0,
      accepted_rows_count: 0,
      rejected_rows_count: 0,
      duplicate_rows_count: 0,
      review_required_count: 0,
      detected_schema_type: 'unknown',
      column_mappings: {},
      errors: [{
        row_number: 0,
        column: 'file',
        value: null,
        error_type: 'FORMAT',
        message: 'Empty CSV file or unparseable headers'
      }],
      preview_rows: []
    };
  }

  // Detect Schema Type
  const headers = Object.keys(rows[0]).map(h => h.trim().toLowerCase());
  let schemaType: 'monitoring' | 'environmental' | 'cows' | 'financial' | 'unknown' = 'unknown';

  if (headers.includes('scc_cells_per_ml') || headers.includes('cmt_result') || headers.includes('morning_milk_yield_litres')) {
    schemaType = 'monitoring';
  } else if (headers.includes('temperature_celsius') || headers.includes('relative_humidity_percent')) {
    schemaType = 'environmental';
  } else if (headers.includes('tag_number') && headers.includes('breed')) {
    schemaType = 'cows';
  } else if (headers.includes('milk_price_per_litre') || headers.includes('expected_yield_litres')) {
    schemaType = 'financial';
  }

  // Pre-load reference cows & farms for foreign key checks
  const existingFarms = await dbQuery<{ farm_id: string }>('SELECT farm_id FROM farms');
  const existingCows = await dbQuery<{ cow_id: string; farm_id: string; tag_number: string }>('SELECT cow_id, farm_id, tag_number FROM cows');
  const farmIdSet = new Set(existingFarms.map(f => f.farm_id));
  const cowIdSet = new Set(existingCows.map(c => c.cow_id));
  const cowTagMap = new Map(existingCows.map(c => [`${c.farm_id}:${c.tag_number}`, c.cow_id]));

  // Pre-load existing (cow_id, observed_at) to detect duplicates
  const existingRecords = await dbQuery<{ cow_id: string; observed_at: string }>('SELECT cow_id, observed_at FROM monitoring_records');
  const recordKeySet = new Set(existingRecords.map(r => `${r.cow_id}_${r.observed_at.substring(0, 10)}`));

  let acceptedCount = 0;
  let rejectedCount = 0;
  let duplicateCount = 0;
  let reviewCount = 0;

  const validCategoriesCMT = ['Negative (0)', 'Trace (T)', 'Weak Positive (1)', 'Distinct Positive (2)', 'Strong Positive (3)'];
  const validAppearance = ['Normal', 'Watery', 'Flakes/Clots Present', 'Blood Tinged', 'Discolored/Yellowish'];

  rows.forEach((row, idx) => {
    const rowNum = idx + 1;
    let rowHasReject = false;
    let rowHasReview = false;

    // Normalizing keys
    const getVal = (keyAliases: string[]) => {
      for (const k of Object.keys(row)) {
        if (keyAliases.includes(k.trim().toLowerCase())) return row[k]?.toString().trim();
      }
      return undefined;
    };

    if (schemaType === 'monitoring') {
      const cowId = getVal(['cow_id', 'cow', 'cowname']);
      const farmId = getVal(['farm_id', 'farm']);
      const observedAt = getVal(['observed_at', 'date', 'observed_date', 'timestamp']);
      const morningYield = getVal(['morning_milk_yield_litres', 'morning_yield', 'morning']);
      const eveningYield = getVal(['evening_milk_yield_litres', 'evening_yield', 'evening']);
      const scc = getVal(['scc_cells_per_ml', 'scc', 'somatic_cell_count']);
      const cmt = getVal(['cmt_result', 'cmt']);
      const ec = getVal(['electrical_conductivity', 'conductivity', 'ec_ms_cm']);
      const appearance = getVal(['milk_appearance', 'appearance']);

      // 1. Foreign Key Validation
      if (!cowId) {
        errors.push({
          row_number: rowNum,
          column: 'cow_id',
          value: null,
          error_type: 'REQUIRED',
          message: 'Cow ID is required'
        });
        rowHasReject = true;
      } else if (!cowIdSet.has(cowId)) {
        errors.push({
          row_number: rowNum,
          column: 'cow_id',
          value: cowId,
          error_type: 'FOREIGN_KEY',
          message: `Cow ID '${cowId}' does not exist in registry`
        });
        rowHasReject = true;
      }

      // 2. Date Validation
      if (!observedAt) {
        errors.push({
          row_number: rowNum,
          column: 'observed_at',
          value: null,
          error_type: 'REQUIRED',
          message: 'Observation date is required'
        });
        rowHasReject = true;
      } else {
        const d = new Date(observedAt);
        if (isNaN(d.getTime())) {
          errors.push({
            row_number: rowNum,
            column: 'observed_at',
            value: observedAt,
            error_type: 'FORMAT',
            message: `Invalid date format: ${observedAt}`
          });
          rowHasReject = true;
        } else if (cowId && recordKeySet.has(`${cowId}_${observedAt.substring(0, 10)}`)) {
          errors.push({
            row_number: rowNum,
            column: 'observed_at',
            value: observedAt,
            error_type: 'DUPLICATE',
            message: `Duplicate record for Cow ${cowId} on date ${observedAt.substring(0, 10)}`
          });
          duplicateCount++;
          rowHasReject = true;
        }
      }

      // 3. Yield Range Validation (0.5 to 45 L)
      if (morningYield != null && morningYield !== '') {
        const m = parseFloat(morningYield);
        if (isNaN(m) || m < 0 || m > 45) {
          errors.push({
            row_number: rowNum,
            column: 'morning_milk_yield_litres',
            value: morningYield,
            error_type: 'RANGE',
            message: `Morning yield (${morningYield}L) out of physiological range [0 - 45L]`
          });
          rowHasReject = true;
        }
      }

      // 4. SCC Range Validation (10,000 to 10,000,000 cells/ml)
      if (scc != null && scc !== '') {
        const s = parseInt(scc.replace(/,/g, ''), 10);
        if (isNaN(s) || s < 10000 || s > 15000000) {
          errors.push({
            row_number: rowNum,
            column: 'SCC_cells_per_ml',
            value: scc,
            error_type: 'RANGE',
            message: `SCC value (${scc}) outside realistic range [10,000 - 15,000,000 cells/mL]`
          });
          rowHasReview = true;
        }
      }

      // 5. CMT Category Validation
      if (cmt != null && cmt !== '' && !validCategoriesCMT.some(c => cmt.toLowerCase().includes(c.toLowerCase().substring(0, 4)))) {
        errors.push({
          row_number: rowNum,
          column: 'CMT_result',
          value: cmt,
          error_type: 'CATEGORY',
          message: `Unrecognized CMT category: '${cmt}'. Allowed: Negative, Trace, Weak Positive, Distinct Positive, Strong Positive`
        });
        rowHasReview = true;
      }

      // 6. Electrical conductivity Range (2.0 to 14.0 mS/cm)
      if (ec != null && ec !== '') {
        const e = parseFloat(ec);
        if (isNaN(e) || e < 2.0 || e > 15.0) {
          errors.push({
            row_number: rowNum,
            column: 'electrical_conductivity',
            value: ec,
            error_type: 'RANGE',
            message: `Electrical conductivity (${ec} mS/cm) outside realistic threshold [2.0 - 15.0 mS/cm]`
          });
          rowHasReview = true;
        }
      }
    } else {
      // Generic check for other tables
      if (Object.keys(row).length < 2) {
        rowHasReject = true;
      }
    }

    if (rowHasReject) rejectedCount++;
    else if (rowHasReview) reviewCount++;
    else acceptedCount++;
  });

  return {
    total_rows: rows.length,
    accepted_rows_count: acceptedCount,
    rejected_rows_count: rejectedCount,
    duplicate_rows_count: duplicateCount,
    review_required_count: reviewCount,
    detected_schema_type: schemaType,
    column_mappings: headers.reduce((acc, h) => ({ ...acc, [h]: h }), {}),
    errors,
    preview_rows: rows.slice(0, 10)
  };
}

export async function commitImportedRows(csvText: string, actor: string = 'User'): Promise<{
  inserted_records: number;
  skipped_records: number;
}> {
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const rows = parsed.data as Record<string, string>[];
  let inserted = 0;
  let skipped = 0;

  const validCows = await dbQuery<{ cow_id: string }>('SELECT cow_id FROM cows');
  const validCowSet = new Set(validCows.map(c => c.cow_id));

  for (const row of rows) {
    const cowId = row.cow_id || row.cow;
    const observedAt = row.observed_at || row.date || new Date().toISOString();
    if (!cowId || !validCowSet.has(cowId)) {
      skipped++;
      continue;
    }

    const mYield = row.morning_milk_yield_litres ? parseFloat(row.morning_milk_yield_litres) : null;
    const eYield = row.evening_milk_yield_litres ? parseFloat(row.evening_milk_yield_litres) : null;
    const totYield = (mYield != null && eYield != null) ? mYield + eYield : (mYield || eYield || null);
    const scc = row.SCC_cells_per_ml ? parseInt(row.SCC_cells_per_ml.replace(/,/g, ''), 10) : null;
    const cmt = row.CMT_result || null;
    const ec = row.electrical_conductivity ? parseFloat(row.electrical_conductivity) : null;
    const app = row.milk_appearance || 'Normal';

    const recId = 'imp_' + Math.random().toString(36).substring(2, 10);
    try {
      await dbRun(`
        INSERT INTO monitoring_records (
          record_id, cow_id, observed_at, morning_milk_yield_litres, evening_milk_yield_litres,
          total_milk_yield_litres, SCC_cells_per_ml, CMT_result, electrical_conductivity,
          milk_appearance, data_source, is_demo
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Imported CSV Upload', 0)
      `, [recId, cowId, observedAt, mYield, eYield, totYield, scc, cmt, ec, app]);
      inserted++;
    } catch {
      skipped++;
    }
  }

  await logAudit(actor, 'COMMIT_CSV_IMPORT', 'monitoring_records', 'batch', `Imported ${inserted} records, skipped ${skipped}`);
  return { inserted_records: inserted, skipped_records: skipped };
}
