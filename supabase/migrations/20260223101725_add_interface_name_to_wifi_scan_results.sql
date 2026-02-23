/*
  # Add interface_name Column to WiFi Scan Results

  1. Changes
    - Add `interface_name` column to `wifi_scan_results` table
    - This column stores which wireless interface was used for the scan (e.g., 'wlan2.4', 'wlan5')
    - Default value is empty string for backwards compatibility
    - Add index on interface_name for efficient filtering

  ## Notes
  - This allows tracking which interface performed each scan
  - Important for systems with multiple wireless interfaces
  - The query in wifi.js filters by this column to show interface-specific results
*/

-- Add interface_name column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wifi_scan_results' AND column_name = 'interface_name'
  ) THEN
    ALTER TABLE wifi_scan_results ADD COLUMN interface_name TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

-- Create index for better query performance when filtering by interface
CREATE INDEX IF NOT EXISTS idx_wifi_scan_interface_name ON wifi_scan_results(interface_name);