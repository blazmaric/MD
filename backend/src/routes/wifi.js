import { authenticateMiddleware, requirePermission } from '../auth.js';
import { scanWifi, connectWifi } from '../mikrotik.js';
import { config } from '../config.js';

export default async function wifiRoutes(fastify) {
  fastify.post('/wifi/scan', {
    preHandler: [authenticateMiddleware, requirePermission('manage_wifi')]
  }, async (request, reply) => {
    try {
      const results = await scanWifi(config.mikrotik.interfaces.wlan);
      return { networks: results };
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });

  fastify.post('/wifi/connect', {
    preHandler: [authenticateMiddleware, requirePermission('manage_wifi')]
  }, async (request, reply) => {
    const { ssid, password } = request.body;

    if (!ssid || !password) {
      return reply.code(400).send({ error: 'SSID and password are required' });
    }

    try {
      const result = await connectWifi(config.mikrotik.interfaces.wlan, ssid, password);
      return result;
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });
}
