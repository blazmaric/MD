import { authenticateMiddleware, requirePermission } from '../auth.js';
import { getGpsStatus } from '../mikrotik.js';

export default async function gpsRoutes(fastify) {
  fastify.get('/gps', {
    preHandler: [authenticateMiddleware, requirePermission('view_gps')]
  }, async (request, reply) => {
    try {
      const gps = await getGpsStatus();

      if (!gps) {
        return {
          valid: false,
          latitude: null,
          longitude: null,
          altitude: null,
          speed: null,
          satellites: null,
          datetime_fix: null
        };
      }

      return {
        valid: gps.valid === 'yes',
        latitude: gps.latitude ? parseFloat(gps.latitude) : null,
        longitude: gps.longitude ? parseFloat(gps.longitude) : null,
        altitude: gps.altitude ? parseFloat(gps.altitude) : null,
        speed: gps.speed ? parseFloat(gps.speed) : null,
        satellites: gps.satellites ? parseInt(gps.satellites, 10) : null,
        datetime_fix: gps['date-time-fix'] || null
      };
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });
}
