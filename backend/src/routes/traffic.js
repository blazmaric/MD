import { authenticateMiddleware, requirePermission } from '../auth.js';
import { query } from '../db.js';

export default async function trafficRoutes(fastify) {
  fastify.get('/traffic', {
    preHandler: [authenticateMiddleware, requirePermission('view_traffic')]
  }, async (request) => {
    const { period = 'day', interface: iface } = request.query;

    let interval = 'hour';
    let timeRange = '1 day';

    if (period === 'week') {
      interval = 'hour';
      timeRange = '7 days';
    } else if (period === 'month') {
      interval = 'day';
      timeRange = '30 days';
    }

    let sql = `
      SELECT
        date_trunc($1, recorded_at) as time_bucket,
        interface_name,
        MAX(rx_bytes) - MIN(rx_bytes) as rx_bytes_delta,
        MAX(tx_bytes) - MIN(tx_bytes) as tx_bytes_delta
      FROM traffic_history
      WHERE recorded_at >= NOW() - INTERVAL '${timeRange}'
    `;

    const params = [interval];

    if (iface) {
      sql += ' AND interface_name = $2';
      params.push(iface);
    }

    sql += ' GROUP BY time_bucket, interface_name ORDER BY time_bucket DESC';

    const result = await query(sql, params);

    const totalResult = await query(`
      SELECT
        interface_name,
        MAX(rx_bytes) as total_rx,
        MAX(tx_bytes) as total_tx
      FROM traffic_history
      WHERE interface_name = $1
      GROUP BY interface_name
    `, [iface || 'Vxlan']);

    const totals = totalResult.rows[0] || { total_rx: 0, total_tx: 0 };

    return {
      history: result.rows.map(row => ({
        time_bucket: row.time_bucket,
        interface_name: row.interface_name,
        rx_bytes_delta: parseInt(row.rx_bytes_delta) || 0,
        tx_bytes_delta: parseInt(row.tx_bytes_delta) || 0
      })),
      totals: {
        total_rx: parseInt(totals.total_rx) || 0,
        total_tx: parseInt(totals.total_tx) || 0
      }
    };
  });
}
