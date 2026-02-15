import { authenticateMiddleware, requirePermission } from '../auth.js';
import { getInterfaces, getCloudStatus } from '../mikrotik.js';

export default async function interfacesRoutes(fastify) {
  fastify.get('/interfaces', {
    preHandler: [authenticateMiddleware, requirePermission('view_summary')]
  }, async () => {
    const [interfaces, cloudStatus] = await Promise.all([
      getInterfaces(),
      getCloudStatus()
    ]);

    return {
      interfaces,
      publicIp: cloudStatus?.['public-address'] || null
    };
  });
}
