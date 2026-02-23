import { authenticateMiddleware } from '../auth.js';
import { pool } from '../db.js';

export default async function dashboardRoutes(fastify) {
  fastify.get('/dashboard-data', {
    preHandler: [authenticateMiddleware]
  }, async (request, reply) => {
    try {
      const snapshotResult = await pool.query('SELECT * FROM snapshot ORDER BY snapshot_ts DESC LIMIT 1');
      const lteCheckResult = await pool.query('SELECT connected, checked_at FROM lte_check_cache ORDER BY checked_at DESC LIMIT 1');

      const snapshot = snapshotResult.rows[0] || null;
      const lteCheck = lteCheckResult.rows[0] || { connected: false, checked_at: new Date() };

      const now = new Date();
      const cacheAge = snapshot ? (now - new Date(snapshot.snapshot_ts)) / 1000 : 9999;
      const lteAge = lteCheck.checked_at ? (now - new Date(lteCheck.checked_at)) / 1000 : 9999;

      return {
        timestamp: now.toISOString(),
        cacheAge: Math.round(cacheAge),
        summary: snapshot,
        lteCheck: {
          connected: lteCheck.connected,
          age: Math.round(lteAge),
          cached: true
        },
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
        interfaces: []
      };
    } catch (err) {
      fastify.log.error('Dashboard data error:', err);
      return reply.code(500).send({ error: err.message });
    }
  });
}
