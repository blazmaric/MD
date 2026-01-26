import { query } from './db.js';

const MIGRATION_001 = `
-- Users table with permission-based access
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- System snapshots (summary data)
CREATE TABLE IF NOT EXISTS snapshots (
  id BIGSERIAL PRIMARY KEY,
  snapshot_ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  online BOOLEAN NOT NULL,
  stale BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  active_uplink TEXT,
  lte_operator TEXT,
  lte_rsrp INTEGER,
  lte_rsrq INTEGER,
  lte_rssi INTEGER,
  lte_sinr INTEGER,
  wifi_ssid TEXT,
  wifi_status TEXT,
  system_uptime BIGINT,
  system_cpu_percent NUMERIC(5,2),
  system_ram_percent NUMERIC(5,2),
  current_speed_rx BIGINT,
  current_speed_tx BIGINT,
  vxlan_rx_bytes BIGINT,
  vxlan_tx_bytes BIGINT
);

CREATE INDEX IF NOT EXISTS idx_snapshots_ts ON snapshots(snapshot_ts DESC);

-- MikroTik logs
CREATE TABLE IF NOT EXISTS logs (
  id BIGSERIAL PRIMARY KEY,
  log_time TIMESTAMPTZ NOT NULL,
  topics TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT,
  severity TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_time ON logs(log_time DESC);
CREATE INDEX IF NOT EXISTS idx_logs_category ON logs(category);
CREATE INDEX IF NOT EXISTS idx_logs_severity ON logs(severity);

-- Avoid duplicate logs
CREATE UNIQUE INDEX IF NOT EXISTS idx_logs_unique ON logs(log_time, topics, message);

-- Traffic data (rx/tx bytes over time)
CREATE TABLE IF NOT EXISTS traffic_history (
  id BIGSERIAL PRIMARY KEY,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  interface_name TEXT NOT NULL,
  rx_bytes BIGINT NOT NULL,
  tx_bytes BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_traffic_recorded ON traffic_history(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_traffic_iface ON traffic_history(interface_name, recorded_at DESC);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
`;

export async function runMigrations() {
  try {
    console.log('Running database migrations...');

    await query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const migrationFile = '001_init';
    const result = await query('SELECT filename FROM migrations WHERE filename = $1', [migrationFile]);

    if (result.rows.length > 0) {
      console.log(`Migration ${migrationFile} already applied, skipping`);
      return;
    }

    console.log(`Applying migration: ${migrationFile}`);
    await query(MIGRATION_001);

    await query('INSERT INTO migrations (filename) VALUES ($1)', [migrationFile]);

    console.log(`Migration ${migrationFile} applied successfully`);
  } catch (err) {
    console.error('Migration failed:', err);
    throw err;
  }
}
