import { authenticateMiddleware, requireAdmin, hashPassword } from '../auth.js';
import { query } from '../db.js';

export default async function usersRoutes(fastify) {
  fastify.get('/users', {
    preHandler: [authenticateMiddleware, requireAdmin()]
  }, async () => {
    const result = await query(`
      SELECT id, username, is_admin, is_active, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `);

    return { users: result.rows };
  });

  fastify.post('/users', {
    preHandler: [authenticateMiddleware, requireAdmin()]
  }, async (request, reply) => {
    const { username, password, is_admin = false, is_active = true } = request.body;

    if (!username || !password) {
      return reply.code(400).send({ error: 'Username and password required' });
    }

    if (password.length < 8) {
      return reply.code(400).send({ error: 'Password must be at least 8 characters' });
    }

    const existingUser = await query('SELECT id FROM users WHERE username = $1', [username]);
    if (existingUser.rows.length > 0) {
      return reply.code(400).send({ error: 'Username already exists' });
    }

    const passwordHash = await hashPassword(password);

    const result = await query(`
      INSERT INTO users (username, password_hash, is_admin, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, is_admin, is_active, created_at
    `, [username, passwordHash, is_admin, is_active]);

    return { user: result.rows[0] };
  });

  fastify.patch('/users/:id', {
    preHandler: [authenticateMiddleware, requireAdmin()]
  }, async (request, reply) => {
    const { id } = request.params;
    const { password, is_admin, is_active } = request.body;

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (password !== undefined) {
      if (password.length < 8) {
        return reply.code(400).send({ error: 'Password must be at least 8 characters' });
      }
      const passwordHash = await hashPassword(password);
      updates.push(`password_hash = $${paramIndex}`);
      params.push(passwordHash);
      paramIndex++;
    }

    if (is_admin !== undefined) {
      updates.push(`is_admin = $${paramIndex}`);
      params.push(is_admin);
      paramIndex++;
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      params.push(is_active);
      paramIndex++;
    }

    if (updates.length === 0) {
      return reply.code(400).send({ error: 'No updates provided' });
    }

    params.push(id);
    const result = await query(`
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, username, is_admin, is_active, updated_at
    `, params);

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'User not found' });
    }

    return { user: result.rows[0] };
  });

  fastify.delete('/users/:id', {
    preHandler: [authenticateMiddleware, requireAdmin()]
  }, async (request, reply) => {
    const { id } = request.params;
    const { permanent = false } = request.query;

    if (permanent === 'true') {
      const result = await query(
        'DELETE FROM users WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'User not found' });
      }

      return { success: true, message: 'User permanently deleted' };
    } else {
      const result = await query(
        'UPDATE users SET is_active = false WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'User not found' });
      }

      return { success: true, message: 'User disabled' };
    }
  });
}
