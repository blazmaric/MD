import { authenticateMiddleware, requirePermission } from '../auth.js';
import { getInterfaces, monitorTraffic } from '../mikrotik.js';
import { getLastSnapshot } from '../poller.js';

export default async function interfacesRoutes(fastify) {
  fastify.get('/interfaces', {
    preHandler: [authenticateMiddleware, requirePermission('view_summary')]
  }, async () => {
    const interfaces = await getInterfaces();
    const snapshot = getLastSnapshot();

    const etherInterfaces = interfaces.filter(iface => iface.name.match(/^ether\d+/));

    const trafficData = await Promise.all(
      etherInterfaces.map(iface => monitorTraffic(iface.name))
    );

    const interfacesWithTraffic = etherInterfaces.map((iface, index) => ({
      ...iface,
      traffic: trafficData[index]
    }));

    return {
      interfaces: interfacesWithTraffic,
      publicIp: snapshot?.public_ip || null
    };
  });

  fastify.get('/interfaces/all', {
    preHandler: [authenticateMiddleware, requirePermission('view_summary')]
  }, async () => {
    const interfaces = await getInterfaces();
    return { interfaces };
  });
}
