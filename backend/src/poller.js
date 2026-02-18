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
    public_ip: null,
    lte_operator: null,
    lte_rsrp: null,
    lte_rsrq: null,
    lte_rssi: null,
    lte_sinr: null,
    wifi_ssid: null,
    wifi_status: null,
    wifi_signal: null,
    wifi_tx_rate: null,
    wifi_rx_rate: null,
    system_uptime: null,
    system_cpu_percent: null,
    system_ram_percent: null,
    current_speed_interface: null,
    current_speed_rx: null,
    current_speed_tx: null,
    vxlan_rx_bytes: null,
    vxlan_tx_bytes: null,
    gps_latitude: null,
    gps_longitude: null,
    gps_altitude: null,
    gps_speed: null,
    gps_satellites: null,
    gps_valid: null,
    gps_datetime_fix: null
  };

  try {
    const [route, lte, wifi, sysres, interfaces, cloud, gps] = await Promise.all([
      mt.getDefaultRoute(),
      mt.getLteStatus(),
      mt.getWifiStatus(),
      mt.getSystemResource(),
      mt.getInterfaces(),
      mt.getCloudStatus(),
      mt.getGpsStatus()
    ]);

    snapshot.online = true;
    snapshot.public_ip = cloud && cloud['public-address'] ? cloud['public-address'] : null;

    if (route) {
      if (route.gateway) {
        snapshot.active_uplink = route.gateway;
      }

      let activeInterface = null;
      if (route['immediate-gw'] && route['immediate-gw'].includes('%')) {
        activeInterface = route['immediate-gw'].split('%')[1];
      } else if (route.interface) {
        activeInterface = route.interface;
      }

      if (activeInterface) {
        if (activeInterface === config.mikrotik.interfaces.lte) {
          snapshot.gateway_type = 'LTE';
        } else if (activeInterface === config.mikrotik.interfaces.wlan) {
          snapshot.gateway_type = 'WiFi';
        } else {
          snapshot.gateway_type = 'Unknown';
        }
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
      snapshot.wifi_signal = wifi['signal-strength'] ? parseInt(wifi['signal-strength'], 10) : null;
      snapshot.wifi_tx_rate = wifi['tx-rate'] || null;
      snapshot.wifi_rx_rate = wifi['rx-rate'] || null;
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

    if (gps) {
      snapshot.gps_valid = gps.valid === 'yes' || gps.valid === 'true' || gps.valid === true;
      snapshot.gps_satellites = gps.satellites ? parseInt(gps.satellites, 10) : null;
      snapshot.gps_datetime_fix = gps['date-and-time'] || gps['date-time-fix'] || null;

      if (snapshot.gps_valid) {
        snapshot.gps_latitude = gps.latitude ? parseFloat(gps.latitude) : null;
        snapshot.gps_longitude = gps.longitude ? parseFloat(gps.longitude) : null;
        snapshot.gps_altitude = gps.altitude ? parseFloat(gps.altitude.replace(/\s*m$/, '')) : null;
        snapshot.gps_speed = gps.speed ? parseFloat(gps.speed.replace(/\s*km\/h$/, '')) : null;
      }
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
        active_uplink, gateway_type, public_ip, lte_operator, lte_rsrp, lte_rsrq, lte_rssi, lte_sinr,
        wifi_ssid, wifi_status, wifi_signal, wifi_tx_rate, wifi_rx_rate,
        system_uptime, system_cpu_percent, system_ram_percent,
        current_speed_interface, current_speed_rx, current_speed_tx,
        vxlan_rx_bytes, vxlan_tx_bytes,
        gps_latitude, gps_longitude, gps_altitude, gps_speed, gps_satellites, gps_valid, gps_datetime_fix
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32)
    `, [
      snapshot.snapshot_ts, snapshot.online, snapshot.stale, snapshot.error,
      snapshot.active_uplink, snapshot.gateway_type, snapshot.public_ip, snapshot.lte_operator, snapshot.lte_rsrp, snapshot.lte_rsrq,
      snapshot.lte_rssi, snapshot.lte_sinr, snapshot.wifi_ssid, snapshot.wifi_status, snapshot.wifi_signal, snapshot.wifi_tx_rate, snapshot.wifi_rx_rate,
      snapshot.system_uptime, snapshot.system_cpu_percent, snapshot.system_ram_percent,
      snapshot.current_speed_interface, snapshot.current_speed_rx, snapshot.current_speed_tx,
      snapshot.vxlan_rx_bytes, snapshot.vxlan_tx_bytes,
      snapshot.gps_latitude, snapshot.gps_longitude, snapshot.gps_altitude, snapshot.gps_speed, snapshot.gps_satellites, snapshot.gps_valid, snapshot.gps_datetime_fix
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
  let totalSeconds = 0;

  const weekMatch = duration.match(/(\d+)w/);
  if (weekMatch) totalSeconds += parseInt(weekMatch[1], 10) * 7 * 24 * 3600;

  const dayMatch = duration.match(/(\d+)d/);
  if (dayMatch) totalSeconds += parseInt(dayMatch[1], 10) * 24 * 3600;

  const hourMatch = duration.match(/(\d+)h/);
  if (hourMatch) totalSeconds += parseInt(hourMatch[1], 10) * 3600;

  const minuteMatch = duration.match(/(\d+)m/);
  if (minuteMatch) totalSeconds += parseInt(minuteMatch[1], 10) * 60;

  const secondMatch = duration.match(/(\d+)s/);
  if (secondMatch) totalSeconds += parseInt(secondMatch[1], 10);

  const colonMatch = duration.match(/(\d+):(\d+):(\d+)/);
  if (colonMatch) {
    totalSeconds += parseInt(colonMatch[1], 10) * 3600;
    totalSeconds += parseInt(colonMatch[2], 10) * 60;
    totalSeconds += parseInt(colonMatch[3], 10);
  }

  return totalSeconds > 0 ? totalSeconds : null;
}

function parseLogTime(timeStr) {
  return new Date();
}

export function startPollers() {
  console.log('Starting pollers...');

  collectSnapshot();
  pollerInterval = setInterval(collectSnapshot, config.polling.summarySeconds * 1000);

  collectLogs();
  logPollerInterval = setInterval(collectLogs, 120 * 1000);

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
