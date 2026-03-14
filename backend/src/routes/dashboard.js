import { authenticateMiddleware } from '../auth.js';
import { pool } from '../db.js';

export default async function dashboardRoutes(fastify) {
  fastify.get('/dashboard-data', {
    preHandler: [authenticateMiddleware]
  }, async (request, reply) => {
    try {
      const { getLastSnapshot } = await import('../poller.js');
      const snapshot = getLastSnapshot();

      const now = new Date();
      const cacheAge = snapshot ? (now - new Date(snapshot.snapshot_ts)) / 1000 : 9999;

      let interfaces = [];
      try {
        interfaces = snapshot?.interfaces_data ? JSON.parse(snapshot.interfaces_data) : [];
      } catch (e) {
        console.error('Failed to parse interfaces_data:', e);
      }

      let smsMessages = [];
      try {
        smsMessages = snapshot?.sms_messages ? JSON.parse(snapshot.sms_messages) : [];
      } catch (e) {
        console.error('Failed to parse sms_messages:', e);
      }

      return {
        timestamp: now.toISOString(),
        cacheAge: Math.round(cacheAge),
        summary: snapshot,
        wlan24: snapshot ? {
          ssid: snapshot.wifi_ssid,
          status: snapshot.wifi_status,
          signal: snapshot.wifi_signal,
          tx_rate: snapshot.wifi_tx_rate,
          rx_rate: snapshot.wifi_rx_rate
        } : null,
        wlan5: snapshot ? {
          ssid: snapshot.wlan5_ssid,
          status: snapshot.wlan5_status,
          authenticatedClients: snapshot.wlan5_authenticated_clients,
          registeredClients: snapshot.wlan5_registered_clients,
          noiseFloor: snapshot.wlan5_noise_floor,
          wmmEnabled: snapshot.wlan5_wmm_enabled,
          rxRate: snapshot.wlan5_rx_rate,
          txRate: snapshot.wlan5_tx_rate,
          disabled: snapshot.wlan5_disabled,
          running: snapshot.wlan5_running
        } : null,
        lte: snapshot ? {
          operator: snapshot.lte_operator,
          rsrp: snapshot.lte_rsrp,
          rsrq: snapshot.lte_rsrq,
          rssi: snapshot.lte_rssi,
          sinr: snapshot.lte_sinr,
          connected: snapshot.lte_connected,
          carrierAggregation: snapshot.lte_carrier_aggregation
        } : null,
        gps: snapshot ? {
          latitude: snapshot.gps_latitude,
          longitude: snapshot.gps_longitude,
          altitude: snapshot.gps_altitude,
          speed: snapshot.gps_speed,
          satellites: snapshot.gps_satellites,
          valid: snapshot.gps_valid,
          datetime_fix: snapshot.gps_datetime_fix
        } : null,
        system: snapshot ? {
          uptime: snapshot.system_uptime,
          cpu_percent: snapshot.system_cpu_percent,
          ram_percent: snapshot.system_ram_percent
        } : null,
        interfaces: interfaces,
        smsMessages: smsMessages,
        publicIp: snapshot?.public_ip || null
      };
    } catch (err) {
      fastify.log.error('Dashboard data error:', err);
      return reply.code(500).send({ error: err.message });
    }
  });
}
