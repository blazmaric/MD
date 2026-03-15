import { authenticateMiddleware } from '../auth.js';
import { getInterfaces, monitorTraffic } from '../mikrotik.js';
import { getLastSnapshot } from '../poller.js';

// Cache for interface traffic to reduce MikroTik API calls
let interfaceCache = { data: null, timestamp: 0 };
const INTERFACE_CACHE_TTL = 3000; // 3 seconds cache

export default async function interfacesRoutes(fastify) {
  fastify.get('/interfaces', {
    preHandler: [authenticateMiddleware]
  }, async () => {
    const now = Date.now();

    // Return cached data if fresh
    if (interfaceCache.data && (now - interfaceCache.timestamp) < INTERFACE_CACHE_TTL) {
      return interfaceCache.data;
    }

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

    // Execute traffic monitoring sequentially with delays to reduce SSL load
    const trafficData = [];
    for (const iface of filteredInterfaces) {
      trafficData.push(await monitorTraffic(iface.name));
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay between calls
    }

    const interfacesWithTraffic = filteredInterfaces.map((iface, index) => ({
      ...iface,
      traffic: trafficData[index]
    }));

    const result = {
      interfaces: interfacesWithTraffic,
      publicIp: snapshot?.public_ip || null
    };

    // Cache the result
    interfaceCache = { data: result, timestamp: now };

    return result;
  });

  fastify.get('/interfaces/all', {
    preHandler: [authenticateMiddleware]
  }, async () => {
    const interfaces = await getInterfaces();
    return { interfaces };
  });
}
