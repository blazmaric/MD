import { authenticateMiddleware, requirePermission } from '../auth.js';
import { getSmsInbox, sendSms, deleteSms } from '../mikrotik.js';

export default async function smsRoutes(fastify) {
  fastify.get('/sms/inbox', {
    preHandler: [authenticateMiddleware, requirePermission('view_sms')]
  }, async () => {
    const messages = await getSmsInbox();
    return { messages };
  });

  fastify.post('/sms/send', {
    preHandler: [authenticateMiddleware, requirePermission('send_sms')]
  }, async (request, reply) => {
    const { phone, message, channel = 0 } = request.body;

    if (!phone || !message) {
      return reply.code(400).send({ error: 'Phone number and message are required' });
    }

    try {
      const result = await sendSms(phone, message, channel);
      return { success: true, result };
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });

  fastify.delete('/sms/:id', {
    preHandler: [authenticateMiddleware, requirePermission('send_sms')]
  }, async (request, reply) => {
    const { id } = request.params;
    try {
      const result = await deleteSms(id);
      return result;
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });
}
