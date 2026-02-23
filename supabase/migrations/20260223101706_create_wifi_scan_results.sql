/*
  # Create WiFi Scan Results Table

  1. New Tables
    - `wifi_scan_results`
      - `id` (serial, primary key) - Unique identifier for each scan result
      - `ssid` (text) - Network name (SSID)
      - `address` (text) - MAC address of the access point
      - `signal` (integer) - Signal strength in dBm
      - `channel` (text) - WiFi channel information
      - `frequency` (integer) - Frequency in MHz
      - `security` (text) - Security type (WPA2, WPA3, etc.)
      - `scanned_at` (timestamptz) - Timestamp when the network was detected
      - `created_at` (timestamptz) - Record creation timestamp

  2. Indexes
    - Index on `scanned_at` for efficient time-based queries
    - Index on `ssid` for searching by network name

  3. Security
    - Enable RLS on `wifi_scan_results` table
    - Add policy for authenticated users to read scan results
    - Add policy for authenticated users to insert scan results (for backend service)

  ## Notes
  - Signal strength is stored as negative integer (e.g., -60 for -60 dBm)
  - Multiple scans of the same network create separate records for historical tracking
  - No unique constraints as we want to track the same network over time
*/

-- Create wifi_scan_results table
CREATE TABLE IF NOT EXISTS wifi_scan_results (
  id SERIAL PRIMARY KEY,
  ssid TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  signal INTEGER NOT NULL DEFAULT -100,
  channel TEXT NOT NULL DEFAULT '',
  frequency INTEGER NOT NULL DEFAULT 0,
  security TEXT NOT NULL DEFAULT '',
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_wifi_scan_scanned_at ON wifi_scan_results(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_wifi_scan_ssid ON wifi_scan_results(ssid);
CREATE INDEX IF NOT EXISTS idx_wifi_scan_address ON wifi_scan_results(address);

-- Enable Row Level Security
ALTER TABLE wifi_scan_results ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all scan results
CREATE POLICY "Authenticated users can read WiFi scan results"
  ON wifi_scan_results
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert scan results (for backend service)
CREATE POLICY "Authenticated users can insert WiFi scan results"
  ON wifi_scan_results
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can delete old scan results (for cleanup)
CREATE POLICY "Authenticated users can delete WiFi scan results"
  ON wifi_scan_results
  FOR DELETE
  TO authenticated
  USING (true);