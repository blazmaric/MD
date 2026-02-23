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
      let errorDetail = `${response.status} ${response.statusText}`;
      try {
        const errorBody = await response.text();
        if (errorBody) {
          errorDetail += ` - ${errorBody}`;
        }
      } catch (e) {
        // Ignore error reading body
      }
      throw new Error(`MikroTik API error: ${errorDetail}`);
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

// Helper function to retry operations with exponential backoff
async function mtFetchWithRetry(path, options = {}, maxRetries = 3, baseDelay = 2000) {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`[mtFetchWithRetry] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms delay`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      return await mtFetch(path, options);
    } catch (err) {
      lastError = err;
      console.warn(`[mtFetchWithRetry] Attempt ${attempt + 1} failed:`, err.message);
      if (attempt === maxRetries - 1 || !err.message.includes('timeout')) {
        break;
      }
    }
  }
  throw lastError;
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

      // Check for AP (Active) or APP (Active + Privacy/Secured)
      // Note: MikroTik scan output shows 'P' flag in header but actual lines start with 'AP' regardless of security
      // We'll default to 'secured' as most networks have passwords, and connection will fail gracefully if wrong
      if (line.startsWith('AP')) {
        const isSecured = line.startsWith('APP ');
        const parts = line.split(/\s+/);
        console.log('[WiFi Scan] Line matched AP pattern, secured:', isSecured, 'parts:', parts);

        if (parts.length >= 4) {
          const address = parts[1];

          let ssidEndIndex = -1;
          let channelIndex = -1;
          for (let j = 2; j < parts.length; j++) {
            if (parts[j].includes('/') && parts[j].includes('dBm')) {
              channelIndex = j;
              ssidEndIndex = j - 1;
              break;
            }
          }

          if (channelIndex > 0 && ssidEndIndex >= 2) {
            const ssid = parts.slice(2, ssidEndIndex + 1).join(' ');
            const channel = parts[channelIndex];

            let signalStr = '';
            if (channelIndex + 1 < parts.length) {
              signalStr = parts[channelIndex + 1];
            }

            const signal = parseInt(signalStr) || -100;
            // MikroTik scan doesn't reliably show security in output, default to secured
            // User will get error if password is wrong or not needed
            const security = 'secured';

            console.log('[WiFi Scan] Found network:', { ssid, address, signal, channel, security });
            console.log('[WiFi Scan] SSID bytes:', Buffer.from(ssid, 'utf8').toString('hex'));

            if (ssid && ssid !== '' && address) {
              networks.push({
                ssid: ssid,
                address: address,
                signal: signal,
                channel: channel,
                frequency: 0,
                security: security
              });
            }
          }
        }
      }
    }

    console.log('[WiFi Scan] Total networks found:', networks.length);

    // Group by SSID (not MAC address), keeping the strongest signal for each SSID
    const grouped = networks.reduce((acc, network) => {
      const key = network.ssid;
      if (!acc[key] || network.signal > acc[key].signal) {
        acc[key] = network;
      }
      return acc;
    }, {});

    const result = Object.values(grouped);
    result.sort((a, b) => b.signal - a.signal);

    console.log('[WiFi Scan] After deduplication:', result.length, 'unique networks');

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

export async function connectWifi(interfaceName, ssid, password, saveProfile = true) {
  try {
    console.log(`[connectWifi] Connecting to SSID: ${ssid}, password: ${password ? 'yes' : 'no'}, saveProfile: ${saveProfile}`);

    // Wait longer for interface to stabilize after scanning (8 seconds)
    console.log(`[connectWifi] Waiting 8 seconds for interface to stabilize after scan...`);
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Normalize SSID by converting hex UTF-8 sequences to actual characters
    // MikroTik SSH shows UTF-8 bytes as hex strings (e.g., "E28099" instead of the actual character)
    let normalizedSsid = ssid;
    const hexPattern = /([0-9A-F]{6})/g;
    normalizedSsid = normalizedSsid.replace(hexPattern, (match) => {
      try {
        const hexBuffer = Buffer.from(match, 'hex');
        const char = hexBuffer.toString('utf8');
        if (char.length > 0 && char.charCodeAt(0) > 31) {
          return char;
        }
        return match;
      } catch (e) {
        return match;
      }
    });
    console.log(`[connectWifi] Original SSID: "${ssid}"`);
    console.log(`[connectWifi] Normalized SSID: "${normalizedSsid}"`);

    // Step 1: Create or update security profile if password is provided
    let securityProfileName = 'default';
    if (password) {
      securityProfileName = 'profile-' + ssid.replace(/[^a-zA-Z0-9]/g, '-');
      console.log(`[connectWifi] Setting up security profile: ${securityProfileName} for SSID: "${ssid}"`);

      try {
        // Check if profile exists (with retry)
        const profiles = await mtFetchWithRetry(`/rest/interface/wireless/security-profiles?name=${securityProfileName}`);

        if (profiles && profiles[0]) {
          // Update existing profile (with retry)
          await mtFetchWithRetry(`/rest/interface/wireless/security-profiles/${profiles[0]['.id']}`, {
            method: 'PATCH',
            body: JSON.stringify({
              'mode': 'dynamic-keys',
              'authentication-types': 'wpa2-psk,wpa-psk',
              'wpa2-pre-shared-key': password,
              'wpa-pre-shared-key': password
            })
          });
          console.log(`[connectWifi] Updated existing security profile: ${securityProfileName}`);
        } else {
          // Create new profile (with retry)
          await mtFetchWithRetry('/rest/interface/wireless/security-profiles', {
            method: 'PUT',
            body: JSON.stringify({
              'name': securityProfileName,
              'mode': 'dynamic-keys',
              'authentication-types': 'wpa2-psk,wpa-psk',
              'wpa2-pre-shared-key': password,
              'wpa-pre-shared-key': password
            })
          });
          console.log(`[connectWifi] Created new security profile: ${securityProfileName}`);
        }
      } catch (err) {
        console.error('[connectWifi] Failed to setup security profile:', err.message);
        throw new Error('Failed to setup security profile: ' + err.message);
      }
    }

    // Step 2: Clean up and add to connect-list
    console.log(`[connectWifi] Managing connect-list for ${ssid}`);
    console.log(`[connectWifi] SSID bytes:`, Buffer.from(ssid, 'utf8').toString('hex'));

    try {
      // First, get all existing profiles for this interface
      const existingProfiles = await mtFetchWithRetry(`/rest/interface/wireless/connect-list?interface=${interfaceName}`);
      console.log(`[connectWifi] Found ${existingProfiles.length} existing connect-list entries`);

      // Log existing SSIDs to see what MikroTik actually has
      for (const profile of existingProfiles) {
        console.log(`[connectWifi] Existing SSID: "${profile.ssid}", bytes:`, Buffer.from(profile.ssid || '', 'utf8').toString('hex'));
      }

      // Delete ALL existing entries for this interface to avoid duplicates
      console.log(`[connectWifi] Removing all existing connect-list entries for ${interfaceName}`);
      for (const profile of existingProfiles) {
        try {
          await mtFetchWithRetry(`/rest/interface/wireless/connect-list/${profile['.id']}`, {
            method: 'DELETE'
          });
          console.log(`[connectWifi] Deleted connect-list entry: ${profile.ssid || profile['.id']}`);
        } catch (err) {
          console.warn(`[connectWifi] Failed to delete entry ${profile.ssid}:`, err.message);
        }
      }

      // Now create a fresh entry for the new SSID using the normalized SSID
      const connectListData = {
        'interface': interfaceName,
        'security-profile': securityProfileName,
        'connect': 'yes',
        'ssid': normalizedSsid
      };

      console.log(`[connectWifi] Creating new connect-list entry for normalized SSID: "${normalizedSsid}"`);
      console.log(`[connectWifi] Normalized SSID bytes:`, Buffer.from(normalizedSsid, 'utf8').toString('hex'));
      console.log(`[connectWifi] Create data:`, JSON.stringify(connectListData));
      await mtFetchWithRetry('/rest/interface/wireless/connect-list/add', {
        method: 'POST',
        body: JSON.stringify(connectListData)
      });
    } catch (err) {
      console.error('[connectWifi] Failed to add to connect-list:', err.message);
      throw new Error('Failed to add to connect-list: ' + err.message);
    }

    // Step 3: Set interface to station mode with blank SSID
    console.log(`[connectWifi] Setting interface ${interfaceName} to station mode with blank SSID`);
    try {
      await mtFetch(`/rest/interface/wireless/${interfaceName}`, {
        method: 'PATCH',
        body: JSON.stringify({
          'mode': 'station',
          'ssid': '',
          'disabled': 'no'
        })
      });
    } catch (err) {
      console.warn('[connectWifi] Failed to configure interface mode:', err.message);
      // Don't throw - connect-list should still work
    }

    // Step 4: Wait for connection (check status for up to 30 seconds)
    console.log(`[connectWifi] Waiting for connection to ${ssid}...`);
    const maxAttempts = 30;
    let connected = false;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        const status = await mtFetch(`/rest/interface/wireless/${interfaceName}`);
        if (status && status[0]) {
          const currentSsid = status[0].ssid;
          const isRunning = status[0].running === 'true';

          console.log(`[connectWifi] Attempt ${i + 1}/${maxAttempts}: SSID="${currentSsid}", running=${isRunning}`);
          console.log(`[connectWifi] Expected normalized SSID: "${normalizedSsid}"`);
          console.log(`[connectWifi] Expected SSID bytes:`, Buffer.from(normalizedSsid, 'utf8').toString('hex'));
          console.log(`[connectWifi] Current SSID bytes:`, Buffer.from(currentSsid || '', 'utf8').toString('hex'));

          // Compare SSIDs byte-by-byte to handle UTF-8 encoding differences
          // Use the normalized SSID (with actual Unicode characters) for comparison
          const expectedBytes = Buffer.from(normalizedSsid, 'utf8').toString('hex');
          const currentBytes = Buffer.from(currentSsid || '', 'utf8').toString('hex');

          if (expectedBytes === currentBytes && isRunning) {
            connected = true;
            console.log(`[connectWifi] Successfully connected to ${normalizedSsid} after ${i + 1} seconds`);
            break;
          }
        }
      } catch (err) {
        console.warn(`[connectWifi] Status check failed:`, err.message);
      }
    }

    if (!connected) {
      throw new Error(`Failed to connect to ${ssid} within 30 seconds. Check signal strength and password.`);
    }

    return {
      success: true,
      message: `Successfully connected to ${ssid}`
    };
  } catch (err) {
    console.error('[connectWifi] Failed to connect WiFi:', err.message);
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
