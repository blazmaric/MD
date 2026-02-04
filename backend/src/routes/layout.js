import { query } from '../db.js';
import { authenticateMiddleware } from '../auth.js';

export default async function layoutRoutes(fastify) {
  fastify.get('/layout', { preHandler: authenticateMiddleware }, async (request, reply) => {
    try {
      const result = await query(
        'SELECT layout_config FROM dashboard_layouts WHERE user_id = $1',
        [request.user.id]
      );

      if (result.rows.length === 0) {
        return { layout: [] };
      }

      return { layout: result.rows[0].layout_config };
    } catch (err) {
      console.error('Failed to get dashboard layout:', err);
      reply.status(500).send({ error: 'Failed to get dashboard layout' });
    }
  });

  fastify.post('/layout', { preHandler: authenticateMiddleware }, async (request, reply) => {
    try {
      const { layout } = request.body;

      if (!Array.isArray(layout)) {
        return reply.status(400).send({ error: 'Layout must be an array' });
      }

      await query(`
        INSERT INTO dashboard_layouts (user_id, layout_config)
        VALUES ($1, $2)
        ON CONFLICT (user_id)
        DO UPDATE SET layout_config = $2, updated_at = NOW()
      `, [request.user.id, JSON.stringify(layout)]);

      return { success: true };
    } catch (err) {
      console.error('Failed to save dashboard layout:', err);
      reply.status(500).send({ error: 'Failed to save dashboard layout' });
    }
  });

  fastify.delete('/layout', { preHandler: authenticateMiddleware }, async (request, reply) => {
    try {
      await query('DELETE FROM dashboard_layouts WHERE user_id = $1', [request.user.id]);
      return { success: true };
    } catch (err) {
      console.error('Failed to reset dashboard layout:', err);
      reply.status(500).send({ error: 'Failed to reset dashboard layout' });
    }
  });
}
