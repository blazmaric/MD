import fetch from 'node-fetch';
import https from 'https';
import tls from 'tls';
import { config } from './config.js';

const authHeader = 'Basic ' + Buffer.from(
  `${config.mikrotik.user}:${config.mikrotik.pass}`
).toString('base64');

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 5,
  maxFreeSockets: 2,
  timeout: 60000,
  checkServerIdentity: (hostname, cert) => {
    return undefined;
  }
});

async function mtFetch(path, options = {}) {
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
  const pingTimeout = 30000; // 30 seconds for ping
  const timeout = setTimeout(() => controller.abort(), pingTimeout);

  try {
    const body = { address, count };
    if (sourceInterface) {
      body.interface = sourceInterface;
    }

    const url = `${config.mikrotik.baseUrl}/rest/ping`;
    const response = await fetch(url, {
      method: 'POST',
      agent: httpsAgent,
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

    return await response.json();
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error('Ping request timeout after 30 seconds');
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
    return await mtFetch(`/rest/interface/wireless/registration-table?interface=${interfaceName}`);
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

    console.log(`Starting WiFi scan on interface ${interfaceName} (${targetInterface['.id']})`);

    const result = await mtFetch('/rest/interface/wireless/scan', {
      method: 'POST',
      body: JSON.stringify({
        numbers: targetInterface['.id'],
        duration: '10s'
      })
    });

    console.log(`WiFi scan completed, found ${result.length} networks`);

    const mapped = result.map(network => ({
      ssid: network.ssid || '',
      signal: parseInt(network['signal-strength'] || '0', 10),
      frequency: parseInt(network.frequency || '0', 10),
      channel: network.channel || '',
      security: network.security || ''
    }));

    return mapped;
  } catch (err) {
    console.error('Failed to scan WiFi:', err.message);
    throw err;
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
