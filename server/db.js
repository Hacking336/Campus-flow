import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const ROOT = root;
export const DATA_DIR = path.join(root, "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

export const DB_PATH = process.env.DB_FILE || path.join(DATA_DIR, "campusflow.db");
export const db = new DatabaseSync(DB_PATH);

/* PE stock is kept per piece: P.E. Pants (S–3XL) and P.E. Shirt (XS–3XL) each
   own their own size list, so the two are never mixed together. */
export const CREATE_PE_INVENTORY = `
  CREATE TABLE IF NOT EXISTS pe_inventory (
    item     TEXT NOT NULL CHECK (item IN ('Pants', 'Shirt')),
    size     TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    PRIMARY KEY (item, size)
  );
`;

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS students (
    student_no TEXT PRIMARY KEY,
    full_name  TEXT NOT NULL,
    program    TEXT,
    year_level TEXT,
    section    TEXT,
    email      TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    role          TEXT NOT NULL CHECK (role IN ('student', 'registrar', 'custodian', 'admin')),
    full_name     TEXT NOT NULL,
    email         TEXT,
    password_hash TEXT NOT NULL,
    avatar        TEXT,
    student_no    TEXT REFERENCES students(student_no) ON DELETE CASCADE,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS documents (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    student_no     TEXT NOT NULL REFERENCES students(student_no) ON DELETE CASCADE,
    doc_type       TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'requested'
                   CHECK (status IN ('requested', 'processing', 'ready', 'claimed', 'cancelled')),
    date_requested TEXT,
    date_ready     TEXT,
    remarks        TEXT,
    encoded_by     TEXT NOT NULL,
    updated_by     TEXT,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS uniform_orders (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    student_no      TEXT NOT NULL REFERENCES students(student_no) ON DELETE CASCADE,
    category        TEXT NOT NULL CHECK (category IN ('PE', 'General', 'Nursing')),
    item            TEXT,
    size            TEXT,
    status          TEXT NOT NULL DEFAULT 'ordered'
                    CHECK (status IN ('ordered', 'ready', 'claimed', 'cancelled')),
    tailoring_status TEXT CHECK (tailoring_status IN ('queued', 'sewing', 'finished')),
    date_ordered    TEXT NOT NULL,
    time_ordered    TEXT,
    remarks         TEXT,
    inventory_deducted INTEGER NOT NULL DEFAULT 0,
    encoded_by      TEXT NOT NULL,
    updated_by      TEXT,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
  );

${CREATE_PE_INVENTORY}

  CREATE TABLE IF NOT EXISTS activity_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    actor      TEXT NOT NULL,
    action     TEXT NOT NULL,
    entity     TEXT NOT NULL,
    entity_id  TEXT,
    detail     TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_documents_student ON documents(student_no);
  CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
  CREATE INDEX IF NOT EXISTS idx_uniforms_student ON uniform_orders(student_no);
  CREATE INDEX IF NOT EXISTS idx_uniforms_status ON uniform_orders(status);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
`);

/* Older databases kept a single PE pool with no item column. Split it into a
   Pants pool and a Shirt pool so stock can be counted per uniform piece. */
{
  const columns = db.prepare("PRAGMA table_info(pe_inventory)").all();
  if (columns.length > 0 && !columns.some((column) => column.name === "item")) {
    const legacy = db.prepare("SELECT size, quantity FROM pe_inventory").all();
    db.exec("DROP TABLE pe_inventory;");
    db.exec(CREATE_PE_INVENTORY);
    const insert = db.prepare(
      `INSERT INTO pe_inventory (item, size, quantity) VALUES (?, ?, ?)
       ON CONFLICT(item, size) DO UPDATE SET quantity = excluded.quantity`
    );
    for (const row of legacy) {
      insert.run("Pants", row.size, row.quantity);
      insert.run("Shirt", row.size, row.quantity);
    }
  }
}

export function getSetting(key, fallback = null) {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return row ? row.value : fallback;
}

export function setSetting(key, value) {
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, String(value));
}

export function getSettings() {
  const out = {};
  for (const row of db.prepare("SELECT key, value FROM settings").all()) out[row.key] = row.value;
  return out;
}

export function logActivity({ actor, action, entity, entityId = null, detail = null }) {
  db.prepare(
    `INSERT INTO activity_log (actor, action, entity, entity_id, detail, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(actor, action, entity, entityId === null ? null : String(entityId), detail, new Date().toISOString());
}
