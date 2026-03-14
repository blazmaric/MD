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

const MIGRATION_002 = `
-- Add new columns to snapshots table
ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS gateway_type TEXT;
ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS current_speed_interface TEXT;
`;

const MIGRATION_003 = `
-- Add public_ip column to snapshots table
ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS public_ip TEXT;
`;

const MIGRATION_004 = `
-- Add GPS columns to snapshots table
ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS gps_latitude NUMERIC(10,7);
ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS gps_longitude NUMERIC(10,7);
ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS gps_altitude NUMERIC(8,2);
ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS gps_speed NUMERIC(6,2);
`;

const MIGRATION_005 = `
-- Create dashboard layouts table for customizable dashboard
CREATE TABLE IF NOT EXISTS dashboard_layouts (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  layout_config JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_user_id ON dashboard_layouts(user_id);

-- Add trigger for updated_at
CREATE TRIGGER dashboard_layouts_updated_at
BEFORE UPDATE ON dashboard_layouts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
`;

const MIGRATION_006 = `
-- Add additional GPS columns to snapshots table
ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS gps_satellites INTEGER;
ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS gps_valid BOOLEAN;
ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS gps_datetime_fix TEXT;
`;

const MIGRATION_007 = `
-- Add WiFi signal and rate columns to snapshots table
ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS wifi_signal INTEGER;
ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS wifi_tx_rate TEXT;
ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS wifi_rx_rate TEXT;
`;

const MIGRATION_008 = `
-- Add WLAN real-time traffic speed columns to snapshots table
ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS wlan_speed_rx BIGINT;
ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS wlan_speed_tx BIGINT;
`;

const MIGRATION_009 = `
-- Simplify RBAC: Replace permissions array with is_admin boolean
-- This migration converts the existing permission-based system to a simple admin/user model

DO $$
BEGIN
  -- Add is_admin column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

    -- Convert existing users: anyone with 'admin_all' permission becomes admin
    UPDATE users SET is_admin = true WHERE 'admin_all' = ANY(permissions);

    -- Drop the permissions column
    ALTER TABLE users DROP COLUMN IF EXISTS permissions;

    -- Add index for is_admin
    CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);
  END IF;
END $$;
`;

const MIGRATION_010 = `
-- Create WiFi scan results table for storing discovered networks
CREATE TABLE IF NOT EXISTS wifi_scan_results (
  id SERIAL PRIMARY KEY,
  interface_name TEXT NOT NULL DEFAULT '',
  ssid TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  signal INTEGER NOT NULL DEFAULT -100,
  channel TEXT NOT NULL DEFAULT '',
  frequency INTEGER NOT NULL DEFAULT 0,
  security TEXT NOT NULL DEFAULT '',
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wifi_scan_scanned_at ON wifi_scan_results(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_wifi_scan_ssid ON wifi_scan_results(ssid);
CREATE INDEX IF NOT EXISTS idx_wifi_scan_address ON wifi_scan_results(address);
CREATE INDEX IF NOT EXISTS idx_wifi_scan_interface_name ON wifi_scan_results(interface_name);
`;

const MIGRATION_011 = `
-- Create VXLAN traffic usage log table for tracking data usage
-- This table stores daily snapshots of VXLAN interface traffic for SIM card data monitoring
CREATE TABLE IF NOT EXISTS vxlan_usage_log (
  id BIGSERIAL PRIMARY KEY,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rx_bytes BIGINT NOT NULL,
  tx_bytes BIGINT NOT NULL,
  total_bytes BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vxlan_usage_logged_at ON vxlan_usage_log(logged_at DESC);
`;

const MIGRATION_012 = `
-- Create monthly resets table to track when resets were performed
CREATE TABLE IF NOT EXISTS monthly_resets (
  id BIGSERIAL PRIMARY KEY,
  reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  prev_rx_bytes BIGINT,
  prev_tx_bytes BIGINT
);

CREATE INDEX IF NOT EXISTS idx_monthly_resets_year_month ON monthly_resets(year DESC, month DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_resets_unique ON monthly_resets(year, month);
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

    const migrations = [
      { name: '001_init', sql: MIGRATION_001 },
      { name: '002_gateway_and_interface', sql: MIGRATION_002 },
      { name: '003_public_ip', sql: MIGRATION_003 },
      { name: '004_gps_data', sql: MIGRATION_004 },
      { name: '005_dashboard_layouts', sql: MIGRATION_005 },
      { name: '006_gps_extended', sql: MIGRATION_006 },
      { name: '007_wifi_signal_rate', sql: MIGRATION_007 },
      { name: '008_wlan_traffic_speed', sql: MIGRATION_008 },
      { name: '009_simplify_rbac', sql: MIGRATION_009 },
      { name: '010_wifi_scan_results', sql: MIGRATION_010 },
      { name: '011_vxlan_usage_log', sql: MIGRATION_011 },
      { name: '012_monthly_resets', sql: MIGRATION_012 }
    ];

    for (const migration of migrations) {
      const result = await query('SELECT filename FROM migrations WHERE filename = $1', [migration.name]);

      if (result.rows.length > 0) {
        console.log(`Migration ${migration.name} already applied, skipping`);
        continue;
      }

      console.log(`Applying migration: ${migration.name}`);
      await query(migration.sql);

      await query('INSERT INTO migrations (filename) VALUES ($1)', [migration.name]);

      console.log(`Migration ${migration.name} applied successfully`);
    }
  } catch (err) {
    console.error('Migration failed:', err);
    throw err;
  }
}
