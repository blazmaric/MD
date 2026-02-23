import { authenticateMiddleware } from '../auth.js';
import { pool } from '../db.js';

export default async function dashboardRoutes(fastify) {
  fastify.get('/dashboard-data', {
    preHandler: [authenticateMiddleware]
  }, async (request, reply) => {
    try {
      const [summaryResult, interfacesResult, wlan24Result, wlan5Result, lteCheckResult] = await Promise.all([
        pool.query('SELECT * FROM snapshot ORDER BY snapshot_ts DESC LIMIT 1'),
        pool.query('SELECT * FROM snapshot ORDER BY snapshot_ts DESC LIMIT 1'),
        pool.query('SELECT * FROM snapshot WHERE wifi_ssid IS NOT NULL ORDER BY snapshot_ts DESC LIMIT 1'),
        pool.query('SELECT * FROM snapshot ORDER BY snapshot_ts DESC LIMIT 1'),
        pool.query('SELECT connected FROM lte_check_cache ORDER BY checked_at DESC LIMIT 1')
      ]);

      const snapshot = summaryResult.rows[0] || null;
      const lteCheck = lteCheckResult.rows[0] || { connected: false };

      return {
        summary: snapshot ? {
          snapshot_ts: snapshot.snapshot_ts,
          online: snapshot.online,
          stale: snapshot.stale,
          error: snapshot.error,
          active_uplink: snapshot.active_uplink,
          gateway_type: snapshot.gateway_type,
          public_ip: snapshot.public_ip,
          lte_operator: snapshot.lte_operator,
          lte_rsrp: snapshot.lte_rsrp,
          lte_rsrq: snapshot.lte_rsrq,
          lte_rssi: snapshot.lte_rssi,
          lte_sinr: snapshot.lte_sinr,
          system_uptime: snapshot.system_uptime,
          system_cpu_percent: snapshot.system_cpu_percent,
          system_ram_percent: snapshot.system_ram_percent,
          current_speed_interface: snapshot.current_speed_interface,
          current_speed_rx: snapshot.current_speed_rx,
          current_speed_tx: snapshot.current_speed_tx,
          vxlan_rx_bytes: snapshot.vxlan_rx_bytes,
          vxlan_tx_bytes: snapshot.vxlan_tx_bytes,
          gps_latitude: snapshot.gps_latitude,
          gps_longitude: snapshot.gps_longitude,
          gps_altitude: snapshot.gps_altitude,
          gps_speed: snapshot.gps_speed,
          gps_satellites: snapshot.gps_satellites,
          gps_valid: snapshot.gps_valid,
          gps_datetime_fix: snapshot.gps_datetime_fix
        } : null,
        interfaces: snapshot ? {
          interfaces: [] // Frontend prikaže iz summary
        } : { interfaces: [] },
        wlan24: snapshot ? {
          ssid: snapshot.wifi_ssid,
          status: snapshot.wifi_status,
          signal: snapshot.wifi_signal,
          tx_rate: snapshot.wifi_tx_rate,
          rx_rate: snapshot.wifi_rx_rate
        } : {},
        wlan5: snapshot ? {
          speed_rx: snapshot.wlan_speed_rx,
          speed_tx: snapshot.wlan_speed_tx
        } : {},
        lteCheck: {
          connected: lteCheck.connected,
          cached: true
        }
      };
    } catch (err) {
      fastify.log.error('Dashboard data error:', err);
      return reply.code(500).send({ error: err.message });
    }
  });
}
