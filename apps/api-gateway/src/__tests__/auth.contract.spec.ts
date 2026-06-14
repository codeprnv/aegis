// Removed broken mock of @aegis/middlewares so the real auth middleware runs.
const JWT_SECRET = 'test-jwt-secret';
// Set env var BEFORE importing the module to fix module-level initializers
process.env.JWT_SECRET = JWT_SECRET;

import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { createTestApp } from '../test-utils/test-app';

describe('API Gateway Auth Contracts', () => {
  const app = createTestApp();

  const createToken = (payload: { id: string; role: 'USER' | 'ADMIN' }) => {
    return jwt.sign({ sub: payload.id, role: payload.role, type: 'access' }, JWT_SECRET, {
      expiresIn: '1h',
      issuer: 'iam-service',
      audience: 'aegis-client'
    });
  };

  describe('GET /me', () => {
    it('returns 401 when no token is provided', async () => {
      await request(app).get('/me').expect(401);
    });

    it('returns 200 for authenticated user', async () => {
      const token = createToken({ id: 'user-1', role: 'USER' });
      const res = await request(app)
        .get('/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body).toEqual({
        id: 'user-1',
        role: 'USER',
      });
    });
  });
  describe('GET /admin', () => {
    it('returns 403 for authenticated non-admin user', async () => {
      const token = createToken({ id: 'user-1', role: 'USER' });

      await request(app)
        .get('/admin')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('returns 200 for admin user', async () => {
      const token = createToken({ id: 'user-1', role: 'ADMIN' });

      await request(app)
        .get('/admin')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });
});
