import fetch from 'node-fetch';
import https from 'https';
import tls from 'tls';
import { Client } from 'ssh2';
import { config } from './config.js';

const authHeader = 'Basic ' + Buffer.from(
  `${config.mikrotik.user}:${config.mikrotik.pass}`
).toString('base64');

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 5,
  maxFreeSockets: 2,
  timeout: 10000,
  scheduling: 'fifo',
  checkServerIdentity: (hostname, cert) => {
    return undefined;
  }
});

export async function mtFetch(path, options = {}) {
  const url = `${config.mikrotik.baseUrl}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.polling.requestTimeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      agent: httpsAgent,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        ...options.headers
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`MikroTik API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error('MikroTik request timeout');
    }
    throw err;
  }
}

export async function getDefaultRoute() {
  try {
    const routes = await mtFetch('/rest/ip/route?dst-address=0.0.0.0/0&active=true');
    return routes[0] || null;
  } catch (err) {
    console.error('Failed to get default route:', err.message);
    return null;
  }
}

export async function getCloudStatus() {
  try {
    const result = await mtFetch('/rest/ip/cloud');
    // Result can be either an object or an array
    if (Array.isArray(result)) {
      return result[0] || null;
    }
    return result || null;
  } catch (err) {
    console.error('Failed to get cloud status:', err.message);
    return null;
  }
}

export async function getLteStatus() {
  try {
    const result = await mtFetch('/rest/interface/lte/monitor', {
      method: 'POST',
      body: JSON.stringify({ numbers: config.mikrotik.interfaces.lte, once: true })
    });
    return result[0] || null;
  } catch (err) {
    console.error('Failed to get LTE status:', err.message);
    return null;
  }
}

export async function getWifiStatus() {
  try {
    const result = await mtFetch('/rest/interface/wireless/monitor', {
      method: 'POST',
      body: JSON.stringify({ numbers: config.mikrotik.interfaces.wlan, once: true })
    });
    return result[0] || null;
  } catch (err) {
    console.error('Failed to get WiFi status:', err.message);
    return null;
  }
}

export async function getSystemResource() {
  try {
    return await mtFetch('/rest/system/resource');
  } catch (err) {
    console.error('Failed to get system resource:', err.message);
    return null;
  }
}

export async function getInterfaces() {
  try {
    return await mtFetch('/rest/interface');
  } catch (err) {
    console.error('Failed to get interfaces:', err.message);
    return [];
  }
}

export async function monitorTraffic(interfaceName) {
  try {
    const result = await mtFetch('/rest/interface/monitor-traffic', {
      method: 'POST',
      body: JSON.stringify({ interface: interfaceName, once: true })
    });
    return result[0] || null;
  } catch (err) {
    console.error(`Failed to monitor traffic for ${interfaceName}:`, err.message);
    return null;
  }
}

export async function getLogs() {
  try {
    return await mtFetch('/rest/log');
  } catch (err) {
    console.error('Failed to get logs:', err.message);
    return [];
  }
}

export async function ping(address, count = 4, sourceInterface = null) {
  const controller = new AbortController();
  const pingTimeout = 15000;
  const timeout = setTimeout(() => controller.abort(), pingTimeout);

  try {
    const body = { address, count: count.toString() };
    if (sourceInterface) {
      body.interface = sourceInterface;
      console.log(`[PING] Using source interface: ${sourceInterface}`);
    }

    console.log(`[PING] Request: ${JSON.stringify(body)}`);

    const url = `${config.mikrotik.baseUrl}/rest/ping`;
    const dedicatedAgent = new https.Agent({
      rejectUnauthorized: false,
      keepAlive: false
    });

    const response = await fetch(url, {
      method: 'POST',
      agent: dedicatedAgent,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`MikroTik API error: ${response.status} ${response.statusText}`);
    }

    const results = await response.json();

    const parsed = results.map((result, index) => {
      const timeMatch = result.time?.match(/(\d+)ms/) || result['avg-rtt']?.match(/(\d+)ms/);
      const time = timeMatch ? parseInt(timeMatch[1]) : null;
      const timeout = result.timeout === 'true' || result.status === 'timeout';

      return {
        seq: index + 1,
        time: timeout ? null : time,
        timeout: timeout,
        host: result.host || address
      };
    });

    return { pings: parsed };
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error('Ping request timeout after 8 seconds');
    }
    console.error('Failed to ping:', err.message);
    throw err;
  }
}

export async function rebootSystem() {
  try {
    await mtFetch('/rest/system/reboot', {
      method: 'POST',
      body: JSON.stringify({})
    });
    return { success: true };
  } catch (err) {
    console.error('Failed to reboot:', err.message);
    throw err;
  }
}

export async function getSmsInbox() {
  try {
    return await mtFetch('/rest/tool/sms/inbox');
  } catch (err) {
    console.error('Failed to get SMS inbox:', err.message);
    return [];
  }
}

export async function deleteSms(smsId) {
  try {
    await mtFetch('/rest/tool/sms/inbox/remove', {
      method: 'POST',
      body: JSON.stringify({ '.id': smsId })
    });
    return { success: true };
  } catch (err) {
    console.error('Failed to delete SMS:', err.message);
    throw err;
  }
}

export async function sendSms(phoneNumber, message, port = 'lte1') {
  try {
    const result = await mtFetch('/rest/tool/sms/send', {
      method: 'POST',
      body: JSON.stringify({
        'port': port,
        'phone-number': phoneNumber,
        'message': message
      })
    });
    return result;
  } catch (err) {
    console.error('Failed to send SMS:', err.message);
    throw err;
  }
}

export async function getWirelessRegistrationTable(interfaceName) {
  try {
    const clients = await mtFetch(`/rest/interface/wireless/registration-table?interface=${interfaceName}`);

    const interfaces = await mtFetch('/rest/interface/wireless');
    const targetInterface = interfaces.find(iface => iface.name === interfaceName);
    const ssid = targetInterface?.ssid || 'N/A';

    // Fetch DHCP leases to get IP and hostname
    let dhcpLeases = [];
    try {
      dhcpLeases = await mtFetch('/rest/ip/dhcp-server/lease');
    } catch (err) {
      console.warn('Failed to fetch DHCP leases:', err.message);
    }

    return clients.map(client => {
      const macAddress = client['mac-address'];

      // Find matching DHCP lease by MAC address
      const lease = dhcpLeases.find(l =>
        l['mac-address'] && l['mac-address'].toLowerCase() === macAddress.toLowerCase()
      );

      return {
        ...client,
        ssid: ssid,
        address: lease?.address || client.address || undefined,
        comment: lease?.['host-name'] || client.comment || undefined
      };
    });
  } catch (err) {
    console.error('Failed to get registration table:', err.message);
    return [];
  }
}

export async function disconnectWirelessClient(clientId) {
  try {
    await mtFetch(`/rest/interface/wireless/registration-table/${clientId}`, {
      method: 'DELETE'
    });
    return { success: true };
  } catch (err) {
    console.error('Failed to disconnect client:', err.message);
    throw err;
  }
}

function executeSSHCommand(command) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let output = '';

    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }

        stream.on('close', () => {
          conn.end();
          resolve(output);
        }).on('data', (data) => {
          output += data.toString();
        }).stderr.on('data', (data) => {
          console.error('SSH stderr:', data.toString());
        });
      });
    }).on('error', (err) => {
      reject(err);
    }).connect({
      host: config.mikrotik.host,
      port: config.mikrotik.sshPort || 22,
      username: config.mikrotik.user,
      password: config.mikrotik.pass
    });
  });
}

export async function checkLteConnectivity() {
  try {
    const lteInterface = config.mikrotik.interfaces.lte;
    console.log('[checkLteConnectivity] Checking LTE interface:', lteInterface);

    // Step 1: Check interface status via REST API
    const interfaces = await mtFetch('/rest/interface');
    const lteIface = interfaces.find(iface => iface.name === lteInterface);

    if (!lteIface) {
      console.log('[checkLteConnectivity] ❌ Step 1 FAILED: LTE interface not found');
      return false;
    }

    console.log('[checkLteConnectivity] Step 1 - Interface status:', {
      running: lteIface.running,
      disabled: lteIface.disabled
    });

    // Check if interface is running and not disabled
    const isUp = lteIface.running === 'true' && lteIface.disabled !== 'true';
    if (!isUp) {
      console.log('[checkLteConnectivity] ❌ Step 1 FAILED: LTE interface is not running or is disabled');
      return false;
    }
    console.log('[checkLteConnectivity] ✅ Step 1 PASSED: Interface is UP');

    // Step 2: Check if interface has IP address
    const addresses = await mtFetch('/rest/ip/address');
    const lteAddress = addresses.find(addr => addr.interface === lteInterface && addr.disabled !== 'true');

    if (!lteAddress) {
      console.log('[checkLteConnectivity] ❌ Step 2 FAILED: LTE interface has no IP address');
      return false;
    }

    console.log('[checkLteConnectivity] ✅ Step 2 PASSED: LTE has IP:', lteAddress.address);

    // Step 3: Try to ping 8.8.8.8 to verify connectivity (6 packets minimum)
    const command = `/ping 8.8.8.8 count=6 interface=${lteInterface}`;
    console.log('[checkLteConnectivity] Step 3 - Running ping:', command);
    const output = await executeSSHCommand(command);
    console.log('[checkLteConnectivity] Ping output:', output);

    // Parse packet loss
    const lossMatch = output.match(/packet-loss=(\d+)%/);
    if (!lossMatch) {
      console.log('[checkLteConnectivity] ❌ Step 3 FAILED: Could not parse ping result');
      return false;
    }

    const packetLoss = parseInt(lossMatch[1], 10);

    // Parse sent and received packets
    const sentMatch = output.match(/sent=(\d+)/);
    const receivedMatch = output.match(/received=(\d+)/);

    const sent = sentMatch ? parseInt(sentMatch[1], 10) : 0;
    const received = receivedMatch ? parseInt(receivedMatch[1], 10) : 0;

    console.log(`[checkLteConnectivity] Ping stats: sent=${sent}, received=${received}, loss=${packetLoss}%`);

    // STRICT CHECK: Require at least 50% successful pings (3/6 packets)
    // This ensures not just interface UP, but actual working internet connection
    const isConnected = sent >= 6 && received >= 3 && packetLoss <= 50;

    if (isConnected) {
      console.log(`[checkLteConnectivity] ✅ Step 3 PASSED: ${received}/${sent} packets successful (${packetLoss}% loss)`);
      console.log('[checkLteConnectivity] 🎉 ALL CHECKS PASSED - LTE is fully connected');
    } else {
      console.log(`[checkLteConnectivity] ❌ Step 3 FAILED: Only ${received}/${sent} packets successful (${packetLoss}% loss)`);
      console.log('[checkLteConnectivity] ❌ Internet connection not working - možno je, da na kartici ni dobroimetja!');
    }

    return isConnected;
  } catch (err) {
    console.error('[checkLteConnectivity] ❌ EXCEPTION:', err.message);
    return false;
  }
}

export async function scanWifi(interfaceName, db, force = false) {
  try {
    if (!force) {
      const lteConnected = await checkLteConnectivity();
      if (!lteConnected) {
        throw new Error('LTE povezava ni stabilna (ping ne dela). Možni vzroki: ni dobroimetja na SIM kartici, slab signal, ali težave z operaterjem. Uporabite "Force scan" če imate fizični dostop do naprave.');
      }
    }

    const command = `/interface wireless scan ${interfaceName} duration=5`;
    console.log('[WiFi Scan] Executing command:', command);
    const output = await executeSSHCommand(command);
    console.log('[WiFi Scan] Raw output:', output);
    console.log('[WiFi Scan] Output length:', output.length);

    const lines = output.split('\n').filter(line => line.trim());
    console.log('[WiFi Scan] Parsed lines count:', lines.length);
    const networks = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      console.log('[WiFi Scan] Processing line', i, ':', line);

      if (line.match(/^\d+/)) {
        const parts = line.split(/\s+/);
        console.log('[WiFi Scan] Line matched pattern, parts:', parts);

        let ssidIndex = -1;
        for (let j = 0; j < parts.length; j++) {
          if (parts[j].includes(':') && parts[j].match(/^[0-9A-F]{2}:/i)) {
            ssidIndex = j + 1;
            break;
          }
        }

        if (ssidIndex > 0 && ssidIndex < parts.length) {
          const address = parts[ssidIndex - 1];
          const ssid = parts.slice(ssidIndex).join(' ');

          let signalStr = '';
          for (const part of parts) {
            if (part.includes('dBm') || part.startsWith('-')) {
              signalStr = part.replace('dBm', '');
              break;
            }
          }

          const signal = parseInt(signalStr) || -100;

          console.log('[WiFi Scan] Found network:', { ssid, address, signal });

          if (ssid && ssid !== '' && address) {
            networks.push({
              ssid: ssid,
              address: address,
              signal: signal,
              channel: '',
              frequency: 0,
              security: ''
            });
          }
        }
      }
    }

    console.log('[WiFi Scan] Total networks found:', networks.length);

    const grouped = networks.reduce((acc, network) => {
      const addr = network.address;
      if (!acc[addr] || network.signal > acc[addr].signal) {
        acc[addr] = network;
      }
      return acc;
    }, {});

    const result = Object.values(grouped);
    result.sort((a, b) => b.signal - a.signal);

    const scannedAt = new Date().toISOString();
    for (const network of result) {
      await db.query(
        `INSERT INTO wifi_scan_results (interface_name, ssid, address, signal, channel, frequency, security, scanned_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [interfaceName, network.ssid, network.address, network.signal, network.channel, network.frequency, network.security, scannedAt]
      );
    }

    return result;
  } catch (err) {
    console.error('Failed to scan WiFi:', err.message, err.stack);
    throw err;
  }
}

export async function getWlan5Status() {
  try {
    const monitorResult = await mtFetch('/rest/interface/wireless/monitor', {
      method: 'POST',
      body: JSON.stringify({
        numbers: 'wlan5',
        once: 'true'
      })
    });

    const monitor = monitorResult[0] || {};

    // Get interface details for running/disabled status and SSID
    const interfaces = await mtFetch('/rest/interface/wireless');
    const wlan5Interface = interfaces.find(iface => iface.name === 'wlan5');

    // Get SSID from interface if monitor doesn't have it
    const ssid = (monitor.ssid && monitor.ssid.trim() !== '')
      ? monitor.ssid
      : (wlan5Interface?.ssid && wlan5Interface.ssid.trim() !== '')
        ? wlan5Interface.ssid
        : 'N/A';

    // Get real-time traffic
    let txRate = 'N/A';
    let rxRate = 'N/A';

    const traffic = await monitorTraffic('wlan5');
    if (traffic) {
      const rxBps = traffic['rx-bits-per-second'] || 0;
      const txBps = traffic['tx-bits-per-second'] || 0;

      // Format speeds: if < 1 Mbps, show in Kbps
      if (rxBps < 1000000) {
        rxRate = `${(rxBps / 1000).toFixed(0)} Kbps`;
      } else {
        rxRate = `${(rxBps / 1000000).toFixed(2)} Mbps`;
      }

      if (txBps < 1000000) {
        txRate = `${(txBps / 1000).toFixed(0)} Kbps`;
      } else {
        txRate = `${(txBps / 1000000).toFixed(2)} Mbps`;
      }
    }

    return {
      status: monitor.status || 'N/A',
      ssid: ssid,
      authenticatedClients: parseInt(monitor['authenticated-clients'] || '0'),
      registeredClients: parseInt(monitor['registered-clients'] || '0'),
      noiseFloor: monitor['noise-floor'] || 'N/A',
      wmmEnabled: monitor['wmm-enabled'] === 'true',
      txRate,
      rxRate,
      running: wlan5Interface?.running || 'false',
      disabled: wlan5Interface?.disabled || 'true'
    };
  } catch (err) {
    console.error('Failed to get WLAN 5 status:', err.message);
    return null;
  }
}

export async function getWlan24Status() {
  try {
    const monitorResult = await mtFetch('/rest/interface/wireless/monitor', {
      method: 'POST',
      body: JSON.stringify({
        numbers: 'wlan2.4',
        once: 'true'
      })
    });

    const monitor = monitorResult[0] || {};

    // Get interface details for running/disabled status
    const wlan24Interfaces = await mtFetch('/rest/interface/wireless?name=wlan2.4');
    const wlan24Interface = wlan24Interfaces?.[0];

    // Format rate helper (e.g., "300kbps" → "300 Kbps", "48.5Mbps" → "48.5 Mbps")
    const formatRate = (rate) => {
      if (!rate || rate === 'N/A') return 'N/A';
      const match = rate.match(/^([\d.]+)(k|M)bps$/i);
      if (!match) return rate;
      const value = match[1];
      const unit = match[2].toLowerCase() === 'k' ? 'Kbps' : 'Mbps';
      return `${value} ${unit}`;
    };

    return {
      status: monitor.status || 'N/A',
      ssid: monitor.ssid && monitor.ssid.trim() !== '' ? monitor.ssid : 'N/A',
      signalStrength: monitor['signal-strength'] || 'N/A',
      txRate: formatRate(monitor['tx-rate']),
      rxRate: formatRate(monitor['rx-rate']),
      running: wlan24Interface?.running || 'false',
      disabled: wlan24Interface?.disabled || 'true'
    };
  } catch (err) {
    console.error('Failed to get WLAN 2.4 status:', err.message);
    return null;
  }
}

export async function getGpsStatus() {
  try {
    const result = await mtFetch('/rest/system/gps/monitor', {
      method: 'POST',
      body: JSON.stringify({ once: true })
    });
    return result[0] || null;
  } catch (err) {
    console.error('Failed to get GPS status:', err.message);
    return null;
  }
}

export async function connectWifi(interfaceName, ssid, password) {
  try {
    await mtFetch(`/rest/interface/wireless/${interfaceName}`, {
      method: 'PATCH',
      body: JSON.stringify({
        'mode': 'station',
        'ssid': ssid,
        'security-profile': 'default'
      })
    });

    const profiles = await mtFetch('/rest/interface/wireless/security-profiles?name=default');
    if (profiles && profiles[0]) {
      await mtFetch(`/rest/interface/wireless/security-profiles/${profiles[0]['.id']}`, {
        method: 'PATCH',
        body: JSON.stringify({
          'mode': 'dynamic-keys',
          'authentication-types': 'wpa2-psk',
          'wpa2-pre-shared-key': password
        })
      });
    }

    return { success: true };
  } catch (err) {
    console.error('Failed to connect WiFi:', err.message);
    throw err;
  }
}

function categorizeLog(topics, message) {
  const topicsLower = topics.toLowerCase();
  const messageLower = message.toLowerCase();

  if (topicsLower.includes('wireless') || topicsLower.includes('wifi')) return 'wifi';
  if (topicsLower.includes('vpn') || topicsLower.includes('ipsec') || topicsLower.includes('l2tp')) return 'vpn';
  if (topicsLower.includes('firewall')) return 'firewall';
  if (topicsLower.includes('lte') || messageLower.includes('lte')) return 'lte';
  if (topicsLower.includes('dns')) return 'dns';
  if (topicsLower.includes('auth') || topicsLower.includes('login')) return 'auth';
  if (topicsLower.includes('system')) return 'system';

  return 'network';
}

function getSeverity(topics) {
  const topicsLower = topics.toLowerCase();

  if (topicsLower.includes('error') || topicsLower.includes('critical')) return 'error';
  if (topicsLower.includes('warning')) return 'warning';
  if (topicsLower.includes('info')) return 'info';

  return 'info';
}

export { categorizeLog, getSeverity };
