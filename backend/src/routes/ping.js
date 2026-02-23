import { authenticateMiddleware } from '../auth.js';
import { ping } from '../mikrotik.js';

export default async function pingRoutes(fastify) {
  fastify.post('/ping', {
    preHandler: [authenticateMiddleware]
  }, async (request, reply) => {
    const { address, count = 4, interface: sourceInterface } = request.body;

    if (!address) {
      return reply.code(400).send({ error: 'Address is required' });
    }

    try {
      const result = await ping(address, count, sourceInterface);
      return result;
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });
}
