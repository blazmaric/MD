import { authenticateMiddleware, requirePermission } from '../auth.js';
import { scanWifi, connectWifi, getWirelessRegistrationTable, disconnectWirelessClient, getWlan5Status, getWlan24Status } from '../mikrotik.js';
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

  fastify.get('/wifi/registration-table', {
    preHandler: [authenticateMiddleware, requirePermission('view_summary')]
  }, async (request, reply) => {
    const { interface: interfaceName = 'wlan5' } = request.query;
    try {
      const clients = await getWirelessRegistrationTable(interfaceName);
      return { clients };
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });

  fastify.delete('/wifi/client/:id', {
    preHandler: [authenticateMiddleware, requirePermission('manage_wifi')]
  }, async (request, reply) => {
    const { id } = request.params;
    try {
      const result = await disconnectWirelessClient(id);
      return result;
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });

  fastify.get('/wifi/wlan5/status', {
    preHandler: [authenticateMiddleware, requirePermission('view_summary')]
  }, async (request, reply) => {
    try {
      const status = await getWlan5Status();
      return { status };
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });

  fastify.get('/wifi/wlan24/status', {
    preHandler: [authenticateMiddleware, requirePermission('view_summary')]
  }, async (request, reply) => {
    try {
      const status = await getWlan24Status();
      return { status };
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });
}
