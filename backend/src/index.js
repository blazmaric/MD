import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import { config } from './config.js';
import { testConnection } from './db.js';
import { runMigrations } from './migrate.js';
import { bootstrapAdmin } from './auth.js';
import { startPollers, stopPollers } from './poller.js';
import { initWebSocket } from './websocket.js';

import authRoutes from './routes/auth.js';
import summaryRoutes from './routes/summary.js';
import logsRoutes from './routes/logs.js';
import trafficRoutes from './routes/traffic.js';
import pingRoutes from './routes/ping.js';
import usersRoutes from './routes/users.js';
import systemRoutes from './routes/system.js';
import smsRoutes from './routes/sms.js';
import wifiRoutes from './routes/wifi.js';
import interfacesRoutes from './routes/interfaces.js';
import layoutRoutes from './routes/layout.js';
import gpsRoutes from './routes/gps.js';
import dashboardRoutes from './routes/dashboard.js';

const fastify = Fastify({
  logger: {
    level: config.nodeEnv === 'production' ? 'info' : 'debug'
  }
});

fastify.register(fastifyCors, {
  origin: true,
  credentials: true
});

fastify.register(fastifyCookie);

fastify.get('/api/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

fastify.register(authRoutes, { prefix: '/api' });
fastify.register(dashboardRoutes, { prefix: '/api' });
fastify.register(summaryRoutes, { prefix: '/api' });
fastify.register(logsRoutes, { prefix: '/api' });
fastify.register(trafficRoutes, { prefix: '/api' });
fastify.register(pingRoutes, { prefix: '/api' });
fastify.register(usersRoutes, { prefix: '/api' });
fastify.register(systemRoutes, { prefix: '/api' });
fastify.register(smsRoutes, { prefix: '/api' });
fastify.register(wifiRoutes, { prefix: '/api' });
fastify.register(interfacesRoutes, { prefix: '/api' });
fastify.register(layoutRoutes, { prefix: '/api' });
fastify.register(gpsRoutes, { prefix: '/api' });

async function start() {
  try {
    console.log('Starting MikroTik Dashboard Backend...');
    console.log('Environment:', config.nodeEnv);

    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('Database connection failed. Exiting...');
      process.exit(1);
    }

    await runMigrations();
    await bootstrapAdmin();

    await fastify.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`Server listening on port ${config.port}`);

    initWebSocket(fastify.server);

    startPollers();

  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

async function shutdown() {
  console.log('Shutting down gracefully...');
  stopPollers();
  await fastify.close();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();
