export interface User {
  id: string;
  username: string;
  permissions: string[];
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
  lte_rsrp?: number;
  lte_rsrq?: number;
  lte_rssi?: number;
  lte_sinr?: number;
  wifi_ssid?: string;
  wifi_status?: string;
  system_uptime?: number;
  system_cpu_percent?: number;
  system_ram_percent?: number;
  current_speed_interface?: string;
  current_speed_rx?: number;
  current_speed_tx?: number;
  vxlan_rx_bytes?: number;
  vxlan_tx_bytes?: number;
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
  'signal-strength': number;
  frequency: string;
  channel: string;
  security: string;
}
