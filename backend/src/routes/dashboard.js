import { authenticateMiddleware } from '../auth.js';
import { pool } from '../db.js';

export default async function dashboardRoutes(fastify) {
  fastify.get('/dashboard-data', {
    preHandler: [authenticateMiddleware]
  }, async (request, reply) => {
    try {
      // Get latest snapshot - contains ALL data
      const snapshotResult = await pool.query('SELECT * FROM snapshots ORDER BY snapshot_ts DESC LIMIT 1');
      const snapshot = snapshotResult.rows[0] || null;

      const now = new Date();
      const cacheAge = snapshot ? (now - new Date(snapshot.snapshot_ts)) / 1000 : 9999;

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
          speed_rx: snapshot.wlan_speed_rx,
          speed_tx: snapshot.wlan_speed_tx
        } : null,
        lte: snapshot ? {
          operator: snapshot.lte_operator,
          rsrp: snapshot.lte_rsrp,
          rsrq: snapshot.lte_rsrq,
          rssi: snapshot.lte_rssi,
          sinr: snapshot.lte_sinr
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
        } : null
      };
    } catch (err) {
      fastify.log.error('Dashboard data error:', err);
      return reply.code(500).send({ error: err.message });
    }
  });
}
