import fetch from 'node-fetch';
import https from 'https';
import tls from 'tls';
import { config } from './config.js';

const authHeader = 'Basic ' + Buffer.from(
  `${config.mikrotik.user}:${config.mikrotik.pass}`
).toString('base64');

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 60000,
  maxSockets: 15,
  maxFreeSockets: 10,
  timeout: 60000,
  scheduling: 'lifo',
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
    return result[0] || null;
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
    }

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
      throw new Error('Ping request timeout after 15 seconds');
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

    return clients.map(client => ({
      ...client,
      ssid: ssid
    }));
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

export async function scanWifi(interfaceName) {
  try {
    const interfaces = await mtFetch('/rest/interface/wireless');
    const targetInterface = interfaces.find(iface => iface.name === interfaceName);

    if (!targetInterface) {
      throw new Error(`Wireless interface '${interfaceName}' not found. Available interfaces: ${interfaces.map(i => i.name).join(', ')}`);
    }

    const result = await mtFetch('/rest/interface/wireless/scan', {
      method: 'POST',
      body: JSON.stringify({
        numbers: targetInterface['.id'],
        duration: '10'
      })
    });

    const filtered = result.filter(network => network.ssid && network.ssid !== '');

    const grouped = filtered.reduce((acc, network) => {
      const addr = network.address;
      if (!acc[addr] || parseInt(network.signal || network.sig || '0', 10) > parseInt(acc[addr].signal || acc[addr].sig || '0', 10)) {
        acc[addr] = network;
      }
      return acc;
    }, {});

    const mapped = Object.values(grouped).map(network => ({
      ssid: network.ssid || '',
      address: network.address || '',
      signal: parseInt(network.signal || network.sig || '0', 10),
      channel: network.channel || '',
      frequency: parseInt(network.frequency || '0', 10),
      security: network.security || ''
    }));

    mapped.sort((a, b) => b.signal - a.signal);

    return mapped;
  } catch (err) {
    console.error('Failed to scan WiFi:', err.message, err.stack);
    throw err;
  }
}

export async function getWlan5Status() {
  try {
    const interfaces = await mtFetch('/rest/interface/wireless');
    const wlan5Interface = interfaces.find(iface => iface.name === 'wlan5');

    if (!wlan5Interface) {
      return null;
    }

    const monitorResult = await mtFetch('/rest/interface/wireless/monitor', {
      method: 'POST',
      body: JSON.stringify({
        '.id': wlan5Interface['.id'],
        once: 'true'
      })
    });

    const monitor = monitorResult[0] || {};

    const rxByte1 = parseInt(wlan5Interface['rx-byte'] || '0');
    const txByte1 = parseInt(wlan5Interface['tx-byte'] || '0');

    await new Promise(resolve => setTimeout(resolve, 1000));

    const interfacesAfter = await mtFetch('/rest/interface/wireless');
    const wlan5After = interfacesAfter.find(iface => iface.name === 'wlan5');

    const rxByte2 = parseInt(wlan5After?.['rx-byte'] || '0');
    const txByte2 = parseInt(wlan5After?.['tx-byte'] || '0');

    const rxMbps = ((rxByte2 - rxByte1) * 8) / 1000000;
    const txMbps = ((txByte2 - txByte1) * 8) / 1000000;

    return {
      ...wlan5Interface,
      ssid: wlan5Interface.ssid || 'N/A',
      authenticatedClients: parseInt(monitor['authenticated-clients'] || '0'),
      registeredClients: parseInt(monitor['registered-clients'] || '0'),
      noiseFloor: monitor['noise-floor'] || 'N/A',
      status: monitor.status || 'N/A',
      wmmEnabled: monitor['wmm-enabled'] === 'true',
      rxMbps: rxMbps.toFixed(2),
      txMbps: txMbps.toFixed(2)
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

    return {
      status: monitor.status || 'N/A',
      ssid: monitor.ssid || 'N/A',
      signalStrength: monitor['signal-strength'] || 'N/A',
      txRate: monitor['tx-rate'] || 'N/A',
      rxRate: monitor['rx-rate'] || 'N/A'
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
