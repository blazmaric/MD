import { authenticateMiddleware, requirePermission } from '../auth.js';
import { getLastSnapshot } from '../poller.js';

export default async function summaryRoutes(fastify) {
  fastify.get('/summary', {
    preHandler: [authenticateMiddleware, requirePermission('view_summary')]
  }, async () => {
    const snapshot = getLastSnapshot();

    if (!snapshot) {
      return {
        online: false,
        error: 'No data available yet',
        stale: true
      };
    }

    return snapshot;
  });
}
