import { config } from './config.js';
import { query } from './db.js';
import * as mt from './mikrotik.js';
import { setLteCache } from './lteCache.js';
import { broadcast } from './websocket.js';

let lastSnapshot = null;
let pollerInterval = null;
let trafficPollerInterval = null;
let ltePingInterval = null;
let usageLogInterval = null;
let monthlyResetInterval = null;

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
    lte_connected: null,
    lte_carrier_aggregation: null,
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
    gps_datetime_fix: null,
    wlan5_ssid: null,
    wlan5_status: null,
    wlan5_authenticated_clients: null,
    wlan5_registered_clients: null,
    wlan5_noise_floor: null,
    wlan5_wmm_enabled: null,
    wlan5_tx_rate: null,
    wlan5_rx_rate: null,
    wlan5_running: null,
    wlan5_disabled: null,
    interfaces_data: null,
    sms_messages: null
  };

  try {
    // Execute ALL requests sequentially with delays to avoid session overload
    // MikroTik has max_session=900s limit, we spread requests to avoid hitting it
    const delay = config.polling.requestDelayMs;

    const route = await mt.getDefaultRoute();
    await new Promise(resolve => setTimeout(resolve, delay));

    const sysres = await mt.getSystemResource();
    await new Promise(resolve => setTimeout(resolve, delay));

    const interfaces = await mt.getInterfaces();
    await new Promise(resolve => setTimeout(resolve, delay));

    const lte = await mt.getLteStatus();
    await new Promise(resolve => setTimeout(resolve, delay));

    const wifi = await mt.getWifiStatus();
    await new Promise(resolve => setTimeout(resolve, delay));

    const wlan5Status = await mt.getWlan5Status();
    await new Promise(resolve => setTimeout(resolve, delay));

    const cloud = await mt.getCloudStatus();
    await new Promise(resolve => setTimeout(resolve, delay));

    const gps = await mt.getGpsStatus();
    await new Promise(resolve => setTimeout(resolve, delay));

    const smsInbox = await mt.getSmsInbox();

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
      } else if (route['gateway-status']) {
        activeInterface = route['gateway-status'];
      }

      if (activeInterface) {
        if (activeInterface === config.mikrotik.interfaces.lte) {
          snapshot.gateway_type = 'LTE';
        } else if (activeInterface === config.mikrotik.interfaces.wlan) {
          snapshot.gateway_type = 'WiFi';
        } else {
          snapshot.gateway_type = 'Unknown';
        }
      } else if (route.gateway) {
        if (route.gateway === config.mikrotik.interfaces.lte || route.gateway.includes('lte')) {
          snapshot.gateway_type = 'LTE';
          snapshot.active_uplink = config.mikrotik.interfaces.lte;
        } else if (route.gateway.includes('wlan') || route.gateway.includes('wifi')) {
          snapshot.gateway_type = 'WiFi';
        }
      }
    }

    if (lte) {
      snapshot.lte_operator = lte['current-operator'] || null;
      snapshot.lte_rsrp = lte.rsrp ? parseInt(lte.rsrp, 10) : null;
      snapshot.lte_rsrq = lte.rsrq ? parseInt(lte.rsrq, 10) : null;
      snapshot.lte_rssi = lte.rssi ? parseInt(lte.rssi, 10) : null;
      snapshot.lte_sinr = lte.sinr ? parseInt(lte.sinr, 10) : null;
      snapshot.lte_carrier_aggregation = lte['carrier-aggregation'] || false;
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
      snapshot.current_speed_interface = config.mikrotik.interfaces.vxlan;
      snapshot.current_speed_rx = null;
      snapshot.current_speed_tx = null;

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

    if (wlan5Status) {
      snapshot.wlan5_ssid = wlan5Status.ssid;
      snapshot.wlan5_status = wlan5Status.status;
      snapshot.wlan5_authenticated_clients = wlan5Status.authenticatedClients;
      snapshot.wlan5_registered_clients = wlan5Status.registeredClients;
      snapshot.wlan5_noise_floor = wlan5Status.noiseFloor;
      snapshot.wlan5_wmm_enabled = wlan5Status.wmmEnabled;
      snapshot.wlan5_tx_rate = wlan5Status.txRate;
      snapshot.wlan5_rx_rate = wlan5Status.rxRate;
      snapshot.wlan5_running = wlan5Status.running;
      snapshot.wlan5_disabled = wlan5Status.disabled;
    }

    // Store interface data without real-time traffic monitoring
    snapshot.interfaces_data = JSON.stringify(interfaces);

    snapshot.sms_messages = JSON.stringify(smsInbox || []);

    // Quick LTE connectivity check (no SSH) - only check interface status
    const lteIface = interfaces.find(iface => iface.name === config.mikrotik.interfaces.lte);
    const lteAddresses = await mt.mtFetch('/rest/ip/address');
    const lteAddress = lteAddresses.find(addr => addr.interface === config.mikrotik.interfaces.lte && addr.disabled !== 'true');

    // Consider connected if: interface UP + has IP address
    snapshot.lte_connected = !!(
      lteIface &&
      lteIface.running === 'true' &&
      lteIface.disabled !== 'true' &&
      lteAddress
    );

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

  broadcast('snapshot', snapshot);
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

async function checkLtePing() {
  try {
    console.log('[Poller] Running periodic LTE ping check...');
    const result = await mt.checkLteConnectivity();
    setLteCache(result, result);
    console.log('[Poller] LTE ping check result:', result);
    broadcast('lte_connectivity', { connected: result });
  } catch (err) {
    console.error('[Poller] LTE ping check error:', err.message);
    setLteCache(false, false);
    broadcast('lte_connectivity', { connected: false });
  }
}

async function logVxlanUsage() {
  try {
    console.log('[Poller] Accumulating VXLAN usage...');

    const latestSnapshot = await query(`
      SELECT vxlan_rx_bytes, vxlan_tx_bytes
      FROM snapshots
      ORDER BY snapshot_ts DESC
      LIMIT 1
    `);

    if (latestSnapshot.rows.length === 0) {
      console.log('[Poller] No snapshot data available');
      return;
    }

    const currentRx = parseInt(latestSnapshot.rows[0].vxlan_rx_bytes) || 0;
    const currentTx = parseInt(latestSnapshot.rows[0].vxlan_tx_bytes) || 0;

    const baseline = await query(`SELECT rx_bytes, tx_bytes FROM traffic_baseline WHERE id = 1`);

    if (baseline.rows.length === 0) {
      await query(`
        INSERT INTO traffic_baseline (id, rx_bytes, tx_bytes)
        VALUES (1, $1, $2)
      `, [currentRx, currentTx]);
      console.log('[Poller] Baseline initialized:', { currentRx, currentTx });
      return;
    }

    const baselineRx = parseInt(baseline.rows[0].rx_bytes) || 0;
    const baselineTx = parseInt(baseline.rows[0].tx_bytes) || 0;

    let deltaRx = currentRx - baselineRx;
    let deltaTx = currentTx - baselineTx;

    if (deltaRx < 0 || deltaTx < 0) {
      console.log('[Poller] Counter reset detected (reboot), using current as delta:', { currentRx, currentTx });
      deltaRx = currentRx;
      deltaTx = currentTx;
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const monthUsage = await query(`
      SELECT rx_bytes, tx_bytes FROM monthly_traffic_usage
      WHERE year = $1 AND month = $2
    `, [currentYear, currentMonth]);

    if (monthUsage.rows.length === 0) {
      await query(`
        INSERT INTO monthly_traffic_usage (year, month, rx_bytes, tx_bytes, total_bytes)
        VALUES ($1, $2, $3, $4, $5)
      `, [currentYear, currentMonth, deltaRx, deltaTx, deltaRx + deltaTx]);
    } else {
      const newRx = parseInt(monthUsage.rows[0].rx_bytes) + deltaRx;
      const newTx = parseInt(monthUsage.rows[0].tx_bytes) + deltaTx;

      await query(`
        UPDATE monthly_traffic_usage
        SET rx_bytes = $1, tx_bytes = $2, total_bytes = $3, updated_at = NOW()
        WHERE year = $4 AND month = $5
      `, [newRx, newTx, newRx + newTx, currentYear, currentMonth]);
    }

    await query(`
      UPDATE traffic_baseline
      SET rx_bytes = $1, tx_bytes = $2, updated_at = NOW()
      WHERE id = 1
    `, [currentRx, currentTx]);

    await query(`
      INSERT INTO vxlan_usage_log (rx_bytes, tx_bytes, total_bytes)
      VALUES ($1, $2, $3)
    `, [currentRx, currentTx, currentRx + currentTx]);

    console.log('[Poller] Usage accumulated:', {
      delta: { rx: deltaRx, tx: deltaTx },
      baseline: { rx: currentRx, tx: currentTx }
    });
  } catch (err) {
    console.error('[Poller] VXLAN usage logging error:', err.message);
  }
}

async function checkMonthlyReset() {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const currentDay = now.getDate();

    if (currentDay === 1) {
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

      const checkReset = await query(`
        SELECT id FROM monthly_resets WHERE year = $1 AND month = $2
      `, [prevYear, prevMonth]);

      if (checkReset.rows.length === 0) {
        console.log('[Poller] Performing monthly traffic reset...');

        const prevMonthUsage = await query(`
          SELECT rx_bytes, tx_bytes FROM monthly_traffic_usage
          WHERE year = $1 AND month = $2
        `, [prevYear, prevMonth]);

        const prevRxBytes = prevMonthUsage.rows.length > 0 ? parseInt(prevMonthUsage.rows[0].rx_bytes) : 0;
        const prevTxBytes = prevMonthUsage.rows.length > 0 ? parseInt(prevMonthUsage.rows[0].tx_bytes) : 0;

        await query(`
          INSERT INTO monthly_resets (month, year, prev_rx_bytes, prev_tx_bytes)
          VALUES ($1, $2, $3, $4)
        `, [prevMonth, prevYear, prevRxBytes, prevTxBytes]);

        await query(`
          INSERT INTO monthly_traffic_usage (year, month, rx_bytes, tx_bytes, total_bytes)
          VALUES ($1, $2, 0, 0, 0)
          ON CONFLICT (year, month) DO NOTHING
        `, [currentYear, currentMonth]);

        console.log('[Poller] Monthly traffic reset completed successfully');
      }
    }
  } catch (err) {
    console.error('[Poller] Monthly reset check error:', err.message);
  }
}

export function startPollers() {
  console.log('Starting pollers...');

  collectSnapshot();
  pollerInterval = setInterval(collectSnapshot, config.polling.summarySeconds * 1000);

  collectTraffic();
  trafficPollerInterval = setInterval(collectTraffic, 180 * 1000); // 3 min

  checkLtePing();
  ltePingInterval = setInterval(checkLtePing, 45 * 1000); // 45s

  logVxlanUsage();
  usageLogInterval = setInterval(logVxlanUsage, 3600 * 1000); // 1 hour

  checkMonthlyReset();
  monthlyResetInterval = setInterval(checkMonthlyReset, 300 * 1000); // 5 min

  console.log('Pollers started');
}

export function stopPollers() {
  if (pollerInterval) clearInterval(pollerInterval);
  if (trafficPollerInterval) clearInterval(trafficPollerInterval);
  if (ltePingInterval) clearInterval(ltePingInterval);
  if (usageLogInterval) clearInterval(usageLogInterval);
  if (monthlyResetInterval) clearInterval(monthlyResetInterval);
  console.log('Pollers stopped');
}
