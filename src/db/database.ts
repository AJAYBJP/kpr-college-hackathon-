import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve(process.cwd(), 'udderwatch.db');
const SCHEMA_PATH = path.resolve(process.cwd(), 'src', 'db', 'schema.sql');

let dbInstance: SqlJsDatabase | null = null;
let isDirty = false;

export async function getDatabase(): Promise<SqlJsDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      dbInstance = new SQL.Database(fileBuffer);
      dbInstance.run('PRAGMA foreign_keys = ON;');
      console.log(`[DB] Successfully loaded SQLite database from ${DB_PATH} (${fileBuffer.length} bytes)`);
    } catch (err) {
      console.error('[DB] Failed to load existing udderwatch.db, re-initializing...', err);
      dbInstance = new SQL.Database();
      initSchema(dbInstance);
    }
  } else {
    console.log('[DB] udderwatch.db not found on disk, creating new SQLite database...');
    dbInstance = new SQL.Database();
    initSchema(dbInstance);
  }

  // Ensure all tables exist in case schema was updated
  if (dbInstance) {
    initSchema(dbInstance);
  }

  return dbInstance!;
}

function initSchema(db: SqlJsDatabase) {
  try {
    const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    db.run('PRAGMA foreign_keys = ON;');
    db.exec(schemaSql);
    persistDatabaseSync(db);
    console.log('[DB] SQLite schema initialized with all 13 tables.');
  } catch (err) {
    console.error('[DB] Error initializing schema:', err);
  }
}

export function persistDatabaseSync(db?: SqlJsDatabase) {
  const target = db || dbInstance;
  if (!target) return;
  try {
    const data = target.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
    isDirty = false;
  } catch (err) {
    console.error('[DB] Failed to persist SQLite to disk:', err);
  }
}

export async function dbQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db = await getDatabase();
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as T);
    }
    return results;
  } finally {
    stmt.free();
  }
}

export async function dbQueryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await dbQuery<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function dbRun(sql: string, params: any[] = []): Promise<{ changes: number }> {
  const db = await getDatabase();
  const stmt = db.prepare(sql);
  try {
    stmt.run(params);
    const changes = db.getRowsModified();
    persistDatabaseSync(db);
    return { changes };
  } finally {
    stmt.free();
  }
}

export async function dbExec(sql: string): Promise<void> {
  const db = await getDatabase();
  db.exec(sql);
  persistDatabaseSync(db);
}

export async function dbTransaction<T>(action: (db: SqlJsDatabase) => T): Promise<T> {
  const db = await getDatabase();
  db.run('BEGIN TRANSACTION;');
  try {
    const result = action(db);
    db.run('COMMIT;');
    persistDatabaseSync(db);
    return result;
  } catch (err) {
    db.run('ROLLBACK;');
    throw err;
  }
}

export async function logAudit(
  actor: string,
  action: string,
  entity_type: string,
  entity_id: string,
  details: string = ''
) {
  const audit_id = 'aud_' + Math.random().toString(36).substring(2, 10);
  const timestamp = new Date().toISOString();
  await dbRun(
    `INSERT INTO audit_logs (audit_id, timestamp, actor, action, entity_type, entity_id, details)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [audit_id, timestamp, actor, action, entity_type, entity_id, details]
  );
}
