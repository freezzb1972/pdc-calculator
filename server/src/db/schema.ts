import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, '../../data/pdc.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS filters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model_name TEXT NOT NULL UNIQUE,
      manufacturer TEXT NOT NULL DEFAULT '坚力',
      voltage_rating_v INTEGER,
      current_rating_a INTEGER,
      phases TEXT NOT NULL DEFAULT '单相',
      wire_count INTEGER DEFAULT 2,
      dimensions TEXT,
      unit_price REAL DEFAULT 0,
      category TEXT DEFAULT '暗室设备',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS cable_specs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model_name TEXT NOT NULL UNIQUE,
      conductor_material TEXT NOT NULL DEFAULT '铜芯',
      insulation TEXT NOT NULL DEFAULT 'PVC',
      cross_section_mm2 REAL NOT NULL,
      core_count INTEGER NOT NULL DEFAULT 3,
      voltage_rating_kv TEXT DEFAULT '0.6/1KV',
      shielded INTEGER DEFAULT 0,
      max_current_a REAL DEFAULT 0,
      unit_price REAL DEFAULT 0,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS selection_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filter_current_min REAL,
      filter_current_max REAL,
      phases TEXT DEFAULT '单相',
      min_cross_section_mm2 REAL,
      recommended_cable_id INTEGER REFERENCES cable_specs(id),
      connector_type TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS gb_ampacity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cable_type TEXT NOT NULL,
      installation_method TEXT NOT NULL,
      cross_section_mm2 REAL NOT NULL,
      current_rating_a REAL NOT NULL,
      temperature_base INTEGER DEFAULT 30,
      version TEXT DEFAULT 'GB/T 16895-2025'
    );

    CREATE TABLE IF NOT EXISTS gb_derating (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      factor_type TEXT NOT NULL,
      condition_desc TEXT NOT NULL,
      factor_value REAL NOT NULL,
      version TEXT DEFAULT 'GB/T 16895-2025'
    );

    CREATE TABLE IF NOT EXISTS gb_safety_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_code TEXT NOT NULL UNIQUE,
      rule_name TEXT NOT NULL,
      description TEXT,
      check_formula TEXT,
      min_value REAL,
      max_value REAL,
      unit TEXT,
      severity TEXT DEFAULT 'warning',
      version TEXT DEFAULT 'GB 50054-2011'
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      room_type TEXT NOT NULL DEFAULT '暗室',
      length_m REAL NOT NULL DEFAULT 10,
      width_m REAL NOT NULL DEFAULT 10,
      height_m REAL NOT NULL DEFAULT 6,
      light_model TEXT DEFAULT '',
      light_count INTEGER DEFAULT 0,
      light_circuits INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS circuits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      filter_id INTEGER REFERENCES filters(id),
      name TEXT NOT NULL,
      purpose TEXT DEFAULT '设备',
      voltage_type TEXT DEFAULT '单相220V',
      load_current_a REAL DEFAULT 0,
      notes TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS cable_segments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      circuit_id INTEGER NOT NULL REFERENCES circuits(id) ON DELETE CASCADE,
      parent_segment_id INTEGER REFERENCES cable_segments(id),
      segment_type TEXT NOT NULL DEFAULT 'trunk',
      cable_spec_id INTEGER REFERENCES cable_specs(id),
      length_m REAL DEFAULT 0,
      parallel_count INTEGER DEFAULT 1,
      from_location TEXT DEFAULT '',
      to_location TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      segment_id INTEGER NOT NULL REFERENCES cable_segments(id) ON DELETE CASCADE,
      device_type TEXT NOT NULL DEFAULT '插座',
      model TEXT DEFAULT '',
      rating_v REAL DEFAULT 220,
      rating_a REAL DEFAULT 10,
      quantity INTEGER DEFAULT 1,
      unit_price REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_type TEXT NOT NULL,
      item_id INTEGER NOT NULL,
      old_price REAL NOT NULL DEFAULT 0,
      new_price REAL NOT NULL DEFAULT 0,
      changed_at TEXT DEFAULT (datetime('now','localtime')),
      source TEXT DEFAULT 'manual'
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT DEFAULT '',
      role TEXT DEFAULT 'editor',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
  `);

  // Migration: add positioning columns for Phase 1b layout editor
  const deviceCols = db.prepare("PRAGMA table_info('devices')").all() as any[];
  if (!deviceCols.find((c: any) => c.name === 'pos_x')) {
    db.exec("ALTER TABLE devices ADD COLUMN pos_x REAL DEFAULT 0");
    db.exec("ALTER TABLE devices ADD COLUMN pos_y REAL DEFAULT 0");
  }
  const segCols = db.prepare("PRAGMA table_info('cable_segments')").all() as any[];
  if (!segCols.find((c: any) => c.name === 'from_x')) {
    db.exec("ALTER TABLE cable_segments ADD COLUMN from_x REAL");
    db.exec("ALTER TABLE cable_segments ADD COLUMN from_y REAL");
    db.exec("ALTER TABLE cable_segments ADD COLUMN to_x REAL");
    db.exec("ALTER TABLE cable_segments ADD COLUMN to_y REAL");
  }

  // Indexes for foreign key columns (IF NOT EXISTS in SQLite 3.27+)
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_rooms_project ON rooms(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_circuits_room ON circuits(room_id)',
    'CREATE INDEX IF NOT EXISTS idx_circuits_filter ON circuits(filter_id)',
    'CREATE INDEX IF NOT EXISTS idx_segments_circuit ON cable_segments(circuit_id)',
    'CREATE INDEX IF NOT EXISTS idx_segments_parent ON cable_segments(parent_segment_id)',
    'CREATE INDEX IF NOT EXISTS idx_segments_cable ON cable_segments(cable_spec_id)',
    'CREATE INDEX IF NOT EXISTS idx_devices_segment ON devices(segment_id)',
    'CREATE INDEX IF NOT EXISTS idx_price_history_item ON price_history(item_type, item_id)',
  ];
  for (const sql of indexes) {
    db.exec(sql);
  }

  // Seed default admin user
  const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as any;
  if (userCount.cnt === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)')
      .run('admin', hash, '管理员', 'admin');
    console.log('Created default user: admin / admin123');
  }
}
