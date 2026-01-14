// db.js
const Database = require("better-sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");

// DB-Datei
const dbPath = path.join(process.cwd() + "/data", "strategy.sqlite");

// DB öffnen
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

// --------------------
// Tabellen anlegen
// --------------------
db.exec(`
CREATE TABLE IF NOT EXISTS strategy_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  viewer_hash TEXT NOT NULL,
  admin_hash TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS strategy_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS strategy_zones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL,
  zone_key TEXT NOT NULL,
  FOREIGN KEY (template_id) REFERENCES strategy_templates(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS strategy_rows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  zone_id INTEGER NOT NULL,
  row_key TEXT NOT NULL,
  team_name TEXT NOT NULL,
  amount TEXT,
  note TEXT,
  position INTEGER,
  FOREIGN KEY (zone_id) REFERENCES strategy_zones(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS counters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  opponent_leader_id TEXT NOT NULL,
  counter_leader_id TEXT NOT NULL,
  unit_2_id TEXT DEFAULT 'ANY',
  unit_3_id TEXT DEFAULT 'ANY',
  unit_4_id TEXT DEFAULT 'ANY',
  unit_5_id TEXT DEFAULT 'ANY',
  game_mode TEXT CHECK(game_mode IN ('GAC', 'TB', 'BOTH')) NOT NULL DEFAULT 'BOTH',
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

function verifyStrategyPassword(password) {
  const settings = db
    .prepare(
      "SELECT viewer_hash, admin_hash FROM strategy_settings WHERE id = 1"
    )
    .get();

  if (!settings) return null;

  if (bcrypt.compareSync(password, settings.admin_hash)) {
    return "admin";
  }

  if (bcrypt.compareSync(password, settings.viewer_hash)) {
    return "viewer";
  }

  return null;
}
module.exports = {
  db,
  verifyStrategyPassword,
};
