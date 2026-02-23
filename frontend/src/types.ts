export interface User {
  id: string;
  username: string;
  is_admin: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Snapshot {
  snapshot_ts: string;
  online: boolean;
  stale: boolean;
  error?: string;
  active_uplink?: string;
  gateway_type?: string;
  public_ip?: string;
  lte_operator?: string;
  lte_rsrp?: number | string | null;
  lte_rsrq?: number | string | null;
  lte_rssi?: number | string | null;
  lte_sinr?: number | string | null;
  wifi_ssid?: string;
  wifi_status?: string;
  wifi_signal?: number | string | null;
  wifi_tx_rate?: string;
  wifi_rx_rate?: string;
  wlan_speed_rx?: number | string | null;
  wlan_speed_tx?: number | string | null;
  system_uptime?: number | string | null;
  system_cpu_percent?: number | string | null;
  system_ram_percent?: number | string | null;
  current_speed_interface?: string;
  current_speed_rx?: number | string | null;
  current_speed_tx?: number | string | null;
  vxlan_rx_bytes?: number | string | null;
  vxlan_tx_bytes?: number | string | null;
  gps_latitude?: number | string | null;
  gps_longitude?: number | string | null;
  gps_altitude?: number | string | null;
  gps_speed?: number | string | null;
  gps_satellites?: number | string | null;
  gps_valid?: boolean;
  gps_datetime_fix?: string;
}

export interface Log {
  id: number;
  log_time: string;
  topics: string;
  message: string;
  category: string;
  severity: string;
  created_at: string;
}

export interface TrafficData {
  history: Array<{
    time_bucket: string;
    interface_name: string;
    rx_bytes_delta: number;
    tx_bytes_delta: number;
  }>;
  totals: {
    total_rx: number;
    total_tx: number;
  };
}

export interface SmsMessage {
  '.id': string;
  phone: string;
  message: string;
  timestamp: string;
  type: string;
}

export interface WiFiNetwork {
  ssid: string;
  address: string;
  signal: number;
  frequency: number;
  channel: string;
  security: string;
}
