/*
  # WiFi Scan Results Storage

  1. New Tables
    - `wifi_scan_results`
      - `id` (uuid, primary key)
      - `interface_name` (text) - The interface that was scanned (wlan2.4 or wlan5)
      - `ssid` (text) - Network name
      - `address` (text) - MAC address (BSSID)
      - `signal` (integer) - Signal strength in dBm
      - `channel` (text) - WiFi channel
      - `frequency` (integer) - Frequency in MHz
      - `security` (text) - Security protocol
      - `scanned_at` (timestamptz) - When the scan was performed
      - `created_at` (timestamptz) - When the record was created

  2. Indexes
    - Index on `interface_name` for fast filtering
    - Index on `scanned_at` for time-based queries

  3. Security
    - Enable RLS on `wifi_scan_results` table
    - Add policy for authenticated users to read scan results
    - Add policy for authenticated users to insert scan results

  4. Notes
    - Scan results are kept for historical reference
    - Frontend will show only the most recent scan per interface
*/

CREATE TABLE IF NOT EXISTS wifi_scan_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interface_name text NOT NULL,
  ssid text NOT NULL DEFAULT '',
  address text NOT NULL,
  signal integer NOT NULL DEFAULT -100,
  channel text DEFAULT '',
  frequency integer DEFAULT 0,
  security text DEFAULT '',
  scanned_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wifi_scan_interface ON wifi_scan_results(interface_name);
CREATE INDEX IF NOT EXISTS idx_wifi_scan_scanned_at ON wifi_scan_results(scanned_at DESC);

ALTER TABLE wifi_scan_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read scan results"
  ON wifi_scan_results
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert scan results"
  ON wifi_scan_results
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
