import { authenticateMiddleware, requireAdmin } from '../auth.js';
import { rebootSystem } from '../mikrotik.js';

export default async function systemRoutes(fastify) {
  fastify.post('/system/reboot', {
    preHandler: [authenticateMiddleware],
    schema: {
      body: {
        type: 'object',
        additionalProperties: true
      }
    }
  }, async (request, reply) => {
    try {
      const result = await rebootSystem();
      return result;
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });
}
