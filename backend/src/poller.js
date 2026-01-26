import { config } from './config.js';
import { query } from './db.js';
import * as mt from './mikrotik.js';

let lastSnapshot = null;
let pollerInterval = null;
let logPollerInterval = null;
let trafficPollerInterval = null;

export function getLastSnapshot() {
  return lastSnapshot;
}

async function collectSnapshot() {
  const startTime = Date.now();
  const snapshot = {
    snapshot_ts: new Date(),
    online: false,
    stale: false,
    error: null,
    active_uplink: null,
    gateway_type: null,
    lte_operator: null,
    lte_rsrp: null,
    lte_rsrq: null,
    lte_rssi: null,
    lte_sinr: null,
    wifi_ssid: null,
    wifi_status: null,
    system_uptime: null,
    system_cpu_percent: null,
    system_ram_percent: null,
    current_speed_interface: null,
    current_speed_rx: null,
    current_speed_tx: null,
    vxlan_rx_bytes: null,
    vxlan_tx_bytes: null
  };

  try {
    const [route, lte, wifi, sysres, interfaces] = await Promise.all([
      mt.getDefaultRoute(),
      mt.getLteStatus(),
      mt.getWifiStatus(),
      mt.getSystemResource(),
      mt.getInterfaces()
    ]);

    snapshot.online = true;

    if (route && route.gateway) {
      snapshot.active_uplink = route.gateway;

      if (route['gateway-status'] && route['gateway-status'].includes(config.mikrotik.interfaces.lte)) {
        snapshot.gateway_type = 'LTE';
      } else if (route['gateway-status'] && route['gateway-status'].includes(config.mikrotik.interfaces.wlan)) {
        snapshot.gateway_type = 'WiFi';
      } else {
        snapshot.gateway_type = 'Unknown';
      }
    }

    if (lte) {
      snapshot.lte_operator = lte['current-operator'] || null;
      snapshot.lte_rsrp = lte.rsrp ? parseInt(lte.rsrp, 10) : null;
      snapshot.lte_rsrq = lte.rsrq ? parseInt(lte.rsrq, 10) : null;
      snapshot.lte_rssi = lte.rssi ? parseInt(lte.rssi, 10) : null;
      snapshot.lte_sinr = lte.sinr ? parseInt(lte.sinr, 10) : null;
    }

    if (wifi) {
      snapshot.wifi_ssid = wifi.ssid || null;
      snapshot.wifi_status = wifi.status || null;
    }

    if (sysres) {
      snapshot.system_uptime = sysres.uptime ? parseDuration(sysres.uptime) : null;
      snapshot.system_cpu_percent = sysres['cpu-load'] || null;

      if (sysres['total-memory'] && sysres['free-memory']) {
        const used = sysres['total-memory'] - sysres['free-memory'];
        snapshot.system_ram_percent = ((used / sysres['total-memory']) * 100).toFixed(2);
      }
    }

    const vxlanIface = interfaces.find(iface => iface.name === config.mikrotik.interfaces.vxlan);
    if (vxlanIface) {
      const traffic = await mt.monitorTraffic(config.mikrotik.interfaces.vxlan);
      if (traffic) {
        snapshot.current_speed_interface = config.mikrotik.interfaces.vxlan;
        snapshot.current_speed_rx = traffic['rx-bits-per-second'] ? Math.floor(traffic['rx-bits-per-second'] / 8) : null;
        snapshot.current_speed_tx = traffic['tx-bits-per-second'] ? Math.floor(traffic['tx-bits-per-second'] / 8) : null;
      }

      snapshot.vxlan_rx_bytes = vxlanIface['rx-byte'] || null;
      snapshot.vxlan_tx_bytes = vxlanIface['tx-byte'] || null;
    }

    const elapsed = Date.now() - startTime;
    snapshot.stale = elapsed > (config.polling.staleSeconds * 1000);

  } catch (err) {
    snapshot.online = false;
    snapshot.error = err.message;
    console.error('Snapshot collection error:', err.message);
  }

  lastSnapshot = snapshot;

  try {
    await query(`
      INSERT INTO snapshots (
        snapshot_ts, online, stale, error,
        active_uplink, gateway_type, lte_operator, lte_rsrp, lte_rsrq, lte_rssi, lte_sinr,
        wifi_ssid, wifi_status,
        system_uptime, system_cpu_percent, system_ram_percent,
        current_speed_interface, current_speed_rx, current_speed_tx,
        vxlan_rx_bytes, vxlan_tx_bytes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
    `, [
      snapshot.snapshot_ts, snapshot.online, snapshot.stale, snapshot.error,
      snapshot.active_uplink, snapshot.gateway_type, snapshot.lte_operator, snapshot.lte_rsrp, snapshot.lte_rsrq,
      snapshot.lte_rssi, snapshot.lte_sinr, snapshot.wifi_ssid, snapshot.wifi_status,
      snapshot.system_uptime, snapshot.system_cpu_percent, snapshot.system_ram_percent,
      snapshot.current_speed_interface, snapshot.current_speed_rx, snapshot.current_speed_tx,
      snapshot.vxlan_rx_bytes, snapshot.vxlan_tx_bytes
    ]);
  } catch (err) {
    console.error('Failed to save snapshot to database:', err.message);
  }
}

async function collectLogs() {
  try {
    const logs = await mt.getLogs();

    for (const log of logs) {
      const logTime = log.time ? parseLogTime(log.time) : new Date();
      const topics = log.topics || '';
      const message = log.message || '';
      const category = mt.categorizeLog(topics, message);
      const severity = mt.getSeverity(topics);

      try {
        await query(`
          INSERT INTO logs (log_time, topics, message, category, severity)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT DO NOTHING
        `, [logTime, topics, message, category, severity]);
      } catch (err) {
      }
    }
  } catch (err) {
    console.error('Log collection error:', err.message);
  }
}

async function collectTraffic() {
  try {
    const interfaces = await mt.getInterfaces();
    const vxlanIface = interfaces.find(iface => iface.name === config.mikrotik.interfaces.vxlan);

    if (vxlanIface) {
      await query(`
        INSERT INTO traffic_history (interface_name, rx_bytes, tx_bytes)
        VALUES ($1, $2, $3)
      `, [
        config.mikrotik.interfaces.vxlan,
        vxlanIface['rx-byte'] || 0,
        vxlanIface['tx-byte'] || 0
      ]);
    }
  } catch (err) {
    console.error('Traffic collection error:', err.message);
  }
}

function parseDuration(duration) {
  const parts = duration.match(/(\d+)w(\d+)d(\d+):(\d+):(\d+)/);
  if (!parts) return null;

  const weeks = parseInt(parts[1], 10);
  const days = parseInt(parts[2], 10);
  const hours = parseInt(parts[3], 10);
  const minutes = parseInt(parts[4], 10);
  const seconds = parseInt(parts[5], 10);

  return (weeks * 7 * 24 * 3600) + (days * 24 * 3600) + (hours * 3600) + (minutes * 60) + seconds;
}

function parseLogTime(timeStr) {
  return new Date();
}

export function startPollers() {
  console.log('Starting pollers...');

  collectSnapshot();
  pollerInterval = setInterval(collectSnapshot, config.polling.summarySeconds * 1000);

  collectLogs();
  logPollerInterval = setInterval(collectLogs, 60 * 1000);

  collectTraffic();
  trafficPollerInterval = setInterval(collectTraffic, 300 * 1000);

  console.log('Pollers started');
}

export function stopPollers() {
  if (pollerInterval) clearInterval(pollerInterval);
  if (logPollerInterval) clearInterval(logPollerInterval);
  if (trafficPollerInterval) clearInterval(trafficPollerInterval);
  console.log('Pollers stopped');
}
