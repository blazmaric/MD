import { authenticateMiddleware, requireAdmin } from '../auth.js';
import { query } from '../db.js';

export default async function trafficRoutes(fastify) {
  fastify.get('/traffic/usage-log', {
    preHandler: [authenticateMiddleware]
  }, async (request) => {
    const result = await query(`
      SELECT
        id,
        logged_at,
        rx_bytes,
        tx_bytes,
        total_bytes
      FROM vxlan_usage_log
      ORDER BY logged_at DESC
      LIMIT 100
    `);

    return {
      logs: result.rows.map(row => ({
        id: row.id,
        logged_at: row.logged_at,
        rx_bytes: parseInt(row.rx_bytes) || 0,
        tx_bytes: parseInt(row.tx_bytes) || 0,
        total_bytes: parseInt(row.total_bytes) || 0
      }))
    };
  });

  fastify.post('/traffic/log-current', {
    preHandler: [authenticateMiddleware, requireAdmin]
  }, async (request, reply) => {
    try {
      const latestSnapshot = await query(`
        SELECT vxlan_rx_bytes, vxlan_tx_bytes
        FROM snapshots
        ORDER BY snapshot_ts DESC
        LIMIT 1
      `);

      if (latestSnapshot.rows.length === 0) {
        return reply.code(404).send({ error: 'No snapshot data found' });
      }

      const rxBytes = parseInt(latestSnapshot.rows[0].vxlan_rx_bytes) || 0;
      const txBytes = parseInt(latestSnapshot.rows[0].vxlan_tx_bytes) || 0;
      const totalBytes = rxBytes + txBytes;

      await query(`
        INSERT INTO vxlan_usage_log (rx_bytes, tx_bytes, total_bytes)
        VALUES ($1, $2, $3)
      `, [rxBytes, txBytes, totalBytes]);

      return { success: true, message: 'Traffic usage logged successfully' };
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });

  fastify.delete('/traffic/usage-log', {
    preHandler: [authenticateMiddleware, requireAdmin]
  }, async (request, reply) => {
    try {
      await query('DELETE FROM vxlan_usage_log');
      return { success: true, message: 'Usage log cleared successfully' };
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });

  fastify.get('/traffic/monthly-usage', {
    preHandler: [authenticateMiddleware]
  }, async (request) => {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      const result = await query(`
        SELECT
          year,
          month,
          rx_bytes,
          tx_bytes,
          total_bytes,
          created_at,
          updated_at
        FROM monthly_traffic_usage
        WHERE year = $1 AND month = $2
      `, [currentYear, currentMonth]);

      if (result.rows.length === 0) {
        return {
          year: currentYear,
          month: currentMonth,
          rx_bytes: 0,
          tx_bytes: 0,
          total_bytes: 0
        };
      }

      const row = result.rows[0];
      return {
        year: row.year,
        month: row.month,
        rx_bytes: parseInt(row.rx_bytes) || 0,
        tx_bytes: parseInt(row.tx_bytes) || 0,
        total_bytes: parseInt(row.total_bytes) || 0,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    } catch (err) {
      return { error: err.message };
    }
  });
}
