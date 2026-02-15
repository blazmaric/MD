import { authenticateMiddleware, requirePermission } from '../auth.js';
import { getInterfaces, getCloudStatus, monitorTraffic } from '../mikrotik.js';

export default async function interfacesRoutes(fastify) {
  fastify.get('/interfaces', {
    preHandler: [authenticateMiddleware, requirePermission('view_summary')]
  }, async () => {
    const [interfaces, cloudStatus] = await Promise.all([
      getInterfaces(),
      getCloudStatus()
    ]);

    console.log('Cloud status in interfaces endpoint:', cloudStatus);
    console.log('Public IP:', cloudStatus?.['public-address']);

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
      publicIp: cloudStatus?.['public-address'] || null
    };
  });

  fastify.get('/interfaces/all', {
    preHandler: [authenticateMiddleware, requirePermission('view_summary')]
  }, async () => {
    const interfaces = await getInterfaces();
    return { interfaces };
  });
}
