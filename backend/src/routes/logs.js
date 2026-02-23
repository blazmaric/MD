import { authenticateMiddleware } from '../auth.js';
import { query } from '../db.js';

export default async function logsRoutes(fastify) {
  fastify.get('/logs', {
    preHandler: [authenticateMiddleware]
  }, async (request) => {
    const {
      category,
      severity,
      search,
      limit = 100,
      offset = 0
    } = request.query;

    let sql = 'SELECT * FROM logs WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (category) {
      sql += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (severity) {
      sql += ` AND severity = $${paramIndex}`;
      params.push(severity);
      paramIndex++;
    }

    if (search) {
      sql += ` AND (message ILIKE $${paramIndex} OR topics ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    sql += ` ORDER BY log_time DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    return {
      logs: result.rows,
      count: result.rows.length
    };
  });
}
