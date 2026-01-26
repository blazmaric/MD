import { authenticateMiddleware, requirePermission } from '../auth.js';
import { getInterfaces } from '../mikrotik.js';

export default async function interfacesRoutes(fastify) {
  fastify.get('/interfaces', {
    preHandler: [authenticateMiddleware, requirePermission('view_summary')]
  }, async () => {
    const interfaces = await getInterfaces();
    return { interfaces };
  });
}
