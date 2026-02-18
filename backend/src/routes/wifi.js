import { authenticateMiddleware, requirePermission } from '../auth.js';
import { scanWifi, connectWifi, getWirelessRegistrationTable, disconnectWirelessClient, getWlan5Status, getWlan24Status, checkLteConnectivity } from '../mikrotik.js';
import { config } from '../config.js';
import { getDb } from '../db.js';

export default async function wifiRoutes(fastify) {
  fastify.get('/wifi/lte-check', {
    preHandler: [authenticateMiddleware]
  }, async (request, reply) => {
    try {
      const isConnected = await checkLteConnectivity();
      return { connected: isConnected };
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });

  fastify.post('/wifi/scan', {
    preHandler: [authenticateMiddleware, requirePermission('manage_wifi')]
  }, async (request, reply) => {
    try {
      const db = getDb();
      const results = await scanWifi(config.mikrotik.interfaces.wlan, db);
      return { networks: results };
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });

  fastify.get('/wifi/scan-results', {
    preHandler: [authenticateMiddleware]
  }, async (request, reply) => {
    try {
      const { interface: interfaceName = config.mikrotik.interfaces.wlan } = request.query;
      const db = getDb();

      const result = await db.query(
        `SELECT DISTINCT ON (address)
           id, interface_name, ssid, address, signal, channel, frequency, security, scanned_at, created_at
         FROM wifi_scan_results
         WHERE interface_name = $1
           AND scanned_at = (
             SELECT MAX(scanned_at)
             FROM wifi_scan_results
             WHERE interface_name = $1
           )
         ORDER BY address, signal DESC`,
        [interfaceName]
      );

      return { networks: result.rows };
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
    preHandler: [authenticateMiddleware, requirePermission('view_wlan5_clients')]
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
    preHandler: [authenticateMiddleware, requirePermission('view_wlan5')]
  }, async (request, reply) => {
    try {
      const status = await getWlan5Status();
      return { status };
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });

  fastify.get('/wifi/wlan24/status', {
    preHandler: [authenticateMiddleware, requirePermission('view_wlan24')]
  }, async (request, reply) => {
    try {
      const status = await getWlan24Status();
      return { status };
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });
}
