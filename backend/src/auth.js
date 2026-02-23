import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { query } from './db.js';

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function signToken(payload) {
  return jwt.sign(payload, config.auth.jwtSecret, { expiresIn: '12h' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, config.auth.jwtSecret);
  } catch (err) {
    return null;
  }
}

export async function bootstrapAdmin() {
  try {
    const result = await query(
      'SELECT id FROM users WHERE username = $1',
      [config.admin.user]
    );

    if (result.rows.length === 0) {
      const passwordHash = await hashPassword(config.admin.pass);
      await query(
        `INSERT INTO users (username, password_hash, is_admin, is_active)
         VALUES ($1, $2, true, true)`,
        [config.admin.user, passwordHash]
      );
      console.log(`Admin user '${config.admin.user}' created successfully`);
    } else {
      console.log(`Admin user '${config.admin.user}' already exists`);
    }
  } catch (err) {
    console.error('Failed to bootstrap admin user:', err);
    throw err;
  }
}

export async function authenticateMiddleware(request, reply) {
  const token = request.cookies[config.auth.cookieName];

  if (!token) {
    return reply.code(401).send({ error: 'Authentication required' });
  }

  const decoded = verifyToken(token);
  if (!decoded || !decoded.userId) {
    return reply.code(401).send({ error: 'Invalid or expired token' });
  }

  const result = await query(
    'SELECT id, username, is_admin, is_active FROM users WHERE id = $1',
    [decoded.userId]
  );

  if (result.rows.length === 0 || !result.rows[0].is_active) {
    return reply.code(401).send({ error: 'User not found or inactive' });
  }

  request.user = result.rows[0];
}

export function requireAdmin() {
  return async (request, reply) => {
    if (!request.user.is_admin) {
      return reply.code(403).send({
        error: 'Admin privileges required'
      });
    }
  };
}
