import { authenticateMiddleware, requireAdmin } from '../auth.js';
import { scanWifi, connectWifi, getWirelessRegistrationTable, disconnectWirelessClient, getWlan5Status, getWlan24Status, checkLteConnectivity } from '../mikrotik.js';
import { config } from '../config.js';
import * as db from '../db.js';
import { createJob, updateJob, getJob } from '../jobManager.js';
import { getLteCache, setLteCache, isLteCheckInProgress, setLteCheckInProgress } from '../lteCache.js';

export default async function wifiRoutes(fastify) {
  fastify.get('/wifi/lte-check', {
    preHandler: [authenticateMiddleware]
  }, async (request, reply) => {
    try {
      const cached = getLteCache();
      if (cached) {
        console.log('[LTE Check] Returning cached result:', cached);
        return cached;
      }

      if (isLteCheckInProgress()) {
        console.log('[LTE Check] Check already in progress');
        return { connected: null, checking: true };
      }

      console.log('[LTE Check] Starting new check...');
      setLteCheckInProgress(true);
      try {
        const isConnected = await checkLteConnectivity();
        console.log('[LTE Check] Result:', isConnected);
        setLteCache(isConnected);
        setLteCheckInProgress(false);
        return { connected: isConnected, cached: false };
      } catch (checkErr) {
        console.log('[LTE Check] Error:', checkErr.message);
        setLteCheckInProgress(false);
        throw checkErr;
      }
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });

  fastify.post('/wifi/scan', {
    preHandler: [authenticateMiddleware]
  }, async (request, reply) => {
    try {
      const { force = false } = request.body;

      // Force scan requires admin privileges
      if (force && !request.user.is_admin) {
        return reply.code(403).send({ error: 'Admin privileges required for force scan' });
      }

      const job = createJob('wifi-scan', {
        interface: config.mikrotik.interfaces.wlan,
        force
      });

      scanWifi(config.mikrotik.interfaces.wlan, db, force)
        .then(results => {
          updateJob(job.id, {
            status: 'completed',
            progress: 100,
            result: results
          });
        })
        .catch(err => {
          updateJob(job.id, {
            status: 'failed',
            error: err.message
          });
        });

      updateJob(job.id, { status: 'running', progress: 10 });

      return { jobId: job.id, status: 'started' };
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });

  fastify.get('/wifi/scan-job/:jobId', {
    preHandler: [authenticateMiddleware]
  }, async (request, reply) => {
    try {
      const { jobId } = request.params;
      const job = getJob(jobId);

      if (!job) {
        return reply.code(404).send({ error: 'Job not found' });
      }

      return job;
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });

  fastify.get('/wifi/scan-results', {
    preHandler: [authenticateMiddleware]
  }, async (request, reply) => {
    try {
      const { interface: interfaceName = config.mikrotik.interfaces.wlan } = request.query;

      // Get latest scan results, grouped by SSID and showing the best signal
      const result = await db.query(
        `SELECT DISTINCT ON (ssid)
           id, interface_name, ssid, address, signal, channel, frequency, security, scanned_at, created_at
         FROM wifi_scan_results
         WHERE interface_name = $1
           AND scanned_at = (
             SELECT MAX(scanned_at)
             FROM wifi_scan_results
             WHERE interface_name = $1
           )
         ORDER BY ssid, signal DESC`,
        [interfaceName]
      );

      return { networks: result.rows };
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });

  fastify.post('/wifi/connect', {
    preHandler: [authenticateMiddleware, requireAdmin]
  }, async (request, reply) => {
    const { ssid, password, saveProfile = true } = request.body;

    if (!ssid) {
      return reply.code(400).send({ error: 'SSID is required' });
    }

    try {
      const result = await connectWifi(config.mikrotik.interfaces.wlan, ssid, password || null, saveProfile);
      return result;
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });

  fastify.get('/wifi/registration-table', {
    preHandler: [authenticateMiddleware]
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
    preHandler: [authenticateMiddleware]
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
    preHandler: [authenticateMiddleware]
  }, async (request, reply) => {
    try {
      const status = await getWlan5Status();
      return { status };
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });

  fastify.get('/wifi/wlan24/status', {
    preHandler: [authenticateMiddleware]
  }, async (request, reply) => {
    try {
      const status = await getWlan24Status();
      return { status };
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });
}
