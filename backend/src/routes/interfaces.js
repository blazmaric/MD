import { authenticateMiddleware } from '../auth.js';
import { getInterfaces, monitorTraffic } from '../mikrotik.js';
import { getLastSnapshot } from '../poller.js';

export default async function interfacesRoutes(fastify) {
  fastify.get('/interfaces', {
    preHandler: [authenticateMiddleware]
  }, async () => {
    const interfaces = await getInterfaces();
    const snapshot = getLastSnapshot();

    // Filter: Show only ether1-ether5 and Vxlan
    const filteredInterfaces = interfaces.filter(iface => {
      const etherMatch = iface.name.match(/^ether(\d+)/);
      if (etherMatch) {
        const etherNum = parseInt(etherMatch[1]);
        return etherNum >= 1 && etherNum <= 5;
      }
      return iface.name.toLowerCase().includes('vxlan');
    });

    const trafficData = await Promise.all(
      filteredInterfaces.map(iface => monitorTraffic(iface.name))
    );

    const interfacesWithTraffic = filteredInterfaces.map((iface, index) => ({
      ...iface,
      traffic: trafficData[index]
    }));

    return {
      interfaces: interfacesWithTraffic,
      publicIp: snapshot?.public_ip || null
    };
  });

  fastify.get('/interfaces/all', {
    preHandler: [authenticateMiddleware]
  }, async () => {
    const interfaces = await getInterfaces();
    return { interfaces };
  });
}
