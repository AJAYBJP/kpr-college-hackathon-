import { getDatabase, persistDatabaseSync } from './database.ts';

// Deterministic PRNG with seed for reproducibility
class SeededRandom {
  private m: number = 0x80000000;
  private a: number = 1103515245;
  private c: number = 12345;
  private state: number;

  constructor(seed: number = 42) {
    this.state = seed;
  }

  next(): number {
    this.state = (this.a * this.state + this.c) % this.m;
    return this.state / (this.m - 1);
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  choice<T>(items: T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }

  bool(prob: number = 0.5): boolean {
    return this.next() < prob;
  }
}

export async function seedDemoData(customSeed: number = 42): Promise<{
  farms: number;
  cows: number;
  monitoring_records: number;
  environmental_records: number;
  operational_records: number;
  user_reported_events: number;
  diagnostic_results: number;
  alerts: number;
  follow_ups: number;
  treatments: number;
  financial_records: number;
}> {
  const db = await getDatabase();
  const rng = new SeededRandom(customSeed);

  console.log(`[SEED] Beginning reproducible demo data seed (Random Seed: ${customSeed})...`);

  // Clear existing demo records first (keeps any real user records where is_demo = 0)
  db.run('BEGIN TRANSACTION;');
  try {
    db.run('DELETE FROM audit_logs WHERE details LIKE "%SYNTHETIC DEMONSTRATION DATA%" OR details LIKE "%demo%";');
    db.run('DELETE FROM model_runs WHERE is_demo = 1;');
    db.run('DELETE FROM financial_records WHERE is_demo = 1;');
    db.run('DELETE FROM treatment_records WHERE is_demo = 1;');
    db.run('DELETE FROM follow_ups WHERE is_demo = 1;');
    db.run('DELETE FROM alerts WHERE is_demo = 1;');
    db.run('DELETE FROM diagnostic_results WHERE is_demo = 1;');
    db.run('DELETE FROM user_reported_events WHERE is_demo = 1;');
    db.run('DELETE FROM operational_records WHERE is_demo = 1;');
    db.run('DELETE FROM environmental_records WHERE is_demo = 1;');
    db.run('DELETE FROM monitoring_records WHERE is_demo = 1;');
    db.run('DELETE FROM cows WHERE is_demo = 1;');
    db.run('DELETE FROM farms WHERE is_demo = 1;');

    // 1. Farms (3 peri-urban Tamil Nadu farms)
    const farmsData = [
      {
        farm_id: 'farm_tn_chengalpattu',
        farm_name: 'Sri Lakshmi Peri-Urban Dairy Farm',
        village: 'Madambakkam',
        district: 'Chengalpattu',
        state: 'Tamil Nadu',
        latitude: 12.8624,
        longitude: 80.1245,
        farm_type: 'Smallholder Peri-Urban',
        herd_size: 20,
        housing_type: 'Loose Housing with Shed',
        created_at: '2026-08-01 06:00:00'
      },
      {
        farm_id: 'farm_tn_trichy',
        farm_name: 'Cauvery River Valley Dairy Cooperative',
        village: 'Lalgudi',
        district: 'Tiruchirappalli',
        state: 'Tamil Nadu',
        latitude: 10.8667,
        longitude: 78.8167,
        farm_type: 'Cooperative Member',
        herd_size: 20,
        housing_type: 'Tied Stall (Stanchion)',
        created_at: '2026-08-05 06:00:00'
      },
      {
        farm_id: 'farm_tn_coimbatore',
        farm_name: 'Kongu Agro Dairy Producers',
        village: 'Thondamuthur',
        district: 'Coimbatore',
        state: 'Tamil Nadu',
        latitude: 10.9982,
        longitude: 76.8423,
        farm_type: 'Commercial Dairy',
        herd_size: 20,
        housing_type: 'Free Stall Cubicles',
        created_at: '2026-08-10 06:00:00'
      }
    ];

    const insertFarm = db.prepare(`
      INSERT INTO farms (farm_id, farm_name, village, district, state, latitude, longitude, farm_type, herd_size, housing_type, created_at, is_demo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    for (const f of farmsData) {
      insertFarm.run([f.farm_id, f.farm_name, f.village, f.district, f.state, f.latitude, f.longitude, f.farm_type, f.herd_size, f.housing_type, f.created_at]);
    }
    insertFarm.free();

    // 2. Cows (60 cows, 20 per farm)
    const breeds = ['Crossbred HF (Holstein Friesian)', 'Jersey Cross', 'Murrah Buffalo Cross', 'Sahiwal Cross'];
    const lactationStages = ['Early (0-60d)', 'Mid (61-180d)', 'Late (181-305d)'];
    const cowList: Array<{
      cow_id: string;
      farm_id: string;
      tag: string;
      baseline: number;
      breed: string;
      risk_profile: 'healthy' | 'subclinical' | 'acute_mastitis' | 'intermittent';
    }> = [];

    const insertCow = db.prepare(`
      INSERT INTO cows (cow_id, farm_id, tag_number, breed, date_of_birth, parity, lactation_stage, calving_date, previous_mastitis_history, baseline_milk_yield_litres, active_status, is_demo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', 1)
    `);

    const prefixes = [
      { farm_id: 'farm_tn_chengalpattu', p: 'TN-CHE' },
      { farm_id: 'farm_tn_trichy', p: 'TN-TRI' },
      { farm_id: 'farm_tn_coimbatore', p: 'TN-CBE' }
    ];

    let cowCounter = 1;
    for (const p of prefixes) {
      for (let i = 1; i <= 20; i++) {
        const cow_id = `cow_${p.p.toLowerCase().replace('-', '_')}_${i.toString().padStart(2, '0')}`;
        const tag = `${p.p}-${i.toString().padStart(2, '0')}`;
        const breed = rng.choice(breeds);
        const parity = rng.rangeInt(1, 4);
        const lactation = rng.choice(lactationStages);
        const dob = `202${rng.rangeInt(0, 3)}-${rng.rangeInt(1, 12).toString().padStart(2, '0')}-15`;
        const calving = `2026-0${rng.rangeInt(1, 6)}-${rng.rangeInt(1, 28).toString().padStart(2, '0')}`;
        const baseline = Math.round(rng.range(14, 25) * 10) / 10;
        const prevHistory = rng.bool(0.25) ? 1 : 0;

        // Distinct risk profiles for clinical realism
        let risk_profile: 'healthy' | 'subclinical' | 'acute_mastitis' | 'intermittent' = 'healthy';
        if (i === 3 || i === 7 || i === 12) {
          risk_profile = 'subclinical';
        } else if (i === 5 || i === 18) {
          risk_profile = 'acute_mastitis';
        } else if (i === 9 || i === 15) {
          risk_profile = 'intermittent';
        }

        insertCow.run([cow_id, p.farm_id, tag, breed, dob, parity, lactation, calving, prevHistory, baseline]);
        cowList.push({ cow_id, farm_id: p.farm_id, tag, baseline, breed, risk_profile });
        cowCounter++;
      }
    }
    insertCow.free();

    // 3. Environmental Records (30 days for each of the 3 farms = 90 records)
    const baseDate = new Date('2026-09-14T06:00:00Z');
    const insertEnv = db.prepare(`
      INSERT INTO environmental_records (environment_id, farm_id, recorded_at, temperature_celsius, relative_humidity_percent, rainfall_mm, heat_stress_observation, bedding_condition, ventilation_status, water_availability, source_type, is_demo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'On-Farm Weather Monitor (SYNTHETIC DEMONSTRATION DATA)', 1)
    `);

    for (const f of farmsData) {
      for (let day = 0; day < 30; day++) {
        const d = new Date(baseDate.getTime() + day * 86400000);
        const dateStr = d.toISOString().split('T')[0] + ' 07:00:00';
        const temp = Math.round((rng.range(28, 37) + (day > 18 ? 2 : 0)) * 10) / 10;
        const rh = Math.round(rng.range(62, 86) * 10) / 10;
        const rainfall = rng.bool(0.2) ? Math.round(rng.range(2, 35) * 10) / 10 : 0.0;

        // Calculate Temperature-Humidity Index (THI)
        const thi = 0.8 * temp + (rh / 100) * (temp - 14.4) + 46.4;
        let heatStress = 'Normal (THI < 72)';
        if (thi >= 88) heatStress = 'Severe Stress (THI > 88)';
        else if (thi >= 79) heatStress = 'Moderate Stress (THI 79-88)';
        else if (thi >= 72) heatStress = 'Mild Stress (THI 72-78)';

        const bedding = (rainfall > 10 || day % 6 === 0)
          ? rng.choice(['Damp/Moist Bedding', 'Soiled/Wet Manure-Mixed'])
          : 'Clean & Dry Paddy Straw';

        const ventilation = rng.choice(['Good Cross-Ventilation', 'Adequate Fan Circulation', 'Stagnant Air/Poor Flow']);
        const water = rng.choice(['Continuous Clean Fresh Water', 'Continuous Clean Fresh Water', 'Restricted Supply/Trough Dirty']);

        const envId = `env_${f.farm_id}_d${(day + 1).toString().padStart(2, '0')}`;
        insertEnv.run([envId, f.farm_id, dateStr, temp, rh, rainfall, heatStress, bedding, ventilation, water]);
      }
    }
    insertEnv.free();

    // 4. Monitoring Records (30 days x 60 cows = 1,800 records with realistic missingness)
    const insertMon = db.prepare(`
      INSERT INTO monitoring_records (
        record_id, cow_id, observed_at, morning_milk_yield_litres, evening_milk_yield_litres, total_milk_yield_litres,
        SCC_cells_per_ml, CMT_result, electrical_conductivity, milk_appearance, udder_swelling, udder_warmth,
        teat_condition, body_temperature_celsius, appetite_status, rumination_status, body_condition_score,
        water_intake_status, notes, data_source, is_demo
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNTHETIC DEMONSTRATION DATA (Peri-Urban Tamil Nadu)', 1)
    `);

    let monCount = 0;
    for (const cow of cowList) {
      for (let day = 0; day < 30; day++) {
        const d = new Date(baseDate.getTime() + day * 86400000);
        const dateStr = d.toISOString().split('T')[0] + ' 06:30:00';
        const monId = `mon_${cow.cow_id}_d${(day + 1).toString().padStart(2, '0')}`;

        // Behavior depends on profile and day
        let yieldFactor = 1.0;
        let sccVal: number | null = null;
        let cmtVal: string | null = null;
        let ecVal: number | null = null;
        let appearance: string | null = 'Normal';
        let swelling: string | null = 'None';
        let warmth: string | null = 'Normal';
        let bodyTemp: number | null = Math.round(rng.range(38.3, 38.8) * 10) / 10;
        let appetite: string | null = 'Normal';
        let rumination: string | null = 'Normal (400-500 min/day)';
        let bcs: number | null = 3.25;

        // Simulate clinical conditions
        if (cow.risk_profile === 'acute_mastitis' && day >= 20) {
          // Acute outbreak around day 20-25
          yieldFactor = 0.55 + rng.range(-0.05, 0.05);
          sccVal = rng.rangeInt(1200000, 3200000);
          cmtVal = rng.choice(['Distinct Positive (2)', 'Strong Positive (3)']);
          ecVal = Math.round(rng.range(6.8, 8.4) * 10) / 10;
          appearance = rng.choice(['Flakes/Clots Present', 'Watery', 'Discolored/Yellowish']);
          swelling = rng.choice(['Moderate Swelling', 'Severe Hardness']);
          warmth = rng.choice(['Slight Heat', 'Marked Warmth/Pain']);
          bodyTemp = Math.round(rng.range(39.4, 40.8) * 10) / 10;
          appetite = 'Reduced Feed Intake';
          rumination = 'Significantly Reduced';
        } else if (cow.risk_profile === 'subclinical' && day >= 10) {
          // Silent mastitis: milk looks normal! But yield slightly down, SCC elevated, CMT weak/distinct
          yieldFactor = 0.82 + rng.range(-0.04, 0.04);
          sccVal = rng.rangeInt(320000, 750000);
          cmtVal = rng.choice(['Trace (T)', 'Weak Positive (1)', 'Distinct Positive (2)']);
          ecVal = Math.round(rng.range(5.8, 6.7) * 10) / 10;
          appearance = 'Normal'; // SILENT! No visible clots
          swelling = rng.bool(0.3) ? 'Mild Quarter Swelling' : 'None';
          warmth = 'Normal';
        } else if (cow.risk_profile === 'intermittent' && (day % 7 === 0 || day % 7 === 1)) {
          // Yield drop on certain days
          yieldFactor = 0.86;
          sccVal = rng.rangeInt(240000, 420000);
          cmtVal = 'Weak Positive (1)';
          ecVal = Math.round(rng.range(5.6, 6.2) * 10) / 10;
        } else {
          // Healthy baseline
          yieldFactor = 1.0 + rng.range(-0.06, 0.06);
          sccVal = rng.rangeInt(65000, 185000);
          cmtVal = rng.bool(0.1) ? 'Trace (T)' : 'Negative (0)';
          ecVal = Math.round(rng.range(4.6, 5.3) * 10) / 10;
        }

        const baseline = cow.baseline;
        const totalYield = Math.max(2.0, Math.round(baseline * yieldFactor * 10) / 10);
        const morningYield = Math.round(totalYield * 0.58 * 10) / 10;
        const eveningYield = Math.round((totalYield - morningYield) * 10) / 10;

        // Realistic Missingness:
        // On routine days, somatic cell count (SCC) is tested periodically (e.g. 35% of days)
        // Electrical conductivity is available ~70% of days
        // Body temperature measured mostly when ill or 20% random
        const hasScc = (cow.risk_profile !== 'healthy' && day >= 12) || rng.bool(0.35);
        if (!hasScc) sccVal = null;

        const hasEc = rng.bool(0.72);
        if (!hasEc) ecVal = null;

        const hasCmt = (cow.risk_profile !== 'healthy' && day >= 15) || rng.bool(0.40);
        if (!hasCmt) cmtVal = null;

        const teatCond = rng.choice(['Normal/Intact', 'Normal/Intact', 'Hyperkeratosis (Rough Ring)', 'Normal/Intact']);

        insertMon.run([
          monId,
          cow.cow_id,
          dateStr,
          morningYield,
          eveningYield,
          totalYield,
          sccVal,
          cmtVal,
          ecVal,
          appearance,
          swelling,
          warmth,
          teatCond,
          bodyTemp,
          appetite,
          rumination,
          bcs,
          'Normal',
          `Routine dairy observation day ${day + 1}`
        ]);
        monCount++;
      }
    }
    insertMon.free();

    // 5. Operational Records (hygiene, shift protocols)
    const insertOp = db.prepare(`
      INSERT INTO operational_records (
        operation_id, farm_id, cow_id, recorded_at, milking_shift, milking_hygiene_status,
        teat_cleaning_status, post_milking_disinfection_status, equipment_cleaning_status,
        bedding_cleaning_status, recent_cow_movement, dry_period_management, feed_change,
        water_supply_issue, staff_or_equipment_issue, notes, is_demo
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNTHETIC DEMONSTRATION DATA', 1)
    `);

    let opCount = 0;
    for (const f of farmsData) {
      for (let day = 0; day < 30; day++) {
        const d = new Date(baseDate.getTime() + day * 86400000);
        const dateStr = d.toISOString().split('T')[0] + ' 05:30:00';
        const opId = `op_${f.farm_id}_d${(day + 1).toString().padStart(2, '0')}`;

        const isDeficient = day === 14 || day === 21;
        const hygiene = isDeficient ? 'Deficient Pre-Dip' : 'Excellent Protocol';
        const teatClean = isDeficient ? 'Wet Wash Without Complete Drying' : 'Individual Clean Cloth Dry Wipe';
        const postDip = isDeficient ? 'Spray Applied Unevenly' : 'Immediate Barrier Dip (0.5% Iodine)';
        const equip = isDeficient ? 'Cold Water Flush Only' : 'Full CIP Hot Alkaline Wash';
        const bedClean = isDeficient ? 'Partial Scraping' : 'Daily Removal & Fresh Bedding';

        insertOp.run([
          opId,
          f.farm_id,
          null,
          dateStr,
          'Morning (05:00)',
          hygiene,
          teatClean,
          postDip,
          equip,
          bedClean,
          day === 5 ? 'Moved 2 fresh calvers to Milking Section A' : 'Stable herd segregation',
          'Standard intramammary dry cow therapy administered at dry-off',
          day === 12 ? 'Introduced green Co-4 fodder batch' : 'Regular TMR ration',
          'None reported',
          isDeficient ? 'Temporary staff shortage on morning shift' : 'All pulsators and liners tested normal'
        ]);
        opCount++;
      }
    }
    insertOp.free();

    // 6. User Reported Events (farmer & milker observations)
    const insertEvent = db.prepare(`
      INSERT INTO user_reported_events (
        event_id, farm_id, cow_id, reported_at, reporter_role, event_type, severity, description, onset_time,
        evidence_reference, review_status, reviewed_by, is_demo
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const reportedEventsList = [
      {
        id: 'evt_001',
        farm: 'farm_tn_chengalpattu',
        cow: 'cow_tn_che_05',
        date: '2026-10-04 06:15:00',
        role: 'Milker/Herdsman',
        type: 'Abnormal Milk (Clots/Watery)',
        sev: 'High Urgent Priority',
        desc: 'Quarter left-hind showed thick yellow clots during strip cup test. Cow flinched when milking unit attached.',
        onset: 'Morning shift 05:45',
        ref: 'Strip cup photo taken by milker Murugan',
        status: 'Reviewed & Actioned',
        by: 'Dr. S. Ramesh (Field Veterinarian)'
      },
      {
        id: 'evt_002',
        farm: 'farm_tn_chengalpattu',
        cow: 'cow_tn_che_03',
        date: '2026-10-06 07:00:00',
        role: 'Farmer',
        type: 'Drop in Milk Yield',
        sev: 'Moderate Attention',
        desc: 'Milk volume dropped from 22.5L to 17.0L over 48 hours without obvious udder swelling. Milk looks normal to naked eye.',
        onset: 'Last 2 days',
        ref: 'Daily volumetric bucket log',
        status: 'Reviewed & Actioned',
        by: 'K. Rajendran (Farm Manager)'
      },
      {
        id: 'evt_003',
        farm: 'farm_tn_trichy',
        cow: 'cow_tn_tri_18',
        date: '2026-10-07 17:30:00',
        role: 'Milker/Herdsman',
        type: 'Udder Swelling or Heat',
        sev: 'High Urgent Priority',
        desc: 'Right front quarter noticeably firm, hot to touch. Body temperature measured at 40.2C with digital thermometer.',
        onset: 'Evening milking prep',
        ref: 'Observed during pre-milking udder wash',
        status: 'Pending Review',
        by: null
      },
      {
        id: 'evt_004',
        farm: 'farm_tn_trichy',
        cow: 'cow_tn_tri_07',
        date: '2026-10-08 06:30:00',
        role: 'Field Para-Vet',
        type: 'Screening Delayed',
        sev: 'Moderate Attention',
        desc: 'CMT reagent bottle ran out at village center. Scheduled follow-up screening delayed by 24 hours.',
        onset: 'Morning inspection',
        ref: 'Logbook entry #412',
        status: 'Pending Review',
        by: null
      },
      {
        id: 'evt_005',
        farm: 'farm_tn_coimbatore',
        cow: 'cow_tn_cbe_12',
        date: '2026-10-09 08:00:00',
        role: 'Farm Manager',
        type: 'Drop in Milk Yield',
        sev: 'Moderate Attention',
        desc: 'Consecutive yield decrease across both morning and evening shifts for Cow TN-CBE-12. Mild teat end roughness noticed.',
        onset: 'Over past 3 shifts',
        ref: 'Automated in-line flow meter record',
        status: 'Reviewed & Actioned',
        by: 'Dr. V. Meenakshi (Consulting Vet)'
      },
      {
        id: 'evt_006',
        farm: 'farm_tn_coimbatore',
        cow: null,
        date: '2026-10-10 11:00:00',
        role: 'Farm Manager',
        type: 'Hygiene Protocol Breach',
        sev: 'Moderate Attention',
        desc: 'Water pressure pump failed for 3 hours during post-milking clean-up. Hand washing relied on static tank water.',
        onset: '10:00 AM',
        ref: 'Maintenance log #89',
        status: 'Reviewed & Actioned',
        by: 'A. Sundaram (Operations Lead)'
      },
      {
        id: 'evt_007',
        farm: 'farm_tn_chengalpattu',
        cow: 'cow_tn_che_18',
        date: '2026-10-11 06:45:00',
        role: 'Milker/Herdsman',
        type: 'Kicking Milking Machine/Pain',
        sev: 'High Urgent Priority',
        desc: 'Cow repeatedly kicked off cluster liner. Left fore teat hyperemic and tender.',
        onset: 'Cluster attachment',
        ref: 'Milking pit incident tag',
        status: 'Pending Review',
        by: null
      }
    ];

    for (const evt of reportedEventsList) {
      insertEvent.run([evt.id, evt.farm, evt.cow, evt.date, evt.role, evt.type, evt.sev, evt.desc, evt.onset, evt.ref, evt.status, evt.by]);
    }
    insertEvent.free();

    // 7. Diagnostic Results (Separated from risk predictions - verified reference labels)
    // Rule C: Do NOT generate diagnostic labels solely from risk rules! Real bacteriology results.
    const insertDiag = db.prepare(`
      INSERT INTO diagnostic_results (
        diagnostic_id, cow_id, sample_date, test_type, test_result, reference_range_or_criteria,
        veterinarian_diagnosis, laboratory_confirmation, pathogen_identification, verified_by, verification_date, is_demo
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const diagnosticsList = [
      {
        id: 'diag_che_05',
        cow: 'cow_tn_che_05',
        date: '2026-10-04 10:30:00',
        test: 'Bacterial Culture & Isolation',
        result: 'Positive',
        criteria: 'Standard IDF 0.01 mL blood agar plate incubation at 37C for 48h (>1000 CFU/mL pure colony)',
        diag: 'Clinical Mastitis Confirmed',
        lab: 'State Veterinary Diagnostic Lab (Chennai)',
        pathogen: 'Streptococcus agalactiae (Beta-hemolytic)',
        by: 'Dr. S. Ramesh (TANUVAS Microbiologist)',
        vdate: '2026-10-06 14:00:00'
      },
      {
        id: 'diag_che_03',
        cow: 'cow_tn_che_03',
        date: '2026-10-06 09:15:00',
        test: 'Multiplex Real-Time PCR',
        result: 'Positive',
        criteria: 'Ct value < 32.0 target amplification for mastitis pathogens',
        diag: 'Subclinical Mastitis Confirmed',
        lab: 'TANUVAS Referral Laboratory',
        pathogen: 'Staphylococcus aureus (spa gene positive)',
        by: 'Dr. P. Balaji (Associate Professor, Vet Epidemiology)',
        vdate: '2026-10-07 11:30:00'
      },
      {
        id: 'diag_che_01',
        cow: 'cow_tn_che_01',
        date: '2026-10-05 11:00:00',
        test: 'Bacterial Culture & Isolation',
        result: 'Negative',
        criteria: 'No growth at 48h aerobic incubation on blood and MacConkey agar',
        diag: 'Healthy Udder - No Mastitis',
        lab: 'State Veterinary Diagnostic Lab (Chennai)',
        pathogen: 'No pathogenic growth detected',
        by: 'Dr. S. Ramesh (TANUVAS Microbiologist)',
        vdate: '2026-10-07 10:00:00'
      },
      {
        id: 'diag_tri_18',
        cow: 'cow_tn_tri_18',
        date: '2026-10-07 18:00:00',
        test: 'Bacterial Culture & Isolation',
        result: 'Positive',
        criteria: 'Pure growth with lactose fermentation on MacConkey agar',
        diag: 'Clinical Mastitis Confirmed',
        lab: 'TANUVAS Referral Laboratory',
        pathogen: 'Escherichia coli (Coliform mastitis)',
        by: 'Dr. K. Geetha (Bacteriology Division)',
        vdate: '2026-10-09 16:30:00'
      },
      {
        id: 'diag_tri_07',
        cow: 'cow_tn_tri_07',
        date: '2026-10-08 14:00:00',
        test: 'Microscopic Somatic Cell Count (DMSCC)',
        result: 'Positive',
        criteria: 'DMSCC > 400,000 cells/mL counted per 50 microscopic fields',
        diag: 'Subclinical Mastitis Confirmed',
        lab: 'District Polyclinic Lab (Coimbatore)',
        pathogen: 'Coagulase-Negative Staphylococci (CoNS)',
        by: 'Dr. M. Sridhar (Senior Vet Officer)',
        vdate: '2026-10-09 09:00:00'
      },
      {
        id: 'diag_tri_02',
        cow: 'cow_tn_tri_02',
        date: '2026-10-05 10:00:00',
        test: 'Quarter California Mastitis Test (Lab Confirmed)',
        result: 'Negative',
        criteria: 'Homogeneous fluid, zero gel formation (Score 0)',
        diag: 'Healthy Udder - No Mastitis',
        lab: 'District Polyclinic Lab (Coimbatore)',
        pathogen: 'None',
        by: 'Dr. M. Sridhar (Senior Vet Officer)',
        vdate: '2026-10-05 12:00:00'
      },
      {
        id: 'diag_cbe_12',
        cow: 'cow_tn_cbe_12',
        date: '2026-10-09 10:00:00',
        test: 'Multiplex Real-Time PCR',
        result: 'Positive',
        criteria: 'Ct value 28.4 for Streptococcus uberis',
        diag: 'Subclinical Mastitis Confirmed',
        lab: 'TANUVAS Referral Laboratory',
        pathogen: 'Streptococcus uberis',
        by: 'Dr. P. Balaji (Associate Professor)',
        vdate: '2026-10-10 15:00:00'
      },
      {
        id: 'diag_cbe_04',
        cow: 'cow_tn_cbe_04',
        date: '2026-10-07 11:00:00',
        test: 'Bacterial Culture & Isolation',
        result: 'Negative',
        criteria: 'IDF reference threshold < 500 CFU/mL mixed non-specific flora',
        diag: 'Healthy Udder - No Mastitis',
        lab: 'District Polyclinic Lab (Coimbatore)',
        pathogen: 'Non-significant environmental commensals',
        by: 'Dr. V. Meenakshi (Consulting Vet)',
        vdate: '2026-10-09 11:00:00'
      },
      {
        id: 'diag_che_09',
        cow: 'cow_tn_che_09',
        date: '2026-10-08 11:30:00',
        test: 'Bacterial Culture & Isolation',
        result: 'Inconclusive/Contaminated',
        criteria: 'Heavy polymicrobial growth > 3 distinct colony types indicating sampling contamination',
        diag: 'Pending Further Workup',
        lab: 'State Veterinary Diagnostic Lab (Chennai)',
        pathogen: 'Mixed skin/environmental contaminants',
        by: 'Dr. S. Ramesh (TANUVAS Microbiologist)',
        vdate: '2026-10-10 09:30:00'
      },
      {
        id: 'diag_cbe_18',
        cow: 'cow_tn_cbe_18',
        date: '2026-10-10 14:00:00',
        test: 'Antimicrobial Sensitivity Testing (AST)',
        result: 'Positive',
        criteria: 'Kirby-Bauer disc diffusion against 8 antibiotic discs',
        diag: 'Clinical Mastitis Confirmed',
        lab: 'TANUVAS Referral Laboratory',
        pathogen: 'Staphylococcus aureus (Sensitive to Cloxacillin, Ceftiofur; Resistant to Penicillin G)',
        by: 'Dr. P. Balaji (Associate Professor)',
        vdate: '2026-10-12 10:00:00'
      }
    ];

    for (const d of diagnosticsList) {
      insertDiag.run([d.id, d.cow, d.date, d.test, d.result, d.criteria, d.diag, d.lab, d.pathogen, d.by, d.vdate]);
    }
    insertDiag.free();

    // 8. Alerts
    const insertAlert = db.prepare(`
      INSERT INTO alerts (
        alert_id, cow_id, farm_id, created_at, risk_category, score_or_indicator, reasons_json,
        recommended_action, assigned_to, status, acknowledged_at, closed_at, outcome, model_version, is_demo
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'UdderWatch-RulesEngine-v1.2', 1)
    `);

    const alertsList = [
      {
        id: 'alt_001',
        cow: 'cow_tn_che_05',
        farm: 'farm_tn_chengalpattu',
        created: '2026-10-04 06:30:00',
        cat: 'Urgent veterinary review',
        score: 92.5,
        reasons: JSON.stringify([
          'Yield dropped 45% compared to cow 30-day baseline (21.0L -> 11.5L)',
          'High SCC: 2,450,000 cells/mL (acute inflammatory threshold > 1,000,000)',
          'CMT Distinct Positive (2)',
          'Electrical conductivity spiked to 7.8 mS/cm',
          'Physical signs: Quarter swelling and marked warmth noted by milker'
        ]),
        action: 'Isolate milk from bulk tank, withhold from collection, arrange emergency veterinary clinical evaluation',
        assigned: 'Dr. S. Ramesh (Field Vet)',
        status: 'Closed',
        ack: '2026-10-04 07:10:00',
        closed: '2026-10-11 17:00:00',
        outcome: 'Treated with intramammary antibiotics; 5-day withdrawal completed; clinical cure verified'
      },
      {
        id: 'alt_002',
        cow: 'cow_tn_che_03',
        farm: 'farm_tn_chengalpattu',
        created: '2026-10-06 07:15:00',
        cat: 'High screening priority',
        score: 78.0,
        reasons: JSON.stringify([
          'Yield deviation: -24.4% below historical baseline over consecutive 3 shifts',
          'SCC elevated: 580,000 cells/mL (silent subclinical mastitis threshold > 200,000)',
          'No visible milk clots (silent loss phase)',
          'High ambient THI: 79.5 (moderate environmental heat stress exacerbation)'
        ]),
        action: 'Perform quarter-level CMT screening immediately; submit aseptic milk sample for culture/PCR',
        assigned: 'K. Rajendran (Farm Manager)',
        status: 'Veterinarian Referred',
        ack: '2026-10-06 08:30:00',
        closed: null,
        outcome: null
      },
      {
        id: 'alt_003',
        cow: 'cow_tn_tri_18',
        farm: 'farm_tn_trichy',
        created: '2026-10-07 18:00:00',
        cat: 'Urgent veterinary review',
        score: 95.0,
        reasons: JSON.stringify([
          'Severe milk yield loss (-48%)',
          'Body temperature 40.2C (febrile systemic response)',
          'Udder swelling and marked pain reported',
          'Bedding condition on farm: Soiled/Wet manure-mixed (coliform pathogen risk)'
        ]),
        action: 'Immediate veterinary examination required; administer systemic supportive care and targeted therapy',
        assigned: 'Dr. K. Geetha (Bacteriology Division)',
        status: 'Screening Scheduled',
        ack: '2026-10-07 18:45:00',
        closed: null,
        outcome: null
      },
      {
        id: 'alt_004',
        cow: 'cow_tn_cbe_12',
        farm: 'farm_tn_coimbatore',
        created: '2026-10-09 08:30:00',
        cat: 'High screening priority',
        score: 72.5,
        reasons: JSON.stringify([
          'Consecutive 18% yield decline over 4 shifts',
          'Electrical conductivity increased to 6.3 mS/cm',
          'CMT result: Weak Positive (1)',
          'Hyperkeratosis observed on teat canal orifice'
        ]),
        action: 'Inspect milking cluster vacuum settings; apply teat barrier disinfectant dip; repeat CMT in 24 hours',
        assigned: 'A. Sundaram (Operations Lead)',
        status: 'Acknowledged',
        ack: '2026-10-09 09:15:00',
        closed: null,
        outcome: null
      },
      {
        id: 'alt_005',
        cow: 'cow_tn_che_09',
        farm: 'farm_tn_chengalpattu',
        created: '2026-10-08 07:00:00',
        cat: 'Monitor and recheck',
        score: 54.0,
        reasons: JSON.stringify([
          'Mild yield variation (-11% for 1 day)',
          'SCC 240,000 cells/mL (marginal borderline)',
          'CMT Trace (T)',
          'Milk appearance normal, no udder warmth'
        ]),
        action: 'Recheck morning strip cup and milk volume next shift. If decline persists > 48h, schedule CMT.',
        assigned: 'Milker Murugan',
        status: 'Monitoring',
        ack: '2026-10-08 07:45:00',
        closed: null,
        outcome: null
      },
      {
        id: 'alt_006',
        cow: 'cow_tn_tri_07',
        farm: 'farm_tn_trichy',
        created: '2026-10-08 07:15:00',
        cat: 'High screening priority',
        score: 74.0,
        reasons: JSON.stringify([
          'Yield dropped 19.5% from 18.0L to 14.5L',
          'History of mastitis in previous lactation',
          'Milking hygiene reported as deficient pre-dip on farm on 2026-09-28'
        ]),
        action: 'Perform California Mastitis Test and inspect teat condition',
        assigned: 'Field Para-Vet Selvam',
        status: 'New', // Coordination gap: New alert, not acknowledged > 24 hours!
        ack: null,
        closed: null,
        outcome: null
      },
      {
        id: 'alt_007',
        cow: 'cow_tn_cbe_18',
        farm: 'farm_tn_coimbatore',
        created: '2026-10-10 09:00:00',
        cat: 'Urgent veterinary review',
        score: 91.0,
        reasons: JSON.stringify([
          'High yield loss (-38%)',
          'Electrical conductivity 7.4 mS/cm',
          'Watery milk with flakes',
          'Off-feed behavior noted'
        ]),
        action: 'Immediate veterinary referral; quarantine milk from bulk tank',
        assigned: 'Dr. V. Meenakshi (Consulting Vet)',
        status: 'Veterinarian Referred',
        ack: '2026-10-10 09:30:00',
        closed: null,
        outcome: null
      },
      {
        id: 'alt_008',
        cow: 'cow_tn_che_15',
        farm: 'farm_tn_chengalpattu',
        created: '2026-10-12 06:30:00',
        cat: 'Insufficient data',
        score: 35.0,
        reasons: JSON.stringify([
          'Cow calved 8 days ago (early fresh lactation)',
          'Only 4 days of monitoring data logged in registry',
          'Missing SCC and missing electrical conductivity measurements'
        ]),
        action: 'Collect full panel: morning yield, strip cup test, CMT and baseline SCC to establish herd profile',
        assigned: 'K. Rajendran (Farm Manager)',
        status: 'New',
        ack: null,
        closed: null,
        outcome: null
      }
    ];

    for (const a of alertsList) {
      insertAlert.run([a.id, a.cow, a.farm, a.created, a.cat, a.score, a.reasons, a.action, a.assigned, a.status, a.ack, a.closed, a.outcome]);
    }
    insertAlert.free();

    // 9. Follow Ups
    const insertFollow = db.prepare(`
      INSERT INTO follow_ups (
        followup_id, alert_id, cow_id, created_at, due_at, completed_at, screening_action,
        followup_result, veterinarian_referral, delay_reason, coordination_gap, outcome_notes, is_demo
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const followUpsList = [
      {
        id: 'flw_001',
        alert: 'alt_001',
        cow: 'cow_tn_che_05',
        created: '2026-10-04 07:15:00',
        due: '2026-10-04 12:00:00',
        completed: '2026-10-04 11:30:00',
        action: 'On-farm clinical exam by veterinarian, aseptically sampled milk for lab culture',
        result: 'Clinical mastitis confirmed in left-hind quarter; S. agalactiae cultured',
        vet: 1,
        delay: null,
        gap: null,
        notes: 'Intramammary treatment initiated with 5-day milk withdrawal'
      },
      {
        id: 'flw_002',
        alert: 'alt_002',
        cow: 'cow_tn_che_03',
        created: '2026-10-06 08:35:00',
        due: '2026-10-06 16:00:00',
        completed: '2026-10-06 15:45:00',
        action: 'Quarter California Mastitis Test and milk PCR collection',
        result: 'CMT Score 2 (Distinct gel) in right rear quarter; PCR positive for S. aureus',
        vet: 1,
        delay: null,
        gap: null,
        notes: 'Veterinary consultation scheduled for targeted intramammary dry therapy protocol'
      },
      {
        id: 'flw_003',
        alert: 'alt_003',
        cow: 'cow_tn_tri_18',
        created: '2026-10-07 18:50:00',
        due: '2026-10-08 08:00:00',
        completed: null, // Overdue follow-up! Coordination gap
        action: 'Veterinary clinical examination and supportive anti-inflammatory therapy',
        result: null,
        vet: 1,
        delay: 'Veterinarian delayed due to emergency calving call at neighboring village',
        gap: 'Screening overdue: Due 2026-10-08 08:00:00, still incomplete after > 24 hours',
        notes: 'Milker instructed to keep milk isolated from bulk tank until vet arrives'
      },
      {
        id: 'flw_004',
        alert: 'alt_006',
        cow: 'cow_tn_tri_07',
        created: '2026-10-08 07:20:00',
        due: '2026-10-09 10:00:00',
        completed: null, // Overdue and unacknowledged
        action: 'Repeat CMT screening and teat canal examination',
        result: null,
        vet: 0,
        delay: 'Reagent shortage at local dairy extension office',
        gap: 'High-priority alert not acknowledged & follow-up overdue',
        notes: 'Reagent restock requested from district federation'
      },
      {
        id: 'flw_005',
        alert: 'alt_004',
        cow: 'cow_tn_cbe_12',
        created: '2026-10-09 09:20:00',
        due: '2026-10-10 12:00:00',
        completed: '2026-10-10 11:00:00',
        action: 'Quarter CMT and teat dipping protocol audit',
        result: 'CMT Weak Positive in right front teat; teat end hyperkeratosis Score 3',
        vet: 0,
        delay: null,
        gap: null,
        notes: 'Milking vacuum regulated from 48 kPa down to 42 kPa; barrier dip renewed'
      }
    ];

    for (const f of followUpsList) {
      insertFollow.run([f.id, f.alert, f.cow, f.created, f.due, f.completed, f.action, f.result, f.vet, f.delay, f.gap, f.notes]);
    }
    insertFollow.free();

    // 10. Treatment Records (Veterinary-supervised, with mandatory milk withdrawal tracking)
    const insertTreat = db.prepare(`
      INSERT INTO treatment_records (
        treatment_id, cow_id, diagnostic_id, prescribed_by, treatment_name, start_date, end_date,
        milk_withdrawal_start, milk_withdrawal_end, treatment_cost, outcome, recurrence_observed, is_demo
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const treatmentList = [
      {
        id: 'trt_001',
        cow: 'cow_tn_che_05',
        diag: 'diag_che_05',
        prescribed: 'Dr. S. Ramesh (Field Veterinarian)',
        name: 'Intramammary Cloxacillin (500mg per affected quarter x 3 doses) + Flunixin Meglumine NSAID',
        start: '2026-10-04 11:30:00',
        end: '2026-10-07 11:30:00',
        with_start: '2026-10-04 11:30:00',
        with_end: '2026-10-11 11:30:00', // 96-hour post-treatment withdrawal
        cost: 1450.0,
        outcome: 'Clinical Cure Documented',
        recurrence: 0
      },
      {
        id: 'trt_002',
        cow: 'cow_tn_tri_18',
        diag: 'diag_tri_18',
        prescribed: 'Dr. K. Geetha (Bacteriology Division)',
        name: 'Intravenous Ceftiofur Sodium (1mg/kg) + Fluid resuscitation + Meloxicam',
        start: '2026-10-08 10:00:00',
        end: '2026-10-11 10:00:00',
        with_start: '2026-10-08 10:00:00',
        with_end: '2026-10-14 10:00:00',
        cost: 2350.0,
        outcome: 'Ongoing Course',
        recurrence: 0
      },
      {
        id: 'trt_003',
        cow: 'cow_tn_cbe_18',
        diag: 'diag_cbe_18',
        prescribed: 'Dr. V. Meenakshi (Consulting Vet)',
        name: 'Cloxacillin Intramammary Infusion + Supportive Zinc & Vitamin E Boluses',
        start: '2026-10-10 15:00:00',
        end: '2026-10-13 15:00:00',
        with_start: '2026-10-10 15:00:00',
        with_end: '2026-10-17 15:00:00',
        cost: 1680.0,
        outcome: 'Partial Improvement',
        recurrence: 1
      }
    ];

    for (const t of treatmentList) {
      insertTreat.run([t.id, t.cow, t.diag, t.prescribed, t.name, t.start, t.end, t.with_start, t.with_end, t.cost, t.outcome, t.recurrence]);
    }
    insertTreat.free();

    // 11. Financial Records (illustrative transparent milk prices and losses)
    const insertFin = db.prepare(`
      INSERT INTO financial_records (
        financial_id, farm_id, cow_id, record_date, milk_price_per_litre, expected_yield_litres,
        actual_yield_litres, discarded_milk_litres, screening_cost, veterinary_cost, other_recorded_costs, is_demo
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    // Financial records for cows with mastitis or screening over observation window
    const finRecords = [
      {
        id: 'fin_che_05',
        farm: 'farm_tn_chengalpattu',
        cow: 'cow_tn_che_05',
        date: '2026-10-04',
        price: 42.0, // INR per Litre in Tamil Nadu Aavin / Private Peri-Urban
        exp: 22.0,
        act: 11.5,
        discard: 11.5, // 100% discarded due to antibiotics & clots
        screen: 65.0, // CMT + strip
        vet: 450.0, // consultation
        other: 1450.0 // medicines
      },
      {
        id: 'fin_che_05_d2',
        farm: 'farm_tn_chengalpattu',
        cow: 'cow_tn_che_05',
        date: '2026-10-05',
        price: 42.0,
        exp: 22.0,
        act: 13.0,
        discard: 13.0,
        screen: 0.0,
        vet: 0.0,
        other: 0.0
      },
      {
        id: 'fin_che_03',
        farm: 'farm_tn_chengalpattu',
        cow: 'cow_tn_che_03',
        date: '2026-10-06',
        price: 42.0,
        exp: 22.5,
        act: 17.0,
        discard: 0.0, // Subclinical - sold to dairy before detection (economic silent loss)
        screen: 450.0, // Lab PCR
        vet: 300.0,
        other: 0.0
      },
      {
        id: 'fin_tri_18',
        farm: 'farm_tn_trichy',
        cow: 'cow_tn_tri_18',
        date: '2026-10-07',
        price: 40.0,
        exp: 24.0,
        act: 12.0,
        discard: 12.0,
        screen: 120.0,
        vet: 500.0,
        other: 2350.0
      },
      {
        id: 'fin_cbe_12',
        farm: 'farm_tn_coimbatore',
        cow: 'cow_tn_cbe_12',
        date: '2026-10-09',
        price: 44.0,
        exp: 20.0,
        act: 16.4,
        discard: 0.0,
        screen: 80.0,
        vet: 250.0,
        other: 150.0
      }
    ];

    for (const fin of finRecords) {
      insertFin.run([fin.id, fin.farm, fin.cow, fin.date, fin.price, fin.exp, fin.act, fin.discard, fin.screen, fin.vet, fin.other]);
    }
    insertFin.free();

    // 12. Model Runs (audit of initial machine learning baseline evaluation)
    const insertModel = db.prepare(`
      INSERT INTO model_runs (
        run_id, model_name, model_version, training_timestamp, dataset_version, number_of_training_records,
        number_of_verified_labels, evaluation_method, metrics_json, limitations, is_demo
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const metricsData = {
      model_type: 'Calibrated Random Forest + Logistic Regression Baseline',
      training_set_size: 1440,
      validation_test_size: 360,
      verified_reference_labels_count: 10,
      prevalence_rate: 0.70,
      sensitivity_recall: 0.857,
      specificity: 0.667,
      precision: 0.857,
      f1_score: 0.857,
      roc_auc: 0.810,
      confusion_matrix: {
        true_positives: 6,
        false_positives: 1,
        true_negatives: 2,
        false_negatives: 1
      },
      calibration_brier_score: 0.142,
      note: 'SYNTHETIC DEMONSTRATION DATA: Computed on independent test partition. Real-world validation requires clinical field trials.'
    };

    insertModel.run([
      'run_init_baseline',
      'UdderWatch Hybrid Screening Pipeline',
      'v1.2.0',
      '2026-10-14 08:00:00',
      'Synthetic-TamilNadu-v1.0',
      1440,
      10,
      '5-Fold Cow-Stratified GroupKFold & Leakage-Safe Holdout Split',
      JSON.stringify(metricsData),
      'Synthetic demonstration dataset; verified laboratory bacteriology labels are limited in smallholder settings; not a substitute for clinical veterinary diagnosis.'
    ]);
    insertModel.free();

    // 13. Audit Log
    const insertAudit = db.prepare(`
      INSERT INTO audit_logs (audit_id, timestamp, actor, action, entity_type, entity_id, details)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertAudit.run([
      'aud_seed_init',
      new Date().toISOString(),
      'System Seed Generator',
      'INITIALIZE_DEMO_DATASET',
      'system',
      'database',
      `Seeded 3 farms, 60 cows, 1800 monitoring records, 90 environmental records, alerts, follow-ups with seed=${customSeed}. All marked SYNTHETIC DEMONSTRATION DATA.`
    ]);
    insertAudit.free();

    db.run('COMMIT;');
    persistDatabaseSync(db);

    console.log('[SEED] Demo data seeded successfully with referential integrity.');

    return {
      farms: farmsData.length,
      cows: cowList.length,
      monitoring_records: monCount,
      environmental_records: farmsData.length * 30,
      operational_records: opCount,
      user_reported_events: reportedEventsList.length,
      diagnostic_results: diagnosticsList.length,
      alerts: alertsList.length,
      follow_ups: followUpsList.length,
      treatments: treatmentList.length,
      financial_records: finRecords.length
    };
  } catch (err) {
    db.run('ROLLBACK;');
    console.error('[SEED] Failed to seed database:', err);
    throw err;
  }
}

export async function purgeDemoDataOnly(): Promise<{ deleted_demo_cows: number; preserved_real_cows: number }> {
  const db = await getDatabase();
  db.run('BEGIN TRANSACTION;');
  try {
    db.run('DELETE FROM financial_records WHERE is_demo = 1;');
    db.run('DELETE FROM treatment_records WHERE is_demo = 1;');
    db.run('DELETE FROM follow_ups WHERE is_demo = 1;');
    db.run('DELETE FROM alerts WHERE is_demo = 1;');
    db.run('DELETE FROM diagnostic_results WHERE is_demo = 1;');
    db.run('DELETE FROM user_reported_events WHERE is_demo = 1;');
    db.run('DELETE FROM operational_records WHERE is_demo = 1;');
    db.run('DELETE FROM environmental_records WHERE is_demo = 1;');
    db.run('DELETE FROM monitoring_records WHERE is_demo = 1;');
    db.run('DELETE FROM cows WHERE is_demo = 1;');
    db.run('DELETE FROM farms WHERE is_demo = 1;');
    db.run('DELETE FROM model_runs WHERE is_demo = 1;');

    const realCowsStmt = db.prepare('SELECT COUNT(*) as cnt FROM cows WHERE is_demo = 0;');
    realCowsStmt.step();
    const preserved = realCowsStmt.getAsObject().cnt as number;
    realCowsStmt.free();

    db.run('COMMIT;');
    persistDatabaseSync(db);

    return { deleted_demo_cows: 60, preserved_real_cows: preserved };
  } catch (err) {
    db.run('ROLLBACK;');
    throw err;
  }
}
