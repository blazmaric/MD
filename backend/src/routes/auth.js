import { config } from '../config.js';
import { query } from '../db.js';
import { verifyPassword, signToken, authenticateMiddleware } from '../auth.js';

export default async function authRoutes(fastify) {
  fastify.post('/auth/login', async (request, reply) => {
    const { username, password } = request.body;

    if (!username || !password) {
      return reply.code(400).send({ error: 'Username and password required' });
    }

    const result = await query(
      'SELECT id, username, password_hash, permissions, is_active FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return reply.code(401).send({ error: 'Account is disabled' });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    const token = signToken({ userId: user.id });

    reply.setCookie(config.auth.cookieName, token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      maxAge: 12 * 60 * 60,
      path: '/'
    });

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        permissions: user.permissions
      }
    };
  });

  fastify.post('/auth/logout', async (request, reply) => {
    reply.clearCookie(config.auth.cookieName, {
      path: '/'
    });

    return { success: true };
  });

  fastify.get('/auth/me', {
    preHandler: authenticateMiddleware
  }, async (request) => {
    return {
      id: request.user.id,
      username: request.user.username,
      permissions: request.user.permissions
    };
  });
}
